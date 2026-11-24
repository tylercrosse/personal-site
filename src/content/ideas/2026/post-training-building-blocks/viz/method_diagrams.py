"""Method diagrams for the post-training post, one figure per learning signal.

Writes five SVGs into ../figures/, styled to match pipeline-2026.svg:

  method-key.svg             the visual vocabulary, shown once
  method-demonstrations.svg  SFT, rejection sampling
  method-preferences.svg     DPO, reward-model training
  method-rewards.svg         RL with swappable scorer and baseline
  method-distillation.svg    offline and on-policy distillation

Every part of a diagram is one of four kinds, and each kind has one look:

  weights      network glyph; bright and filled = trained, hollow and dim = frozen
  text         ruled card; a stack of cards = stored dataset, one card = generated
  numbers      small chips with values; blue = made more likely, orange = less
               (the token widget's colors)
  computation  plain box, no glyph: math with no weights in it

Arrows: solid = forward flow, dashed = gradient (always lands on trained
weights), dim dashed = optional. A dashed group holds a batch or a slot of
alternatives ("pick one").

Run: python viz/method_diagrams.py   (from anywhere)
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "figures"

W = 2000
BG = "#0f1115"
FG = "#e8e8e8"
DIM = "#6b7079"
MID = "#8c919a"
BLUE = "#2aa1f1"  # vizTheme TOKENS.blue
ORANGE = "#d99032"  # vizTheme TOKENS.orange

STYLE = f"""
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="{FG}"/>
    </marker>
    <marker id="arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#9a9fa7"/>
    </marker>
    <style>
      .bg {{ fill: {BG}; }}
      .box {{ fill: {BG}; stroke: {FG}; stroke-width: 2.5; }}
      .trained {{ fill: #161a22; stroke: {FG}; stroke-width: 4.5; }}
      .frozen {{ fill: #14161b; stroke: {MID}; stroke-width: 2.5; }}
      .data {{ fill: {BG}; stroke: #b8bcc3; stroke-width: 2; }}
      .data-back {{ fill: {BG}; stroke: #4a4f57; stroke-width: 2; }}
      .dash {{ stroke-dasharray: 12 8; }}
      .group {{ fill: none; stroke: {DIM}; stroke-width: 2; stroke-dasharray: 6 8; }}
      .inner {{ fill: none; stroke: #4a4f57; stroke-width: 2; }}
      .rule {{ stroke: #2a2e35; stroke-width: 2; }}
      .rl {{ stroke: {MID}; stroke-width: 3; stroke-linecap: round; }}
      .line {{ fill: none; stroke: {FG}; stroke-width: 2.5; }}
      .line-dash {{ fill: none; stroke: {FG}; stroke-width: 2.5; stroke-dasharray: 12 8; }}
      .line-dim {{ fill: none; stroke: #9a9fa7; stroke-width: 2; stroke-dasharray: 6 6; }}
      .title {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 29px; fill: #f2f2f2; text-anchor: middle; }}
      .sub {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 22px; fill: #a3a8b0; text-anchor: middle; }}
      .item {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 22px; fill: #d4d6da; }}
      .ftitle {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 34px; fill: #f2f2f2; }}
      .desc {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 23px; fill: #a3a8b0; }}
      .num {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 20px; fill: #e8e8e8; text-anchor: middle; }}
      .lab {{ font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 21px; fill: #d4d6da; }}
      .mono {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 18px; letter-spacing: 3.5px; fill: {MID}; }}
      .head {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 21px; letter-spacing: 4px; fill: #d4d6da; }}
      .tag {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 14px; letter-spacing: 3px; fill: {MID}; text-anchor: middle; }}
      .tag-on {{ fill: {FG}; }}
      .code {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 22px; font-weight: 700; fill: {MID}; text-anchor: middle; }}
      .note {{ font-family: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace; font-size: 18px; fill: {MID}; }}
    </style>"""


def sub_(s):
    """Subscript markup for text content."""
    return f'<tspan baseline-shift="sub" font-size="0.7em">{s}</tspan>'


THETA = f"π{sub_('θ')}"


def mix(hex_color, strength):
    """Blend a color into the background; strength in [0, 1]."""
    a = [int(hex_color[i : i + 2], 16) for i in (1, 3, 5)]
    b = [int(BG[i : i + 2], 16) for i in (1, 3, 5)]
    s = max(0.0, min(1.0, strength))
    return "#" + "".join(f"{round(bb + (aa - bb) * s):02x}" for aa, bb in zip(a, b))


def signed(v, full=1.0):
    """Chip fill for a signed value: blue up, orange down."""
    return mix(BLUE if v >= 0 else ORANGE, 0.25 + 0.75 * min(1.0, abs(v) / full))


class Fig:
    def __init__(self, height, title):
        self.h = height
        self.title = title
        self.parts = []

    def add(self, s):
        self.parts.append(s)

    def text(self, x, y, s, cls="note", anchor="start"):
        self.add(f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}">{s}</text>')

    # --- glyphs: one per kind of part ----------------------------------------

    def net(self, cx, cy, s=1.0, trained=True):
        """Weights: a 3-4-3 network."""
        # fewer nodes at small sizes so the edges don't smear into a blob
        layers = [3, 4, 3] if s >= 1 else [2, 3, 2]
        dx, dy, r = (25 * s, 15 * s, 4.2 * s) if s >= 1 else (30 * s, 22 * s, 5.5 * s)
        pos = [[(cx + (i - 1) * dx, cy + (j - (n - 1) / 2) * dy) for j in range(n)] for i, n in enumerate(layers)]
        edge = "#6b7079" if trained else "#3d4249"
        for a, b in zip(pos, pos[1:]):
            for (x1, y1) in a:
                for (x2, y2) in b:
                    self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{edge}" stroke-width="{max(1.0, 1.1 * s):.2f}"/>')
        fill, stroke = (FG, FG) if trained else (BG, MID)
        for layer in pos:
            for (x, y) in layer:
                self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{1.6 * s:.2f}"/>')

    def card(self, x, y, w=42, h=52, lines=3, edge="#b8bcc3", top=None):
        """Text: a ruled card. `top` adds a colored strip (chosen/rejected)."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{BG}" stroke="{edge}" stroke-width="2"/>')
        if top:
            self.add(f'<rect x="{x + 2}" y="{y + 2}" width="{w - 4}" height="7" rx="2" fill="{top}"/>')
        lens = [0.72, 0.55, 0.66, 0.45]
        y0 = y + (14 if top else 0)
        for k in range(lines):
            ly = y0 + (h - (y0 - y)) * (k + 1) / (lines + 1)
            self.add(f'<line class="rl" x1="{x + 9}" y1="{ly:.1f}" x2="{x + 9 + (w - 18) * lens[k]:.1f}" y2="{ly:.1f}"/>')

    def chip(self, x, y, w, h, label, fill=BG, edge=MID):
        """Numbers: a chip with a value."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{edge}" stroke-width="2"/>')
        if label:
            self.text(x + w / 2, y + h / 2 + 7, label, "num", "middle")

    def code(self, cx, cy):
        """A program (verifier): braces, no weights."""
        self.text(cx, cy + 8, "{ }", "code", "middle")

    # --- boxes ---------------------------------------------------------------

    def _label(self, x0, x1, y, h, title, sub, tag=None, tag_on=False):
        cx = (x0 + x1) / 2
        if tag:
            on = " tag-on" if tag_on else ""
            self.add(f'<text class="tag{on}" x="{cx}" y="{y + 28}">{tag}</text>')
            top = y + 34
        else:
            top = y
        mid = top + (y + h - top) / 2
        if sub:
            self.text(cx, mid - 6, title, "title", "middle")
            self.text(cx, mid + 28, sub, "sub", "middle")
        else:
            self.text(cx, mid + 10, title, "title", "middle")

    def model(self, x, y, w, h, title, sub=None, trained=True, dash=False):
        cls = ("trained" if trained else "frozen") + (" dash" if dash else "")
        self.add(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>')
        self.net(x + 56, y + h / 2, 1.3, trained)
        self._label(x + 100, x + w - 12, y, h, title, sub, "TRAINED" if trained else "FROZEN", trained)

    def data(self, x, y, w, h, title, sub=None, glyph="card", stacked=True):
        """Text box. stacked=True: a stored dataset; False: freshly generated."""
        if stacked:
            for off in (14, 7):
                self.add(f'<rect class="data-back" x="{x + off}" y="{y - off}" width="{w}" height="{h}" rx="6"/>')
        self.add(f'<rect class="data" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>')
        gy = y + h / 2
        if glyph == "pair":
            self.card(x + 18, gy - 30, 34, 44, 2, top=BLUE)
            self.card(x + 42, gy - 14, 34, 44, 2, top=ORANGE)
            x_text = x + 88
        else:
            self.card(x + 24, gy - 26, 42, 52, 3)
            x_text = x + 80
        self._label(x_text, x + w - 12, y, h, title, sub)

    def op(self, x, y, w, h, title, sub=None, dash=False):
        """Computation: plain box, no glyph."""
        extra = " dash" if dash else ""
        self.add(f'<rect class="box{extra}" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>')
        self._label(x, x + w, y, h, title, sub)

    # --- collections ---------------------------------------------------------

    def group(self, x, y, w, h, label=None, label_y=None):
        self.add(f'<rect class="group" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>')
        if label:
            self.text(x + w / 2, label_y if label_y else y - 14, label, "mono", "middle")

    def text_stack(self, x, y_center, w, labels, h=44, gap=12, group_label=None):
        """Generated text: a batch of single cards (rollouts, samples)."""
        n = len(labels)
        total = n * h + (n - 1) * gap
        top = y_center - total / 2
        self.group(x - 14, top - 14, w + 28, total + 28, group_label)
        for i, lab in enumerate(labels):
            yy = top + i * (h + gap)
            self.add(f'<rect x="{x}" y="{yy}" width="{w}" height="{h}" rx="4" fill="{BG}" stroke="#b8bcc3" stroke-width="2"/>')
            self.text(x + 14, yy + h / 2 + 7, lab, "lab")
            for k, frac in enumerate((0.9, 0.6)):
                ly = yy + h * (k + 1) / 3
                x0 = x + 50
                self.add(f'<line class="rl" x1="{x0}" y1="{ly:.1f}" x2="{x0 + (w - 62) * frac:.1f}" y2="{ly:.1f}"/>')
        return top - 14, top + total + 14

    def chip_stack(self, x, y_center, w, labels, fills=None, h=44, gap=12, group_label=None):
        """Numbers: one chip per rollout."""
        n = len(labels)
        total = n * h + (n - 1) * gap
        top = y_center - total / 2
        self.group(x - 14, top - 14, w + 28, total + 28, group_label)
        for i, lab in enumerate(labels):
            self.chip(x, top + i * (h + gap), w, h, lab, fills[i] if fills else BG)
        return top - 14, top + total + 14

    def token_strip(self, x, y, values, cell=30, gap=6, label="SIGNAL", caption=None):
        """Per-token signal: one chip per token."""
        self.text(x, y - 14, label, "mono")
        for i, v in enumerate(values):
            self.add(
                f'<rect x="{x + i * (cell + gap)}" y="{y}" width="{cell}" height="{cell}" rx="6" fill="{signed(v)}" stroke="#3a3f47" stroke-width="1.5"/>'
            )
        if caption:
            self.text(x, y + cell + 30, caption, "note")

    def response_bar(self, x, y, w, value, label, h=32):
        """Per-response signal: one chip for the whole response."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{signed(value)}" stroke="#3a3f47" stroke-width="1.5"/>')
        self.text(x + w / 2, y + h / 2 + 7, label, "num", "middle")

    # --- arrows and layout ---------------------------------------------------

    def arrow(self, pts, cls="line", label=None, label_at=None, anchor="middle"):
        d = "M" + " L".join(f"{x},{y}" for x, y in pts)
        marker = "arrow-dim" if cls == "line-dim" else "arrow"
        self.add(f'<path class="{cls}" d="{d}" marker-end="url(#{marker})"/>')
        if label:
            lx, ly = label_at
            self.text(lx, ly, label, "mono", anchor)

    def gradient(self, x_from, y_from, x_to, y_to, y_top, label_x=None):
        """Dashed gradient arrow: up from the loss, across, down into the trained weights."""
        self.arrow([(x_from, y_from), (x_from, y_top), (x_to, y_top), (x_to, y_to - 4)], cls="line-dash")
        lx = label_x if label_x is not None else (x_from + x_to) / 2
        self.text(lx, y_top - 12, "gradient", "mono", "middle")

    def panel_head(self, y, head, desc):
        self.text(60, y, head, "head")
        self.text(60, y + 40, desc, "desc")

    def rule(self, y):
        self.add(f'<line class="rule" x1="60" y1="{y}" x2="{W - 60}" y2="{y}"/>')

    # --- comparison layout: family title, aligned columns, row labels ----------

    def fig_head(self, title, desc):
        """Family title plus the one line that says how the rows relate."""
        self.text(60, 66, title, "ftitle")
        self.text(60, 108, desc, "desc")

    def col_header(self, x0, x1, label, y=182):
        """Column label with a bracket, so matching parts line up across rows."""
        self.text((x0 + x1) / 2, y, label, "mono", "middle")
        self.add(f'<path d="M{x0},{y + 22} L{x0},{y + 13} L{x1},{y + 13} L{x1},{y + 22}" fill="none" stroke="#4a4f57" stroke-width="2"/>')

    def band(self, x0, x1, y0, y1):
        """Shaded column: the part the rows share, or the part they swap."""
        self.add(f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="10" fill="#161921"/>')

    def row_label(self, y, head, desc, x=60):
        self.text(x, y, head, "head")
        self.text(x, y + 32, desc, "desc")

    def svg(self):
        body = "\n  ".join(self.parts)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {self.h}" width="{W}" height="{self.h}" role="img" aria-labelledby="title">
  <title id="title">{self.title}</title>
  <defs>{STYLE}
  </defs>

  <rect class="bg" x="0" y="0" width="{W}" height="{self.h}"/>

  {body}
</svg>
"""

    def write(self, name):
        (OUT / name).write_text(self.svg())
        print("wrote", OUT / name)


# Example per-token values, shaped like the token widget's real numbers:
# SFT pushes every target token up, harder where the student was surprised.
SFT_TOKENS = [0.35, 0.15, 0.6, 0.2, 0.1, 0.85, 0.3, 0.15, 0.5, 0.2]
# On-policy distillation: mostly mild, strongly negative at the mistake.
OPD_TOKENS = [0.2, -0.45, 0.1, 0.25, 0.05, -0.95, 0.15, -0.7, 0.1, 0.2]


# --- Key -----------------------------------------------------------------------


def key():
    f = Fig(330, "Key to the method diagrams")
    f.text(60, 60, "KEY", "head")

    # Row 1: the four kinds of part
    y = 150
    f.net(110, y, 1.3, True)
    f.text(160, y - 4, "Trained weights", "item")
    f.text(160, y + 24, "the update changes these", "note")

    f.net(520, y, 1.3, False)
    f.text(570, y - 4, "Frozen weights", "item")
    f.text(570, y + 24, "used, never updated", "note")

    for off in (14, 7):
        f.add(f'<rect class="data-back" x="{900 + off}" y="{y - 30 - off}" width="48" height="60" rx="4"/>')
    f.card(900, y - 30, 48, 60, 3)
    f.text(980, y - 4, "Stored text", "item")
    f.text(980, y + 24, "a fixed dataset", "note")

    f.card(1260, y - 30, 48, 60, 3)
    f.text(1330, y - 4, "Generated text", "item")
    f.text(1330, y + 24, "written during training", "note")

    f.chip(1650, y - 22, 64, 44, "0.7")
    f.text(1730, y - 4, "Numbers", "item")
    f.text(1730, y + 24, "scores, log-probs", "note")

    # Row 2: computation, signal colors, arrows
    y = 260
    f.add(f'<rect class="box" x="60" y="{y - 26}" width="96" height="52" rx="6"/>')
    f.text(176, y + 7, "Computation, no weights", "item")

    f.add(f'<rect x="520" y="{y - 16}" width="32" height="32" rx="6" fill="{signed(0.8)}"/>')
    f.add(f'<rect x="558" y="{y - 16}" width="32" height="32" rx="6" fill="{signed(-0.8)}"/>')
    f.text(606, y + 7, "made more / less likely", "item")

    f.arrow([(900, y), (990, y)])
    f.text(1004, y + 7, "data", "item")
    f.arrow([(1110, y), (1200, y)], cls="line-dash")
    f.text(1214, y + 7, "gradient", "item")
    f.arrow([(1360, y), (1450, y)], cls="line-dim")
    f.text(1464, y + 7, "optional", "item")
    f.group(1650, y - 26, 64, 52)
    f.text(1730, y + 7, "batch, or pick one", "item")
    f.write("method-key.svg")


# --- Demonstrations ------------------------------------------------------------


def demonstrations():
    f = Fig(1010, "Demonstrations: supervised fine-tuning and rejection sampling")
    f.fig_head("Demonstrations: “respond like this.”",
               "Both rows end in the same training step. They differ in where the target text comes from.")
    f.band(1320, 1960, 150, 990)
    f.col_header(60, 1290, "WHERE THE TARGET TEXT COMES FROM")
    f.col_header(1340, 1940, "SAME TRAINING STEP")

    # Row 1: SFT is handed the target text
    f.row_label(260, "SFT", "handed the target text")
    row = 380
    f.text(930, row - 4, "written by people or a", "note", "end")
    f.text(930, row + 22, "stronger model, ahead of time", "note", "end")
    f.data(960, row - 65, 330, 130, "Demonstrations", "prompt + target")
    f.arrow([(1290, row), (1336, row)])
    f.model(1340, row - 65, 260, 130, "Policy", THETA)
    f.arrow([(1600, row), (1646, row)])
    f.op(1650, row - 65, 290, 130, "Next-token loss", f"−Σ log π{sub_('θ')}(y*{sub_('t')})")
    f.gradient(1795, row - 65, 1470, row - 65, row - 100)
    f.token_strip(1650, row + 105, SFT_TOKENS[:8])

    # Row 2: rejection sampling makes it from the model's own samples
    f.row_label(590, "REJECTION SAMPLING", "makes it from the model's own samples")
    row = 780
    f.data(60, row - 65, 210, 130, "Prompts", "x")
    f.arrow([(270, row), (306, row)])
    f.model(310, row - 65, 250, 130, "Policy", f"same π{sub_('θ')}")
    f.arrow([(560, row), (592, row)])
    _, bot = f.text_stack(610, row, 100, ["y₁", "y₂", "y₃", "y₄"], group_label="K samples")
    f.arrow([(724, row - 60), (766, row - 60)])
    f.model(770, row - 130, 270, 130, "Grader", "judge or tests", trained=False)
    f.arrow([(1040, row - 30), (1096, row - 30)])
    f.chip(1048, row - 74, 44, 30, "0.8")
    f.op(1100, row - 65, 190, 130, "Keep best", "top-n of K")
    f.arrow([(660, bot), (660, row + 140), (1195, row + 140), (1195, row + 69)], label="the samples themselves", label_at=(928, row + 126))
    f.text(770, row + 36, "Scores pick the data;", "note")
    f.text(770, row + 62, "they never enter the loss.", "note")
    f.arrow([(1290, row), (1336, row)])
    f.model(1340, row - 65, 260, 130, "Policy", THETA)
    f.arrow([(1600, row), (1646, row)])
    f.op(1650, row - 65, 290, 130, "Next-token loss", "on the keepers")
    f.gradient(1795, row - 65, 1470, row - 65, row - 100)
    f.token_strip(1650, row + 105, [0.3, 0.15, 0.55, 0.2, 0.1, 0.4, 0.25, 0.15])
    # it's one model: the next round samples from the updated weights
    f.arrow([(1470, row + 65), (1470, row + 190), (435, row + 190), (435, row + 69)], cls="line-dim",
            label="next round samples from the updated model", label_at=(950, row + 178))
    f.write("method-demonstrations.svg")


# --- Preferences ---------------------------------------------------------------


def preferences():
    f = Fig(970, "Preferences: direct preference optimization and reward-model training")
    f.fig_head("Preferences: \u201cthis one, not that one.\u201d",
               "The same kind of comparison data, used one of two ways: train the policy on it directly, or train a scorer for RL.")
    f.band(40, 460, 150, 950)
    f.col_header(60, 440, "SAME KIND OF DATA")
    f.col_header(520, 880, "WHAT GETS TRAINED")
    f.col_header(980, 1400, "LOSS")

    # Row 1: DPO. Both models read the same pairs.
    f.row_label(250, "DPO", "train the policy directly")
    f.data(60, 340, 380, 150, "Preference pairs", "prompt, chosen, rejected", glyph="pair")
    f.add('<path class="line" d="M440,415 L480,415"/>')
    f.arrow([(480, 415), (480, 330), (516, 330)])
    f.arrow([(480, 415), (480, 470), (516, 470)])
    f.model(520, 270, 360, 120, "Policy", THETA)
    f.model(520, 410, 360, 120, "Reference", "starting copy", trained=False)
    f.arrow([(880, 330), (930, 330), (930, 385), (976, 385)])
    f.arrow([(880, 470), (930, 470), (930, 415), (976, 415)])
    f.op(980, 335, 420, 130, "DPO loss", "chosen up, rejected down")
    f.gradient(1190, 335, 700, 270, 236)
    f.text(980, 503, f"\u2212log \u03c3(\u03b2[\u0394{sub_('chosen')} \u2212 \u0394{sub_('rejected')}])", "note")
    f.text(980, 531, f"\u0394 = log \u03c0{sub_('\u03b8')}(y) \u2212 log \u03c0{sub_('ref')}(y)", "note")
    f.text(1480, 344, "SIGNAL", "mono")
    f.response_bar(1480, 358, 420, 0.85, "chosen \u2191")
    f.response_bar(1480, 402, 420, -0.85, "rejected \u2193")
    f.text(1480, 462, "one push per response", "note")
    f.text(1480, 510, "KTO: single responses marked", "note")
    f.text(1480, 536, "good or bad, no pairs.", "note")

    # Row 2: reward model, the first of RLHF's two steps
    f.row_label(630, "REWARD MODEL", "RLHF step 1: train a scorer")
    row = 780
    f.data(60, row - 75, 380, 150, "Preference pairs", "prompt, chosen, rejected", glyph="pair")
    f.arrow([(440, row), (516, row)])
    f.model(520, row - 65, 360, 130, "Reward model", "text \u2192 one score")
    f.arrow([(880, row), (976, row)])
    f.chip(904, row - 48, 54, 32, "1.3")
    f.chip(904, row + 16, 54, 32, "\u2212.4")
    f.op(980, row - 65, 420, 130, "Pairwise loss", "score chosen higher")
    f.gradient(1190, row - 65, 700, row - 65, row - 110)
    f.text(980, row + 100, f"\u2212log \u03c3(r{sub_('chosen')} \u2212 r{sub_('rejected')})   (Bradley\u2013Terry)", "note")
    f.arrow([(700, row + 65), (700, row + 150), (1690, row + 150), (1690, row + 69)], cls="line-dim",
            label="then frozen for step 2", label_at=(1195, row + 136))
    f.model(1480, row - 65, 420, 130, "Reward model", "the RL scorer", trained=False, dash=True)
    f.write("method-preferences.svg")


# --- Scalar rewards ------------------------------------------------------------


def rewards():
    f = Fig(880, "Scalar rewards: a policy-gradient loop with swappable scorer and baseline")
    f.fig_head("Scalar rewards: \u201cthat attempt scored 0.7.\u201d",
               "One loop with two slots. The scorer gives RLHF, RLAIF or RLVR; the baseline gives PPO, GRPO or RLOO.")

    row = 360
    f.data(60, row - 65, 230, 130, "Prompts", "x")
    f.arrow([(290, row), (336, row)])
    f.model(340, row - 65, 260, 130, "Policy", THETA)
    f.arrow([(600, row), (656, row)], label="G", label_at=(628, row - 14))
    _, rbot = f.text_stack(674, row, 120, ["y₁", "y₂", "y₃", "y₄"], group_label="rollouts")

    # Scorer slot: each option shows what it's made of
    f.arrow([(808, row), (856, row)])
    sx, sy, sw, sh = 860, row - 140, 350, 280
    f.group(sx, sy, sw, sh, "pick one", label_y=sy + sh + 36)
    f.text(sx + sw / 2, sy + 50, "Scorer", "title", "middle")
    for i, (name, tag, kind) in enumerate([("Reward model", "RLHF", "net"), ("LLM judge", "RLAIF", "net"), ("Verifier", "RLVR", "code")]):
        iy = sy + 78 + i * 64
        f.add(f'<rect class="frozen" x="{sx + 16}" y="{iy}" width="{sw - 32}" height="54" rx="5"/>' if kind == "net" else f'<rect class="box" x="{sx + 16}" y="{iy}" width="{sw - 32}" height="54" rx="5" style="stroke:#6b7079;stroke-width:2"/>')
        if kind == "net":
            f.net(sx + 52, iy + 27, 0.68, trained=False)
        else:
            f.code(sx + 52, iy + 27)
        f.text(sx + 88, iy + 35, name, "item")
        f.text(sx + sw - 32, iy + 34, tag, "note", "end")

    f.arrow([(1210, row), (1276, row)])
    f.chip_stack(1294, row, 90, ["0.9", "0.2", "0.7", "0.0"], group_label="r")

    # Baseline slot
    f.arrow([(1398, row), (1456, row)])
    bx, by, bw, bh = 1460, row - 140, 320, 280
    f.group(bx, by, bw, bh, "pick one", label_y=by + bh + 36)
    f.text(bx + bw / 2, by + 50, "Baseline", "title", "middle")
    f.text(bx + bw / 2, by + 82, "A = r − b", "sub", "middle")
    f.add(f'<rect class="trained" x="{bx + 16}" y="{by + 102}" width="{bw - 32}" height="76" rx="5" style="stroke-width:3"/>')
    f.net(bx + 52, by + 140, 0.68, trained=True)
    f.text(bx + 88, by + 134, "Learned critic", "item")
    f.text(bx + 88, by + 160, "trained too", "note")
    f.text(bx + bw - 32, by + 134, "PPO", "note", "end")
    f.add(f'<rect class="box" x="{bx + 16}" y="{by + 190}" width="{bw - 32}" height="76" rx="5" style="stroke:#6b7079;stroke-width:2"/>')
    for k in range(3):
        f.chip(bx + 32 + k * 13, by + 214 + (1 - abs(k - 1)) * -8, 14, 26, "")
    f.text(bx + 88, by + 222, "Other rollouts", "item")
    f.text(bx + 88, by + 248, "their mean", "note")
    f.text(bx + bw - 32, by + 222, "GRPO", "note", "end")
    f.text(bx + bw - 32, by + 248, "RLOO", "note", "end")

    f.arrow([(1780, row), (1830, row)])
    adv = [0.45, -0.25, 0.25, -0.45]
    _, abot = f.chip_stack(1848, row, 90, ["+.45", "−.25", "+.25", "−.45"], fills=[signed(a, 0.45) for a in adv], group_label="A")

    # Row 2: reference + update
    row2 = 690
    f.arrow([(734, rbot), (734, row2 - 69)])
    f.model(600, row2 - 65, 300, 130, "Reference", "optional", trained=False, dash=True)
    f.arrow([(900, row2), (1296, row2)], cls="line-dim", label="KL penalty", label_at=(1098, row2 - 14))
    f.op(1300, row2 - 65, 480, 130, "Policy-gradient update", "clipped; raise A&gt;0, lower A&lt;0")
    f.arrow([(1893, abot), (1893, row2), (1784, row2)])
    f.text(1840, row2 + 100, "SIGNAL: one number", "note", "middle")
    f.text(1840, row2 + 126, "per rollout", "note", "middle")
    f.arrow([(1540, row2 + 65), (1540, row2 + 150), (470, row2 + 150), (470, row + 69)], cls="line-dash")
    f.text(1005, row2 + 138, "gradient", "mono", "middle")

    f.write("method-rewards.svg")


# --- Teacher distributions -----------------------------------------------------


def distillation():
    f = Fig(960, "Teacher distributions: offline and on-policy distillation")
    f.fig_head("Teacher distributions: “here's what I would have said.”",
               "Same teacher, same student. The rows swap which model writes the text and which one reads it.")
    f.band(320, 650, 150, 940)
    f.band(1110, 1470, 150, 940)
    f.col_header(340, 630, "WRITES THE TEXT")
    f.col_header(690, 1060, "THE TEXT")
    f.col_header(1130, 1450, "READS IT")
    f.col_header(1500, 1920, "LOSS")

    # Row 1: offline
    f.row_label(260, "OFFLINE", "teacher writes, student reads")
    row = 400
    f.data(60, row - 65, 230, 130, "Prompts", "x")
    f.arrow([(290, row), (336, row)])
    f.model(340, row - 65, 290, 130, "Teacher", "stronger model", trained=False)
    f.arrow([(630, row), (686, row)])
    f.data(690, row - 65, 370, 130, "Teacher's answers", "written once")
    f.arrow([(1060, row), (1126, row)])
    f.model(1130, row - 65, 320, 130, "Student", THETA)
    f.arrow([(1450, row), (1496, row)])
    f.op(1500, row - 65, 420, 130, "Next-token loss", "on the teacher's tokens")
    f.gradient(1710, row - 65, 1290, row - 65, row - 100)
    f.token_strip(1500, row + 105, SFT_TOKENS)
    f.text(60, row + 120, "Variant: match the teacher's full", "note")
    f.text(60, row + 146, "next-token distribution.", "note")

    # Row 2: on-policy
    f.row_label(620, "ON-POLICY", "student writes, teacher reads")
    row = 760
    f.data(60, row - 65, 230, 130, "Prompts", "x")
    f.arrow([(290, row), (336, row)])
    f.model(340, row - 65, 290, 130, "Student", THETA)
    f.arrow([(630, row), (686, row)])
    f.data(690, row - 65, 370, 130, "Student's answer", "fresh each step", stacked=False)
    f.arrow([(1060, row), (1126, row)])
    f.model(1130, row - 65, 320, 130, "Teacher", "scores each token", trained=False)
    f.arrow([(1450, row), (1496, row)])
    f.op(1500, row - 65, 420, 130, "Per-token reward", f"log p{sub_('T')}(y{sub_('t')}) − log p{sub_('S')}(y{sub_('t')})")
    f.gradient(1710, row - 65, 485, row - 65, row - 100, label_x=1090)
    f.token_strip(1500, row + 105, OPD_TOKENS)
    f.write("method-distillation.svg")


if __name__ == "__main__":
    key()
    demonstrations()
    preferences()
    rewards()
    distillation()
