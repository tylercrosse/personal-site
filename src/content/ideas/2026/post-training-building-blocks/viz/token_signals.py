"""Per-token learning signals for the post-training figure (TokenSignals.jsx).

One word problem, a small student model and a larger teacher from the same
family (so they share a tokenizer). The script:

  1. samples N responses from the student and grades each by its final number;
  2. picks one wrong response (the shortest, unless --pick is given);
  3. has the teacher write a greedy demonstration;
  4. scores, token by token:
       - SFT:  the student's surprise at each token of the teacher's demonstration
               (-log p_student);
       - RL:   one outcome reward for the student's response, turned into a
               group-relative advantage against the other N-1 samples (GRPO style),
               which every token shares;
       - OPD:  log p_teacher - log p_student on each token of the student's own
               response, both models conditioned on the same prefix;
       - Entropy of the student's next-token distribution at each position.

The teacher scores word choice as well as reasoning, so the most negative OPD
tokens are a mix of phrasing ("There were" where it would write "The farmer
has") and the actual mistake. A 3B teacher gives the same mix at smaller
magnitudes; the 7B's own preferred tokens at the mistake ("-" for "/", "sold"
for "left") make it easier to read, so it is the default.

Nothing is hand-edited: the JSON it writes is what the component renders.

Run outside the repo with a throwaway venv, for example:

    uv venv /tmp/ts-venv && VIRTUAL_ENV=/tmp/ts-venv uv pip install torch transformers
    /tmp/ts-venv/bin/python token_signals.py

Weights go to the Hugging Face cache, not the repo. Sampling on MPS is not
bit-for-bit reproducible across machines, so every sample is saved in the JSON.
"""

import argparse
import json
import math
import re
from datetime import date
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[4] / "components" / "ideas" / "post-training" / "token-signals.json"

STUDENT = "Qwen/Qwen2.5-0.5B-Instruct"
TEACHER = "Qwen/Qwen2.5-7B-Instruct"  # run in bfloat16 (about 15 GB)

# A one-shot example in the system prompt keeps the 0.5B model terse and out
# of LaTeX, so a whole response fits in the figure.
SYSTEM = (
    "Solve the problem in plain text, with no LaTeX and no markdown. Keep it short, like this example.\n"
    "Problem: Ann has 4 bags of 5 apples and eats 3. How many are left?\n"
    "Solution: 4 bags of 5 apples is 4 * 5 = 20 apples. She eats 3, so 20 - 3 = 17.\n"
    "Answer: 17"
)
QUESTION = (
    "A farmer has 3 fields with 14 cows each. He sells 1/3 of all the cows "
    "and then buys 5 more. How many cows does he have now?"
)
GOLD = 33
# Where the shown answer goes wrong, marked in the figure if the picked sample
# contains it: 14 is the number of cows sold, not the number left.
MISTAKE = "42 / 3 = 14 cows left"

SAMPLING = dict(do_sample=True, temperature=0.7, top_p=0.8, top_k=20, max_new_tokens=100)
N_SAMPLES = 16
SEED = 0


def final_number(text):
    nums = re.findall(r"-?\d+(?:\.\d+)?", text.replace(",", ""))
    return float(nums[-1]) if nums else None


def prompt_ids(tok):
    msgs = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": QUESTION}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    return tok(text, return_tensors="pt").input_ids


@torch.no_grad()
def score(model, prompt, response):
    """Per-position log-prob of each response token, the full next-token
    log-distribution at those positions, under `model`."""
    ids = torch.cat([prompt, response]).unsqueeze(0).to(model.device)
    logits = model(ids).logits[0, prompt.numel() - 1 : -1].float()
    logp = torch.log_softmax(logits, dim=-1)
    tok_logp = logp.gather(1, response.to(model.device).unsqueeze(1)).squeeze(1)
    return tok_logp.cpu(), logp.cpu()


def entropy_bits(logp):
    return (-(logp.exp() * logp).sum(-1) / math.log(2)).tolist()


