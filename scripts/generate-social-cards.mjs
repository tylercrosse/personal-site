import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardData = JSON.parse(
  await readFile(path.join(root, "src/config/socialCards.json"), "utf8"),
);
const outputRoot = path.join(root, "public/social");
const width = 1200;
const height = 630;

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function wrapText(text, maxCharacters) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, { x, y, size, lineHeight, weight = 600, fill }) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n");
}

function motif(name, accent) {
  const shared = `fill="none" stroke="${accent}" stroke-linecap="round" stroke-linejoin="round"`;
  const motifs = {
    orbit: `
      <g opacity="0.9" ${shared}>
        <circle cx="954" cy="307" r="178" stroke-width="2" opacity="0.35"/>
        <circle cx="954" cy="307" r="116" stroke-width="2" opacity="0.6"/>
        <path d="M790 372c64-148 215-225 337-153" stroke-width="5"/>
        <circle cx="790" cy="372" r="12" fill="${accent}" stroke="none"/>
        <circle cx="1127" cy="219" r="12" fill="${accent}" stroke="none"/>
        <circle cx="954" cy="307" r="26" fill="#fdf6e3" stroke-width="6"/>
      </g>`,
    notebook: `
      <g transform="translate(770 124) rotate(-3 190 190)" ${shared}>
        <rect x="18" y="18" width="345" height="386" rx="18" fill="#eee8d5" stroke-width="3"/>
        <path d="M74 0v36M128 0v36M182 0v36M236 0v36M290 0v36" stroke-width="8"/>
        <path d="M83 116h216M83 174h216M83 232h170M83 290h216" stroke-width="5" opacity="0.55"/>
        <path d="M242 340l91-91 28 28-91 91-43 15z" stroke-width="6" fill="#fdf6e3"/>
      </g>`,
    scatter: `
      <g ${shared} opacity="0.9">
        <path d="M748 455V160M748 455h370" stroke-width="3" opacity="0.45"/>
        <path d="M778 426c78-15 98-112 166-135 61-21 91 15 154-100" stroke-width="5"/>
        <g fill="${accent}" stroke="none">
          <circle cx="794" cy="406" r="10"/><circle cx="838" cy="380" r="8"/>
          <circle cx="892" cy="315" r="12"/><circle cx="946" cy="286" r="9"/>
          <circle cx="1007" cy="307" r="8"/><circle cx="1066" cy="243" r="11"/>
          <circle cx="1100" cy="183" r="8"/>
        </g>
      </g>`,
    network: `
      <g ${shared} stroke-width="4" opacity="0.85">
        <path d="M788 190l126 90-126 128M914 280l129-105M914 280l139 119M1043 175l10 224" opacity="0.45"/>
        <g fill="#fdf6e3" stroke-width="7">
          <circle cx="788" cy="190" r="25"/><circle cx="788" cy="408" r="25"/>
          <circle cx="914" cy="280" r="32"/><circle cx="1043" cy="175" r="25"/>
          <circle cx="1053" cy="399" r="25"/>
        </g>
      </g>`,
    chip: `
      <g ${shared} stroke-width="5" opacity="0.85">
        <rect x="817" y="153" width="240" height="300" rx="24" fill="#eee8d5"/>
        <rect x="869" y="210" width="136" height="186" rx="12"/>
        <path d="M817 201h-52M817 257h-52M817 313h-52M817 369h-52M817 425h-52M1057 201h52M1057 257h52M1057 313h52M1057 369h52M1057 425h52"/>
        <path d="M896 246h82M896 280h82M896 314h82M896 348h82" opacity="0.55"/>
      </g>`,
    systems: `
      <g ${shared} stroke-width="5" opacity="0.85">
        <path d="M801 212l138 86 139-86M939 298v145M801 212v150l138 81 139-81V212" opacity="0.55"/>
        <g fill="#fdf6e3" stroke-width="7">
          <rect x="755" y="165" width="92" height="74" rx="12"/>
          <rect x="893" y="261" width="92" height="74" rx="12"/>
          <rect x="1032" y="165" width="92" height="74" rx="12"/>
          <rect x="893" y="406" width="92" height="74" rx="12"/>
        </g>
      </g>`,
    alignment: `
      <g ${shared} opacity="0.9">
        <circle cx="938" cy="305" r="164" stroke-width="3" opacity="0.35"/>
        <circle cx="938" cy="305" r="104" stroke-width="4" opacity="0.55"/>
        <circle cx="938" cy="305" r="42" stroke-width="7"/>
        <path d="M780 391c82-48 137-32 190-87 44-46 85-83 142-105" stroke-width="7"/>
        <path d="M1081 196l31 3-8 31" stroke-width="7"/>
      </g>`,
  };
  return motifs[name] ?? motifs.orbit;
}

