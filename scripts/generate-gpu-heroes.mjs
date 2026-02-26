#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_DEFAULT = "bytedance-seed/seedream-4.5";
const BASE_URL_DEFAULT = "https://openrouter.ai/api/v1";
const OUTPUT_BASENAME_DEFAULT = "hero-seedream-4-5";

const PROMPTS = {
  p1p2:
    "A cohesive editorial hero image in a retro-compute glitch-collage style: vertical sliced panels, pixel-block artifacts, subtle CRT scanlines, painterly texture, cool green/blue palette with restrained accent tones, soft atmospheric lighting, cinematic wide composition, no text, no letters, no logos, no watermark, abstract GPU memory hierarchy as layered geometric fields, shared-memory tiles glowing on-chip, bitonic comparator pathways woven through a grid, clean technical structure embedded into a landscape-like gradient horizon",
  p3p4:
    "A cohesive editorial hero image in a retro-compute glitch-collage style: vertical sliced panels, pixel-block artifacts, subtle CRT scanlines, painterly texture, cool green/blue palette with restrained accent tones, soft atmospheric lighting, cinematic wide composition, no text, no letters, no logos, no watermark, warp schedulers as branching traffic lanes, wavefronts moving through blocky city-like compute cells, tensor-core tile bursts as rhythmic pixel clusters, simulation overlays blended into the collage bands",
  p5:
    "A cohesive editorial hero image in a retro-compute glitch-collage style: vertical sliced panels, pixel-block artifacts, subtle CRT scanlines, painterly texture, cool green/blue palette with restrained accent tones, soft atmospheric lighting, cinematic wide composition, no text, no letters, no logos, no watermark, control-flow graph branches and reconvergence paths as ink-like lines over pixel mosaics, divergence zones highlighted by slight color shift, compiler/dataflow feeling with calm negative space",
  p6:
    "A cohesive editorial hero image in a retro-compute glitch-collage style: vertical sliced panels, pixel-block artifacts, subtle CRT scanlines, painterly texture, cool green/blue palette with restrained accent tones, soft atmospheric lighting, cinematic wide composition, no text, no letters, no logos, no watermark, attention flow as layered streams between tiled blocks, online-softmax accumulation represented by smooth contour ripples through glitch panels, KV-cache growth as stacked memory bands receding in depth",
  retro:
    "A cohesive editorial hero image in a retro-compute glitch-collage style: vertical sliced panels, pixel-block artifacts, subtle CRT scanlines, painterly texture, cool green/blue palette with restrained accent tones, soft atmospheric lighting, cinematic wide composition, no text, no letters, no logos, no watermark, a synthesis composition combining architecture blocks, memory waterfalls, scheduler paths, and attention motifs into one coherent mosaic, reflective systems journey tone",
};

const JOBS = [
  { key: "p1p2", label: "P1P2", articleDir: "src/content/ideas/2025/gpu-p1p2" },
  { key: "p3p4", label: "P3P4", articleDir: "src/content/ideas/2025/gpu-p3p4" },
  { key: "p5", label: "P5", articleDir: "src/content/ideas/2025/gpu-p5" },
  { key: "p6", label: "P6", articleDir: "src/content/ideas/2025/gpu-p6" },
  { key: "retro", label: "Retro", articleDir: "src/content/ideas/2025/gpu-retro" },
];

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    overwrite: false,
    help: false,
    articles: null,
    model: null,
    outputBasename: null,
    baseUrl: null,
    aspectRatio: null,
    imageSize: null,
    modalities: null,
  };

  for (const arg of argv) {
    if (arg === "--") continue;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--overwrite") parsed.overwrite = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg.startsWith("--articles=")) parsed.articles = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--model=")) parsed.model = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--output-basename=")) parsed.outputBasename = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--base-url=")) parsed.baseUrl = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--aspect-ratio=")) parsed.aspectRatio = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--image-size=")) parsed.imageSize = arg.split("=")[1] ?? "";
    else if (arg.startsWith("--modalities=")) parsed.modalities = arg.split("=")[1] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Generate hero images for GPU posts via OpenRouter.

Usage:
  node scripts/generate-gpu-heroes.mjs [options]

Options:
  --dry-run                   Print jobs and exit without API calls
  --overwrite                 Replace existing output files
  --articles=p1p2,p3p4,p5,p6,retro
  --model=${MODEL_DEFAULT}
  --output-basename=${OUTPUT_BASENAME_DEFAULT}
  --base-url=${BASE_URL_DEFAULT}
  --aspect-ratio=16:9
  --image-size=2K
  --modalities=image
  --help

Required env (unless --dry-run):
  OPENROUTER_API_KEY

Optional env:
  OPENROUTER_MODEL
  OPENROUTER_BASE_URL
  OPENROUTER_IMAGE_ASPECT_RATIO
  OPENROUTER_IMAGE_SIZE
  OPENROUTER_MODALITIES
  OPENROUTER_HTTP_REFERER
  OPENROUTER_APP_TITLE
