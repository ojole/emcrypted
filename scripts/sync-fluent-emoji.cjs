/* eslint-disable */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MOVIES_JSON = path.join(ROOT, "public", "data", "moviesG2G.json");
const FLUENT_DIR = path.join(ROOT, "vendor", "fluentui-emoji", "assets");
const OUT_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");

const dataByEmoji = (() => {
  try {
    return require(path.join(ROOT, "src", "data", "data-by-emoji.json"));
  } catch (error) {
    return {};
  }
})();

const emojiComponents = (() => {
  try {
    return require(path.join(ROOT, "src", "data", "data-emoji-components.json"));
  } catch (error) {
    return {};
  }
})();

const toneLookup = Object.entries(emojiComponents).reduce((acc, [slug, glyph]) => {
  acc[glyph] = slug;
  return acc;
}, {});

const VS16 = /\uFE0F/g;
const stripVS16 = (seq = "") => seq.replace(VS16, "");

function toHexCodeSequence(seq) {
  const cleaned = stripVS16(seq);
  const codes = [];
  for (let i = 0; i < cleaned.length; ) {
    const codePoint = cleaned.codePointAt(i);
    codes.push(codePoint.toString(16));
    i += codePoint > 0xffff ? 2 : 1;
  }
  return codes.join("-");
}

const hasSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";
let segmenter;

function getSegmenter() {
  if (!hasSegmenter) return null;
  if (!segmenter) {
    try {
      segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    } catch (error) {
      segmenter = null;
    }
  }
  return segmenter;
}

const emojiLikePattern = /[\p{Extended_Pictographic}\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Component}]/u;
const regionalIndicatorPattern = /[\u{1F1E6}-\u{1F1FF}]/u;
const tonePattern = /[\u{1F3FB}-\u{1F3FF}]/u;
const joinerPattern = /[\u200D\uFE0F\uFE0E\u20E3]/u;
const keycapBasePattern = /[#*0-9]/;

function isEmojiCluster(cluster) {
  if (!cluster) return false;
  if (emojiLikePattern.test(cluster)) return true;
  if (regionalIndicatorPattern.test(cluster)) return true;
  if (tonePattern.test(cluster)) return true;
  if (joinerPattern.test(cluster)) return true;
  if (keycapBasePattern.test(cluster) && cluster.includes("\u20E3")) return true;
  return false;
}

function splitEmojiClusters(str) {
  if (!str) return [];
  const source = String(str);
  const seg = getSegmenter();
  const clusters = [];

  if (seg && typeof seg.segment === "function") {
    for (const part of seg.segment(source)) {
      if (part && typeof part.segment === "string") {
        clusters.push(part.segment);
      }
    }
  } else {
    for (const char of Array.from(source)) {
      clusters.push(char);
    }
  }

  return clusters.filter(isEmojiCluster);
}

async function readMovies() {
  const raw = await fs.promises.readFile(MOVIES_JSON, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return Object.values(parsed);
}

function slugForEmoji(cluster) {
  const direct = dataByEmoji[cluster] || dataByEmoji[stripVS16(cluster)];
  if (direct && direct.slug) {
    return direct.slug;
  }

  const tones = [];
  let base = "";

  for (const ch of Array.from(cluster)) {
    if (toneLookup[ch]) {
      tones.push(toneLookup[ch]);
    } else if (ch !== "\uFE0F") {
      base += ch;
    }
  }

  const baseData = dataByEmoji[base] || dataByEmoji[stripVS16(base)];
  if (baseData && baseData.slug) {
    if (tones.length > 0) {
      return `${baseData.slug}_${tones.join("_")}`;
    }
    return baseData.slug;
  }

  return null;
}

async function buildAssetIndex() {
  const index = new Map();
  if (!fs.existsSync(FLUENT_DIR)) {
    return index;
  }

  const stack = [FLUENT_DIR];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith(".svg")) {
          index.set(lower, fullPath);
        }
      }
    }
  }

  return index;
}

function findAssetForSlug(slug, assetIndex) {
  if (!slug) return null;
  const base = slug.toLowerCase();
  const candidates = [
    `${base}_color.svg`,
    `${base}_color_default.svg`,
    `${base}.svg`,
    `${base}_flat.svg`,
    `${base}_high_contrast.svg`,
    `${base}_3d.svg`,
  ];

  for (const name of candidates) {
    if (assetIndex.has(name)) {
      return assetIndex.get(name);
    }
  }

  for (const [fileName, fullPath] of assetIndex.entries()) {
    if (fileName.startsWith(base)) {
      return fullPath;
    }
  }

  return null;
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyAsset(source, destination) {
  if (!source) return false;
  if (!fs.existsSync(source)) return false;
  await ensureDir(path.dirname(destination));
  await fs.promises.copyFile(source, destination);
  return true;
}

async function run() {
  if (!fs.existsSync(MOVIES_JSON)) {
    console.error("sync-fluent-emoji: movies data not found at", MOVIES_JSON);
    process.exit(1);
  }

  if (!fs.existsSync(FLUENT_DIR)) {
    console.warn("sync-fluent-emoji: Fluent UI Emoji assets not found. Skipping copy.");
    console.warn("Expected directory:", FLUENT_DIR);
    return;
  }

  const movies = await readMovies();
  const outputs = movies
    .map((entry) => entry && entry.output)
    .filter((value) => typeof value === "string");

  const seen = new Set();
  outputs.forEach((sequence) => {
    splitEmojiClusters(sequence).forEach((cluster) => {
      seen.add(cluster);
    });
  });

  await ensureDir(OUT_DIR);
  const assetIndex = await buildAssetIndex();
  const copied = [];
  const missing = [];

  for (const cluster of seen) {
    const slug = slugForEmoji(cluster);
    const source = findAssetForSlug(slug, assetIndex);
    const hex = toHexCodeSequence(cluster);
    const destination = path.join(OUT_DIR, `${hex}.svg`);

    if (source) {
      try {
        await copyAsset(source, destination);
        copied.push({ cluster, slug, hex, source });
      } catch (error) {
        console.warn(`sync-fluent-emoji: failed to copy asset for ${cluster} (${slug})`, error.message);
        missing.push({ cluster, slug, hex });
      }
    } else {
      missing.push({ cluster, slug, hex });
    }
  }

  console.log(`sync-fluent-emoji: clusters=${seen.size}, copied=${copied.length}, missing=${missing.length}`);
  if (missing.length > 0) {
    console.log("Missing assets (hex):");
    missing.forEach((item) => {
      console.log(`${item.hex} ${item.slug || "(no-slug)"} ${item.cluster}`);
    });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
