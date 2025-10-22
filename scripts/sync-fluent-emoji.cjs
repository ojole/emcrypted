#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const glob = require("glob");
const fse = require("fs-extra");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "public", "data", "moviesG2G.json");
const DEST_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");
const FLUENT_ROOT = path.join(ROOT, "vendor", "fluentui-emoji");
const ASSETS_DIR = path.join(FLUENT_ROOT, "assets");

const OBJECT_FOLDER = new Map([
  ["📽️", "Film Projector"],
  ["🎞️", "Film Frames"],
  ["🖼️", "Framed Picture"],
  ["🏍️", "Motorcycle"],
  ["🎬", "Clapper Board"],
  ["✅", "Check Mark Button"],
]);

const STYLE_PREFERENCE = ["Color", "3D", "Flat", "High Contrast"];

let assetIndexPromise;
const missingClusters = new Set();
let segmenter;

function ensureSegmenter() {
  if (!segmenter && typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  }
  return segmenter;
}

function splitGraphemesStr(value) {
  if (!value) return [];
  const seg = ensureSegmenter();
  if (seg) {
    return Array.from(seg.segment(value), ({ segment }) => segment);
  }
  const list = [];
  for (const char of value) list.push(char);
  return list;
}

function stripVS16(value) {
  return value ? value.replace(/[\uFE0E\uFE0F]/g, "") : value;
}

function normalizeCluster(cluster) {
  return cluster ? stripVS16(cluster.normalize("NFC")) : cluster;
}

function toHex(cluster) {
  if (!cluster) return "";
  const parts = [];
  for (const char of cluster) {
    parts.push(char.codePointAt(0).toString(16));
  }
  return parts.join("-");
}

function fromHex(hex) {
  if (!hex) return null;
  const tokens = String(hex)
    .toLowerCase()
    .replace(/u\+/g, "")
    .split(/[^0-9a-f]+/)
    .filter(Boolean);
  if (!tokens.length) return null;
  try {
    const cps = tokens.map((token) => parseInt(token, 16));
    if (cps.some((cp) => Number.isNaN(cp))) return null;
    return String.fromCodePoint(...cps);
  } catch (err) {
    return null;
  }
}

function slugify(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function addGlyphValue(target, value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => addGlyphValue(target, v));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((v) => addGlyphValue(target, v));
    return;
  }
  if (typeof value === "string") {
    if (!value.trim()) return;
    target.add(value);
  }
}

function addHexValue(target, value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => addHexValue(target, v));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((v) => addHexValue(target, v));
    return;
  }
  if (typeof value === "string") {
    const sanitized = value
      .toLowerCase()
      .replace(/u\+/g, "")
      .replace(/[^0-9a-f\s-]+/g, " ")
      .trim();
    if (!sanitized) return;
    sanitized
      .split(/[\s,]+/)
      .map((token) => token.replace(/[^0-9a-f-]/g, ""))
      .filter(Boolean)
      .forEach((token) => target.add(token));
  }
}

function findPreferredSvg(folder) {
  for (const style of STYLE_PREFERENCE) {
    const matches = glob.sync(path.join(folder, style, "*.svg"));
    if (matches.length) {
      matches.sort();
      return matches[0];
    }
  }
  const matches = glob.sync(path.join(folder, "*.svg"));
  if (matches.length) {
    matches.sort();
    return matches[0];
  }
  return null;
}