`);
}

function parseModalities(modalitiesValue) {
  return modalitiesValue
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function imageExtensionFromMime(mime) {
  switch ((mime || "").toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

function extFromUrl(urlString) {
  const clean = urlString.split("?")[0].split("#")[0];
  const ext = path.extname(clean).replace(".", "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "png";
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getImageUrl(responseJson) {
  const choice = responseJson?.choices?.[0];
  const images = choice?.message?.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error(
      `No generated image found in API response. Partial response: ${JSON.stringify(responseJson).slice(0, 600)}`
    );
  }

  const firstImage = images[0];
  return (
    firstImage?.image_url?.url ||
    firstImage?.imageUrl?.url ||
    firstImage?.url ||
    null
  );
}

async function downloadImageBuffer(imageUrl) {
  if (typeof imageUrl !== "string" || imageUrl.length === 0) {
    throw new Error("Invalid image URL in API response.");
  }

  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Unsupported data URL format in image response.");
    const mime = match[1];
    const base64 = match[2];
    return {
      buffer: Buffer.from(base64, "base64"),
      extension: imageExtensionFromMime(mime),
    };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status} ${response.statusText}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    extension: extFromUrl(imageUrl),
  };
}

async function generateImage({ apiKey, baseUrl, model, prompt, imageConfig, modalities, referer, appTitle }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (referer) headers["HTTP-Referer"] = referer;
  if (appTitle) headers["X-Title"] = appTitle;

  const payload = {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities,
    stream: false,
  };

  if (Object.keys(imageConfig).length > 0) {
    payload.image_config = imageConfig;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter returned non-JSON response (${response.status}): ${text.slice(0, 600)}`);
  }

  if (!response.ok) {
    const apiError = json?.error?.message || json?.message || text.slice(0, 600);
    throw new Error(`OpenRouter request failed (${response.status}): ${apiError}`);
  }

  const imageUrl = getImageUrl(json);
  if (!imageUrl) throw new Error("OpenRouter response did not include a valid image URL.");
  return downloadImageBuffer(imageUrl);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const articleKeys = args.articles
    ? args.articles
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
    : JOBS.map((j) => j.key);

  const unknown = articleKeys.filter((key) => !JOBS.some((job) => job.key === key));
  if (unknown.length > 0) {
    throw new Error(`Unknown article key(s): ${unknown.join(", ")}`);
  }

  const selectedJobs = JOBS.filter((job) => articleKeys.includes(job.key));
  if (selectedJobs.length === 0) {
    throw new Error("No article jobs selected.");
  }

  const model = args.model || process.env.OPENROUTER_MODEL || MODEL_DEFAULT;
  const baseUrl = (args.baseUrl || process.env.OPENROUTER_BASE_URL || BASE_URL_DEFAULT).replace(/\/$/, "");
  const outputBasename = args.outputBasename || OUTPUT_BASENAME_DEFAULT;
  const aspectRatio = args.aspectRatio || process.env.OPENROUTER_IMAGE_ASPECT_RATIO || "16:9";
  const imageSize = args.imageSize || process.env.OPENROUTER_IMAGE_SIZE || "2K";
  const modalities = parseModalities(args.modalities || process.env.OPENROUTER_MODALITIES || "image");

  const imageConfig = {};
  if (aspectRatio) imageConfig.aspect_ratio = aspectRatio;
  if (imageSize) imageConfig.image_size = imageSize;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");

  console.log(`Model: ${model}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Articles: ${selectedJobs.map((x) => x.label).join(", ")}`);
  console.log(`Modalities: ${modalities.join(", ")}`);
  console.log(`Image config: ${JSON.stringify(imageConfig)}`);
  console.log(`Output basename: ${outputBasename}`);
  console.log(`Dry run: ${args.dryRun ? "yes" : "no"}`);
  console.log("");

  if (args.dryRun) {
    for (const job of selectedJobs) {
      console.log(`[DRY RUN] ${job.label} -> ${job.articleDir}/${outputBasename}.[png|jpg|webp|gif]`);
    }
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }

  const referer = process.env.OPENROUTER_HTTP_REFERER || "";
  const appTitle = process.env.OPENROUTER_APP_TITLE || "";

  for (const job of selectedJobs) {
    const prompt = PROMPTS[job.key];
    if (!prompt) {
      throw new Error(`Missing prompt for job key "${job.key}".`);
    }

    const targetDir = path.join(repoRoot, job.articleDir);
    await mkdir(targetDir, { recursive: true });

    const existingCandidates = ["png", "jpg", "webp", "gif"].map((ext) =>
      path.join(targetDir, `${outputBasename}.${ext}`)
    );

    if (!args.overwrite) {
      const firstExisting = (await Promise.all(existingCandidates.map((fp) => fileExists(fp)))).findIndex(Boolean);
      if (firstExisting >= 0) {
        console.log(`Skipping ${job.label}: file exists (${existingCandidates[firstExisting]}). Use --overwrite.`);
        continue;
      }
    }

    console.log(`Generating ${job.label}...`);
    const { buffer, extension } = await generateImage({
      apiKey,
      baseUrl,
      model,
      prompt,
      imageConfig,
      modalities,
      referer,
      appTitle,
    });

    const outputPath = path.join(targetDir, `${outputBasename}.${extension}`);
    await writeFile(outputPath, buffer);
    console.log(`Saved ${job.label}: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