function standardCard(card) {
  const titleMax = card.title.length > 36 ? 24 : 28;
  const titleLines = (card.titleLines ?? wrapText(card.title, titleMax)).slice(0, 3);
  const titleSize = titleLines.length === 1 ? 76 : titleLines.length === 2 ? 66 : 56;
  const titleLineHeight = Math.round(titleSize * 1.05);
  const titleY = titleLines.length === 1 ? 292 : titleLines.length === 2 ? 255 : 220;
  const descriptionLines = wrapText(card.description, 47).slice(0, 2);
  const descriptionY = titleY + titleLines.length * titleLineHeight + 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="wash" cx="82%" cy="48%" r="58%">
        <stop offset="0" stop-color="${card.accent}" stop-opacity="0.16"/>
        <stop offset="1" stop-color="#fdf6e3" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grain" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="0.7" fill="#002b36" opacity="0.12"/>
        <circle cx="19" cy="16" r="0.6" fill="#002b36" opacity="0.08"/>
      </pattern>
    </defs>
    <rect width="1200" height="630" fill="#fdf6e3"/>
    <rect width="1200" height="630" fill="url(#wash)"/>
    <rect width="1200" height="630" fill="url(#grain)"/>
    <rect x="72" y="74" width="52" height="8" rx="4" fill="${card.accent}"/>
    <text x="141" y="87" font-family="IBM Plex Sans, Arial, sans-serif" font-size="23" font-weight="600" letter-spacing="2.2" fill="#586e75">${escapeXml(card.eyebrow.toUpperCase())}</text>
    ${textLines(titleLines, { x: 72, y: titleY, size: titleSize, lineHeight: titleLineHeight, weight: 600, fill: "#002b36" })}
    ${textLines(descriptionLines, { x: 76, y: descriptionY, size: 26, lineHeight: 35, weight: 400, fill: "#586e75" })}
    ${motif(card.motif, card.accent)}
    <line x1="72" y1="557" x2="1128" y2="557" stroke="#93a1a1" stroke-opacity="0.45"/>
    <text x="72" y="595" font-family="IBM Plex Sans, Arial, sans-serif" font-size="20" font-weight="500" letter-spacing="1" fill="#586e75">tylercrosse.com</text>
    <text x="1128" y="595" text-anchor="end" font-family="IBM Plex Sans, Arial, sans-serif" font-size="24" font-weight="600" fill="${card.accent}">TC</text>
  </svg>`;
}

async function aboutCard(card) {
  const portrait = await sharp(path.join(root, "public/img/headshot.jpeg"))
    .resize(530, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toBuffer();
  const portraitUrl = `data:image/jpeg;base64,${portrait.toString("base64")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="photoFade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#002b36" stop-opacity="1"/>
        <stop offset="0.32" stop-color="#002b36" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#002b36" stop-opacity="0.05"/>
      </linearGradient>
      <pattern id="aboutGrain" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="7" r="0.7" fill="#fdf6e3" opacity="0.16"/>
        <circle cx="18" cy="19" r="0.6" fill="#fdf6e3" opacity="0.1"/>
      </pattern>
    </defs>
    <rect width="1200" height="630" fill="#002b36"/>
    <image href="${portraitUrl}" x="670" y="0" width="530" height="630" preserveAspectRatio="xMidYMid slice"/>
    <rect x="560" width="640" height="630" fill="url(#photoFade)"/>
    <rect width="1200" height="630" fill="url(#aboutGrain)"/>
    <rect x="72" y="74" width="52" height="8" rx="4" fill="${card.accent}"/>
    <text x="141" y="87" font-family="IBM Plex Sans, Arial, sans-serif" font-size="23" font-weight="600" letter-spacing="2.2" fill="#93a1a1">ABOUT</text>
    <text x="72" y="274" font-family="IBM Plex Sans, Arial, sans-serif" font-size="72" font-weight="600" fill="#fdf6e3">${escapeXml(card.title)}</text>
    ${textLines(wrapText(card.description, 38).slice(0, 3), { x: 76, y: 337, size: 25, lineHeight: 35, weight: 400, fill: "#93a1a1" })}
    <line x1="72" y1="557" x2="632" y2="557" stroke="#93a1a1" stroke-opacity="0.35"/>
    <text x="72" y="595" font-family="IBM Plex Sans, Arial, sans-serif" font-size="20" font-weight="500" letter-spacing="1" fill="#93a1a1">tylercrosse.com</text>
  </svg>`;
}

async function renderCard(card, outputPath) {
  const svg = card.motif === "portrait" ? await aboutCard(card) : standardCard(card);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const jpeg = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
  await writeFile(outputPath, jpeg);
  console.log(path.relative(root, outputPath));
}

await renderCard(cardData.home, path.join(outputRoot, "home.jpg"));
await renderCard(cardData.about, path.join(outputRoot, "about.jpg"));
await renderCard(cardData.ideas, path.join(outputRoot, "ideas.jpg"));

for (const [slug, card] of Object.entries(cardData.topics)) {
  await renderCard(card, path.join(outputRoot, "topics", `${slug}.jpg`));
}