async function buildAssetIndex() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.warn("[sync-fluent-emoji] Fluent emoji assets not found at", ASSETS_DIR);
    return { glyph: new Map(), hex: new Map(), name: new Map() };
  }

  const glyphMap = new Map();
  const hexMap = new Map();
  const nameMap = new Map();

  const metaFiles = glob.sync("**/metadata.json", { cwd: ASSETS_DIR, absolute: true });
  for (const metaPath of metaFiles) {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (err) {
      meta = null;
    }

    const folder = path.dirname(metaPath);
    const svgPath = findPreferredSvg(folder);
    if (!svgPath) continue;

    const glyphs = new Set();
    const hexes = new Set();

    if (meta) {
      addGlyphValue(glyphs, meta.glyph || meta.glyphs || meta.emoji || meta.character || meta.characters);
      addHexValue(hexes, meta.hexcode || meta.hex || meta.unicode || meta.codepoint || meta.codepoints);
      addHexValue(hexes, meta.unicodeSkins || meta.variation || meta.variations);
      if (meta.shortcodes) addGlyphValue(glyphs, meta.shortcodes);
      if (meta.skins) {
        for (const skin of meta.skins) {
          addGlyphValue(glyphs, skin?.glyph || skin?.emoji);
          addHexValue(hexes, skin?.hexcode || skin?.unicode || skin?.codepoint);
        }
      }
      if (meta.variants) {
        for (const variant of meta.variants) {
          addGlyphValue(glyphs, variant?.glyph || variant?.emoji);
          addHexValue(hexes, variant?.hexcode || variant?.unicode || variant?.codepoint);
        }
      }
    }

    if (hexes.size) {
      for (const hex of hexes) {
        const glyph = fromHex(hex);
        if (glyph) glyphs.add(glyph);
      }
    }

    if (!glyphs.size) continue;

    const baseName = path.basename(folder);
    const entry = { svgPath, name: baseName, meta: meta || {} };
    const nameCandidates = new Set([
      slugify(baseName),
      slugify(meta?.annotation),
      slugify(meta?.name),
      slugify(meta?.shortname || meta?.short_name),
    ]);
    if (Array.isArray(meta?.shortcodes)) {
      meta.shortcodes.forEach((code) => nameCandidates.add(slugify(code)));
    }

    for (const candidate of nameCandidates) {
      if (candidate && !nameMap.has(candidate)) nameMap.set(candidate, entry);
    }

    for (const glyph of glyphs) {
      if (!glyph) continue;
      const normalized = normalizeCluster(glyph);
      const hex = toHex(glyph);
      const record = { ...entry, glyph, hex };
      if (!glyphMap.has(normalized)) glyphMap.set(normalized, record);
      const stripped = stripVS16(normalized);
      if (stripped && !glyphMap.has(stripped)) glyphMap.set(stripped, record);
      if (!glyphMap.has(glyph)) glyphMap.set(glyph, record);
      if (!hexMap.has(hex)) hexMap.set(hex, record);
      const hexNoVs = hex.replace(/-fe0f/g, "");
      if (hexNoVs && !hexMap.has(hexNoVs)) hexMap.set(hexNoVs, record);
    }
  }

  const manifestPath = glob
    .sync("**/emoji.json", { cwd: FLUENT_ROOT, absolute: true })
    .filter((file) => !file.includes("node_modules"))
    .sort((a, b) => a.length - b.length)[0];

  if (manifestPath && fs.existsSync(manifestPath)) {
    try {
      const manifestRaw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const manifestEntries = Array.isArray(manifestRaw)
        ? manifestRaw
        : Array.isArray(manifestRaw?.data)
        ? manifestRaw.data
        : Object.values(manifestRaw || {});

      for (const item of manifestEntries) {
        if (!item) continue;
        const glyphs = new Set();
        const hexes = new Set();
        addGlyphValue(glyphs, item.glyph || item.emoji || item.character);
        addHexValue(hexes, item.hexcode || item.hex || item.unicode);
        if (item.skins) {
          for (const skin of item.skins) {
            addGlyphValue(glyphs, skin?.glyph || skin?.emoji);
            addHexValue(hexes, skin?.hexcode || skin?.unicode);
          }
        }
        for (const hex of hexes) {
          const glyph = fromHex(hex);
          if (glyph) glyphs.add(glyph);
        }

        const candidatePaths = [];
        if (item.assets && typeof item.assets === "object") {
          Object.values(item.assets).forEach((assetEntry) => {
            if (!assetEntry) return;
            if (typeof assetEntry === "string") {
              candidatePaths.push(assetEntry);
              return;
            }
            if (typeof assetEntry === "object") {
              candidatePaths.push(assetEntry.color, assetEntry.color_svg, assetEntry.svg);
            }
          });
        }
        candidatePaths.push(item.color, item.color_svg, item.svg);

        let svgPath = null;
        for (const candidate of candidatePaths) {
          if (typeof candidate !== "string") continue;
          const clean = candidate.replace(/^\.\//, "");
          const abs = path.isAbsolute(clean) ? clean : path.join(FLUENT_ROOT, clean);
          if (fs.existsSync(abs) && abs.endsWith(".svg")) {
            svgPath = abs;
            break;
          }
        }
        if (!svgPath) {
          const slug = slugify(item.annotation || item.name || item.shortName);
          if (slug && nameMap.has(slug)) {
            svgPath = nameMap.get(slug).svgPath;
          }
        }
        if (!svgPath) continue;

        for (const glyph of glyphs) {
          if (!glyph) continue;
          const normalized = normalizeCluster(glyph);
          const hex = toHex(glyph);
          const record = { svgPath, name: item.annotation || item.name || slugify(item.shortName), glyph, hex, meta: item };
          if (!glyphMap.has(normalized)) glyphMap.set(normalized, record);
          const stripped = stripVS16(normalized);
          if (stripped && !glyphMap.has(stripped)) glyphMap.set(stripped, record);
          if (!glyphMap.has(glyph)) glyphMap.set(glyph, record);
          if (!hexMap.has(hex)) hexMap.set(hex, record);
          const hexNoVs = hex.replace(/-fe0f/g, "");
          if (hexNoVs && !hexMap.has(hexNoVs)) hexMap.set(hexNoVs, record);
        }
      }
    } catch (err) {
      console.warn("[sync-fluent-emoji] Unable to parse emoji manifest", manifestPath, err.message);
    }
  }

  return { glyph: glyphMap, hex: hexMap, name: nameMap };
}