def piece(tok, i):
    return tok.decode([int(i)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pick", type=int, default=None, help="index of the student sample to show")
    ap.add_argument("--teacher", default=TEACHER)
    ap.add_argument("--teacher-dtype", default="bfloat16", choices=["float32", "bfloat16"])
    ap.add_argument("--dry-run", action="store_true", help="print the tables but don't write the JSON")
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    args = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(STUDENT)
    teacher_id = args.teacher
    assert AutoTokenizer.from_pretrained(teacher_id).get_vocab() == tok.get_vocab(), "tokenizers differ"
    student = AutoModelForCausalLM.from_pretrained(STUDENT, dtype=torch.float32).to(args.device).eval()
    teacher = AutoModelForCausalLM.from_pretrained(teacher_id, dtype=getattr(torch, args.teacher_dtype)).to(args.device).eval()

    prompt = prompt_ids(tok)[0]
    n_prompt = prompt.numel()

    # 1. Student samples, graded by final number.
    torch.manual_seed(SEED)
    out = student.generate(
        prompt.unsqueeze(0).to(args.device),
        num_return_sequences=N_SAMPLES,
        pad_token_id=tok.pad_token_id,
        **SAMPLING,
    )
    samples = []
    for row in out:
        resp = row[n_prompt:].cpu()
        resp = resp[(resp != tok.pad_token_id)]
        if resp.numel() and resp[-1] == tok.convert_tokens_to_ids("<|im_end|>"):
            resp = resp[:-1]
        text = tok.decode(resp)
        ans = final_number(text)
        samples.append(dict(ids=resp, text=text, answer=ans, correct=ans == GOLD, n_tokens=int(resp.numel())))

    rewards = torch.tensor([1.0 if s["correct"] else 0.0 for s in samples])
    mean, std = rewards.mean().item(), rewards.std(unbiased=False).item()

    wrong = [i for i, s in enumerate(samples) if not s["correct"]]
    if args.pick is None:
        pick = min(wrong, key=lambda i: samples[i]["n_tokens"])
    else:
        pick = args.pick
    chosen = samples[pick]
    assert not chosen["correct"], "picked a correct sample"
    advantage = (rewards[pick].item() - mean) / (std + 1e-6)

    # 2. Teacher demonstration (greedy).
    t_out = teacher.generate(
        prompt.unsqueeze(0).to(args.device), do_sample=False, max_new_tokens=120, pad_token_id=tok.pad_token_id
    )
    demo = t_out[0, n_prompt:].cpu()
    demo = demo[(demo != tok.pad_token_id) & (demo != tok.convert_tokens_to_ids("<|im_end|>"))]
    demo_text = tok.decode(demo)

    # 3. Scores.
    # SFT: the student's surprise at each token of the teacher's demonstration.
    s_demo_lp, s_demo_dist = score(student, prompt, demo)
    s_demo_top = s_demo_dist.argmax(-1)

    # On the student's own response: student and teacher log-probs, entropy.
    ids = chosen["ids"]
    s_lp, s_dist = score(student, prompt, ids)
    t_lp, t_dist = score(teacher, prompt, ids)
    ent = entropy_bits(s_dist)
    t_top = t_dist.argmax(-1)

    demo_tokens = [
        dict(
            t=piece(tok, i),
            p=round(math.exp(lp), 4),
            surprise=round(-lp, 3),
            studentTop=piece(tok, top),
        )
        for i, lp, top in zip(demo.tolist(), s_demo_lp.tolist(), s_demo_top.tolist())
    ]
    own_tokens = [
        dict(
            t=piece(tok, i),
            pStudent=round(math.exp(slp), 4),
            pTeacher=round(math.exp(tlp), 4),
            opd=round(tlp - slp, 3),
            entropy=round(h, 3),
            teacherTop=piece(tok, top),
        )
        for i, slp, tlp, h, top in zip(ids.tolist(), s_lp.tolist(), t_lp.tolist(), ent, t_top.tolist())
    ]

    # Token range covering MISTAKE, from cumulative decoded lengths.
    starts, pos = [], 0
    for d in own_tokens:
        starts.append(pos)
        pos += len(d["t"])
    at = "".join(d["t"] for d in own_tokens).find(MISTAKE)
    mistake = None
    if at >= 0:
        end = at + len(MISTAKE)
        idx = [i for i, st in enumerate(starts) if st < end and st + len(own_tokens[i]["t"]) > at]
        mistake = dict(text=MISTAKE, start=idx[0], end=idx[-1] + 1)

    data = dict(
        meta=dict(
            generated=str(date.today()),
            script="src/content/ideas/2026/post-training-building-blocks/viz/token_signals.py",
            student=STUDENT,
            teacher=teacher_id,
            teacherDtype=args.teacher_dtype,
            system=SYSTEM,
            device=args.device,
            dtype="float32 (student)",
            seed=SEED,
            sampling={k: v for k, v in SAMPLING.items() if k != "do_sample"},
            nSamples=N_SAMPLES,
            pick=pick,
            pickRule="shortest wrong sample" if args.pick is None else "--pick",
            units=dict(surprise="nats", opd="nats", entropy="bits"),
            samples=[
                dict(text=s["text"], answer=s["answer"], correct=s["correct"], nTokens=s["n_tokens"]) for s in samples
            ],
        ),
        question=QUESTION,
        gold=GOLD,
        demo=dict(text=demo_text, answer=final_number(demo_text), tokens=demo_tokens),
        student=dict(text=chosen["text"], answer=chosen["answer"], mistake=mistake, tokens=own_tokens),
        rl=dict(
            reward=float(rewards[pick].item()),
            nCorrect=int(rewards.sum().item()),
            nSamples=N_SAMPLES,
            groupMean=round(mean, 4),
            groupStd=round(std, 4),
            advantage=round(advantage, 3),
        ),
    )

    print(f"{data['rl']['nCorrect']}/{N_SAMPLES} correct; picked #{pick}: {chosen['text']!r}")
    print(f"advantage {advantage:.3f}")
    print("demo:", repr(demo_text))
    print(f"\n{'token':>14} {'pS':>6} {'pT':>6} {'opd':>7} {'H':>5}  teacher-top")
    for d in own_tokens:
        print(f"{d['t']!r:>14} {d['pStudent']:6.3f} {d['pTeacher']:6.3f} {d['opd']:7.2f} {d['entropy']:5.2f}  {d['teacherTop']!r}")
    print(f"\n{'demo token':>14} {'pS':>6} {'surp':>6}")
    for d in demo_tokens:
        print(f"{d['t']!r:>14} {d['p']:6.3f} {d['surprise']:6.2f}  {d['studentTop']!r}")
    if not args.dry_run:
        OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
        print("wrote", OUT)


if __name__ == "__main__":
    main()