async function getAssetIndex() {
  if (!assetIndexPromise) {
    assetIndexPromise = buildAssetIndex();
  }
  return assetIndexPromise;
}

function objectFolderFallback(cluster) {
  const folderName = OBJECT_FOLDER.get(cluster) || OBJECT_FOLDER.get(stripVS16(cluster));
  if (!folderName) return null;
  const folder = path.join(ASSETS_DIR, folderName);
  if (!fs.existsSync(folder)) return null;
  const svgPath = findPreferredSvg(folder);
  if (!svgPath) return null;
  return { svgPath, name: folderName, glyph: cluster, hex: toHex(cluster) };
}

async function resolveCluster(cluster) {
  if (!cluster) return null;
  const index = await getAssetIndex();
  const normalized = normalizeCluster(cluster);
  const hex = toHex(cluster);

  const directGlyph = index.glyph.get(normalized) || index.glyph.get(stripVS16(cluster)) || index.glyph.get(cluster);
  if (directGlyph) return directGlyph;

  const directHex = index.hex.get(hex) || index.hex.get(hex.replace(/-fe0f/g, "")) || index.hex.get(toHex(stripVS16(cluster)));
  if (directHex) return directHex;

  const keycapMatch = cluster.match(/^(?<base>[0-9#*])\uFE0F?\u20E3$/);
  if (keycapMatch) {
    const normalizedKeycap = `${keycapMatch.groups.base}\uFE0F\u20E3`;
    const keycapHex = toHex(normalizedKeycap);
    const fallback = index.hex.get(keycapHex);
    if (fallback) return fallback;
  }

  if (/^(?:\uD83C[\uDDE6-\uDDFF]){2}$/.test(cluster)) {
    const stripped = stripVS16(cluster);
    const fallback = index.glyph.get(stripped) || index.hex.get(toHex(stripped));
    if (fallback) return fallback;
  }

  if (cluster.includes("\u200D")) {
    const compactHex = hex.replace(/-fe0f/g, "");
    const fallback = index.hex.get(compactHex);
    if (fallback) return fallback;
  }

  const objectFallback = objectFolderFallback(cluster);
  if (objectFallback) return objectFallback;

  return null;
}

async function copyCluster(cluster) {
  const hex = toHex(cluster);
  if (!hex) return { hex: "" };
  const destPath = path.join(DEST_DIR, `${hex}.svg`);
  if (fs.existsSync(destPath)) {
    return { hex };
  }

  const resolved = await resolveCluster(cluster);
  if (!resolved || !resolved.svgPath || !fs.existsSync(resolved.svgPath)) {
    missingClusters.add(cluster);
    return { hex };
  }

  await fse.ensureDir(DEST_DIR);
  await fse.copy(resolved.svgPath, destPath);
  return { hex };
}

async function collectClustersFromData() {
  if (!fs.existsSync(DATA_FILE)) return new Set();
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf8");
    const json = JSON.parse(raw);
    const list = Array.isArray(json) ? json : Object.values(json || {});
    const clusters = new Set();
    for (const item of list) {
      const output = item?.output || "";
      splitGraphemesStr(output).forEach((cluster) => clusters.add(cluster));
    }
    return clusters;
  } catch (err) {
    console.warn("[sync-fluent-emoji] Unable to parse movies data", err.message);
    return new Set();
  }
}

async function syncAll() {
  missingClusters.clear();
  const clusters = await collectClustersFromData();
  if (!clusters.size) {
    console.log("[sync-fluent-emoji] No emoji found to sync.");
    return;
  }

  await fse.ensureDir(DEST_DIR);

  let processed = 0;
  for (const cluster of clusters) {
    // eslint-disable-next-line no-await-in-loop
    await copyCluster(cluster);
    processed += 1;
  }
  console.log(`sync-fluent-emoji: ensured ${processed} emoji assets.`);

  if (missingClusters.size) {
    console.warn(
      "[sync-fluent-emoji] Missing Fluent assets for:",
      Array.from(missingClusters)
        .map((glyph) => `${glyph} (U+${toHex(glyph).toUpperCase().replace(/-/g, ' U+')})`)
        .join(", ")
    );
  }
}

async function syncFullLibrary() {
  const index = await getAssetIndex();
  if (!index.hex.size) {
    console.warn("[sync-fluent-emoji] No emoji index available for full sync.");
    return;
  }
  await fse.ensureDir(DEST_DIR);
  let count = 0;
  for (const [hex, entry] of index.hex.entries()) {
    if (!hex || !entry?.svgPath) continue;
    const destPath = path.join(DEST_DIR, `${hex}.svg`);
    if (fs.existsSync(destPath)) continue;
    await fse.copy(entry.svgPath, destPath);
    count += 1;
  }
  console.log(`sync-fluent-emoji: copied ${count} assets via full sync.`);
}

async function run() {
  if (process.env.EMOJI_FULL_SYNC) {
    await syncFullLibrary();
    return;
  }
  await syncAll();
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  copyCluster,
  splitGraphemesStr,
  toHex,
};
