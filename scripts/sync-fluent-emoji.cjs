#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const glob = require("glob");
const fse = require("fs-extra");

const { splitGraphemes } = require("../src/utils/graphemes");

const ROOT = path.resolve(__dirname, "..");
const COMPILED_DATA_FILE = path.join(ROOT, "public", "data", "moviesG2G.compiled.json");
const RAW_DATA_FILE = path.join(ROOT, "public", "data", "moviesG2G.json");
const DEST_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");
const FLUENT_ROOT = path.join(ROOT, "vendor", "fluentui-emoji");
const ASSETS_DIR = path.join(FLUENT_ROOT, "assets");

const OBJECT_FOLDERS = new Map([
  ["📽️", "Film projector"],
  ["🎞️", "Film frames"],
  ["🎥", "Movie camera"],
  ["🖼️", "Framed picture"],
  ["🏍️", "Motorcycle"],
  ["🎬", "Clapper board"],
  ["✅", "Check mark button"],
  ["❎", "Cross mark button"],
  ["❤️", "Red heart"],
  ["❤", "Red heart"],
]);

const ROLE_DEFINITIONS = [
  {
    base: "👮",
    default: "Police officer",
    male: "Man police officer",
    female: "Woman police officer",
  },
  {
    base: "🕵️",
    default: "Detective",
    male: "Man detective",
    female: "Woman detective",
  },
  {
    base: "🧑‍⚕️",
    default: "Health worker",
    male: "Man health worker",
    female: "Woman health worker",
  },
  {
    base: "🧑‍💻",
    default: "Technologist",
    male: "Man technologist",
    female: "Woman technologist",
  },
  {
    base: "🧑‍🏫",
    default: "Teacher",
    male: "Man teacher",
    female: "Woman teacher",
  },
  {
    base: "🧑‍🎨",
    default: "Artist",
    male: "Man artist",
    female: "Woman artist",
  },
  {
    base: "🧑‍🎤",
    default: "Singer",
    male: "Man singer",
    female: "Woman singer",
  },
  {
    base: "🧑‍✈️",
    default: "Pilot",
    male: "Man pilot",
    female: "Woman pilot",
  },
  {
    base: "🧑‍🚀",
    default: "Astronaut",
    male: "Man astronaut",
    female: "Woman astronaut",
  },
  {
    base: "🧑‍🚒",
    default: "Firefighter",
    male: "Man firefighter",
    female: "Woman firefighter",
  },
  {
    base: "🧑‍⚖️",
    default: "Judge",
    male: "Man judge",
    female: "Woman judge",
  },
  {
    base: "🧑‍🔧",
    default: "Mechanic",
    male: "Man mechanic",
    female: "Woman mechanic",
  },
  {
    base: "🧑‍🏭",
    default: "Factory worker",
    male: "Man factory worker",
    female: "Woman factory worker",
  },
  {
    base: "🧑‍💼",
    default: "Office worker",
    male: "Man office worker",
    female: "Woman office worker",
  },
  {
    base: "🧑‍🔬",
    default: "Scientist",
    male: "Man scientist",
    female: "Woman scientist",
  },
  {
    base: "🧑‍🎓",
    default: "Student",
    male: "Man student",
    female: "Woman student",
  },
  {
    base: "🧑‍🍳",
    default: "Cook",
    male: "Man cook",
    female: "Woman cook",
  },
];

const ROLE_FOLDER = new Map();

const COUPLE_FOLDER_NAMES = {
  kiss: "Kiss",
  heart: "Couple with Heart",
  holding: "People holding hands",
};

const FLAG_NAME_OVERRIDES = {
  GB: "Flag United Kingdom",
  UK: "Flag United Kingdom",
  US: "Flag United States",
  FR: "Flag France",
  PL: "Flag Poland",
  IT: "Flag Italy",
  IN: "Flag India",
  IR: "Flag Iran",
  CU: "Flag Cuba",
  AT: "Flag Austria",
  MX: "Flag Mexico",
  AU: "Flag Australia",
  NL: "Flag Netherlands",
  VN: "Flag Vietnam",
  RU: "Flag Russia",
  JP: "Flag Japan",
  LB: "Flag Lebanon",
  RW: "Flag Rwanda",
  DE: "Flag Germany",
  BO: "Flag Bolivia",
  BR: "Flag Brazil",
  EU: "Flag European Union",
};

const REQUIRED_CLUSTERS = new Set([
  "❎",
  "🎬",
  "🎥",
  "🎞️",
  "📽️",
  "🖼️",
  "❤️",
  "👮",
  "👮‍♂️",
  "👮‍♀️",
  "🕵️",
  "🕵️‍♂️",
  "🕵️‍♀️",
  "🧑‍⚕️",
  "🧑‍💻",
  "🧑‍🏫",
  "🧑‍🎨",
  "🧑‍🎤",
  "🧑‍✈️",
  "🧑‍🚀",
  "🧑‍🚒",
  "🧑‍⚖️",
  "🧑‍🔧",
  "🧑‍🏭",
  "🧑‍💼",
  "🧑‍🔬",
  "🧑‍🎓",
  "🧑‍🍳",
  "👫",
  "👬",
  "👭",
  "👩‍❤️‍👨",
  "👨‍❤️‍👨",
  "👩‍❤️‍👩",
  "👩‍❤️‍💋‍👨",
  "👨‍❤️‍💋‍👨",
  "👩‍❤️‍💋‍👩",
  "💑",
  "💏",
]);

const STYLE_PREFERENCE = ["Color", "Flat", "3D", "High Contrast"];

let folderIndexCache = null;
let assetIndexPromise;
const missingClusters = new Set();

const stripVS16 = (value) => (value ? value.replace(/\uFE0E|\uFE0F/g, "") : value);
const stripSkinTones = (value) => (value ? value.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "") : value);

const normalizeCluster = (cluster) => (cluster ? stripVS16(cluster.normalize("NFC")) : cluster);

for (const [key, value] of Array.from(OBJECT_FOLDERS.entries())) {
  const stripped = stripVS16(key);
  if (stripped && stripped !== key && !OBJECT_FOLDERS.has(stripped)) {
    OBJECT_FOLDERS.set(stripped, value);
  }
}

const toHex = (cluster) => {
  if (!cluster) return "";
  const parts = [];
  for (const char of cluster) {
    parts.push(char.codePointAt(0).toString(16));
  }
  return parts.join("-");
};

const fromHex = (hex) => {
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
};

const slugify = (value) => {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
};

const ensureFolderIndex = () => {
  if (folderIndexCache) return folderIndexCache;
  folderIndexCache = new Map();
  if (!fs.existsSync(ASSETS_DIR)) return folderIndexCache;
  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = slugify(entry.name);
    if (slug && !folderIndexCache.has(slug)) {
      folderIndexCache.set(slug, path.join(ASSETS_DIR, entry.name));
    }
  }
  return folderIndexCache;
};

const resolveFolderByName = (folderName) => {
  if (!folderName) return null;
  const slug = slugify(folderName);
  if (!slug) return null;
  const index = ensureFolderIndex();
  return index.get(slug) || null;
};

for (const entry of ROLE_DEFINITIONS) {
  const variants = new Set([entry.base]);
  const stripped = stripVS16(entry.base);
  if (stripped) variants.add(stripped);
  if (entry.base.startsWith("🧑")) {
    const maleVariant = entry.base.replace("🧑", "👨");
    const femaleVariant = entry.base.replace("🧑", "👩");
    variants.add(maleVariant);
    variants.add(femaleVariant);
    const strippedMale = stripVS16(maleVariant);
    const strippedFemale = stripVS16(femaleVariant);
    if (strippedMale) variants.add(strippedMale);
    if (strippedFemale) variants.add(strippedFemale);
  }
  for (const variant of variants) {
    if (variant && !ROLE_FOLDER.has(variant)) {
      ROLE_FOLDER.set(variant, entry);
    }
  }
}

const addGlyphValue = (target, value) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => addGlyphValue(target, v));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((v) => addGlyphValue(target, v));
    return;
  }
  if (typeof value === "string" && value.trim()) {
    target.add(value);
  }
};

const addHexValue = (target, value) => {
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
};

const findPreferredSvg = (folder) => {
  for (const style of STYLE_PREFERENCE) {
    const directMatches = glob.sync(path.join(folder, style, "*.svg"));
    if (directMatches.length) {
      directMatches.sort();
      return directMatches[0];
    }
    const nestedMatches = glob.sync(path.join(folder, "*", style, "*.svg"));
    if (nestedMatches.length) {
      nestedMatches.sort();
      return nestedMatches[0];
    }
  }
  const matches = glob.sync(path.join(folder, "*.svg"));
  if (matches.length) {
    matches.sort();
    return matches[0];
  }
  const nestedFallback = glob.sync(path.join(folder, "*", "*.svg"));
  if (nestedFallback.length) {
    nestedFallback.sort();
    return nestedFallback[0];
  }
  return null;
};

const buildAssetIndex = async () => {
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
      addGlyphValue(glyphs, meta.glyph || meta.emoji || meta.character);
      addHexValue(hexes, meta.hexcode || meta.hex || meta.unicode);
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

  return { glyph: glyphMap, hex: hexMap, name: nameMap };
};

const getAssetIndex = async () => {
  if (!assetIndexPromise) {
    assetIndexPromise = buildAssetIndex();
  }
  return assetIndexPromise;
};

const objectFolderFallback = (cluster) => {
  const folderName = OBJECT_FOLDERS.get(cluster) || OBJECT_FOLDERS.get(stripVS16(cluster));
  if (!folderName) return null;
  const folder = resolveFolderByName(folderName);
  if (!folder) return null;
  const svgPath = findPreferredSvg(folder);
  if (!svgPath) return null;
  return { svgPath, name: folderName, glyph: cluster, hex: toHex(cluster) };
};

const roleFolderFallback = (cluster) => {
  if (!cluster) return null;
  const stripped = stripVS16(stripSkinTones(cluster));
  if (!stripped) return null;
  const parts = stripped.split("\u200D").filter(Boolean);
  if (!parts.length) return null;

  let genderHint = null;
  const modifiers = parts.slice(1);
  if (modifiers.length && /[\u2640\u2642]/.test(modifiers[modifiers.length - 1])) {
    genderHint = modifiers.pop();
  }

  let baseGlyph = parts[0];
  const explicitMale = baseGlyph === "👨";
  const explicitFemale = baseGlyph === "👩";
  if (explicitMale || explicitFemale) {
    baseGlyph = "🧑";
  }

  const baseKey = [baseGlyph, ...modifiers].join("\u200D") || baseGlyph;
  const roleEntry =
    ROLE_FOLDER.get(baseKey) || ROLE_FOLDER.get(stripVS16(baseKey)) || ROLE_FOLDER.get(baseGlyph);
  if (!roleEntry) return null;

  let folderName = roleEntry.default;
  const genderSource = genderHint || (explicitMale ? "\u2642" : explicitFemale ? "\u2640" : "");
  if (/\u2642/.test(genderSource) && roleEntry.male) {
    folderName = roleEntry.male;
  } else if (/\u2640/.test(genderSource) && roleEntry.female) {
    folderName = roleEntry.female;
  } else if (explicitMale && roleEntry.male) {
    folderName = roleEntry.male;
  } else if (explicitFemale && roleEntry.female) {
    folderName = roleEntry.female;
  }

  const folder =
    resolveFolderByName(folderName) ||
    resolveFolderByName(roleEntry.default) ||
    resolveFolderByName(roleEntry.male) ||
    resolveFolderByName(roleEntry.female);
  if (!folder) return null;
  const svgPath = findPreferredSvg(folder);
  if (!svgPath) return null;
  return { svgPath, name: folderName, glyph: cluster, hex: toHex(cluster) };
};

const coupleFolderFallback = (cluster) => {
  if (!cluster) return null;
  const stripped = stripVS16(stripSkinTones(cluster));
  if (!stripped) return null;

  let category = null;
  if (stripped.includes("\u2764") || stripped === "💑") {
    category = "heart";
  } else if (stripped.includes("\u1F48B") || stripped === "💏") {
    category = "kiss";
  } else if (stripped.includes("\u1F91D") || ["👫", "👬", "👭"].includes(stripped)) {
    category = "holding";
  }

  if (!category) return null;
  const folderName = COUPLE_FOLDER_NAMES[category];
  const folder = resolveFolderByName(folderName);
  if (!folder) return null;
  const svgPath = findPreferredSvg(folder);
  if (!svgPath) return null;
  return { svgPath, name: folderName, glyph: cluster, hex: toHex(cluster) };
};

const isoFromRegionalIndicators = (cluster) => {
  if (!cluster) return null;
  const stripped = stripVS16(cluster);
  const codePoints = Array.from(stripped, (char) => char.codePointAt(0));
  if (!codePoints.length) return null;
  if (!codePoints.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)) return null;
  return codePoints
    .map((cp) => String.fromCharCode(65 + (cp - 0x1f1e6)))
    .join("")
    .toUpperCase();
};

const flagFolderNameFromIso = (code) => {
  if (!code) return null;
  if (FLAG_NAME_OVERRIDES[code]) return FLAG_NAME_OVERRIDES[code];
  return null;
};

const flagFolderFallback = (cluster) => {
  const isoCode = isoFromRegionalIndicators(cluster);
  if (!isoCode) return null;
  const folderName = flagFolderNameFromIso(isoCode);
  if (!folderName) return null;
  const folder = resolveFolderByName(folderName);
  if (!folder) return null;
  const svgPath = findPreferredSvg(folder);
  if (!svgPath) return null;
  return { svgPath, name: folderName, glyph: cluster, hex: toHex(cluster) };
};

const createPlaceholderSvg = async (cluster, destPath) => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">\n  <rect width="128" height="128" rx="24" ry="24" fill="#f0f2f5"/>\n  <text x="50%" y="50%" font-size="64" text-anchor="middle" dominant-baseline="central">${cluster}</text>\n</svg>`;
  await fse.ensureDir(path.dirname(destPath));
  await fsp.writeFile(destPath, svgContent, "utf8");
};

const resolveCluster = async (cluster) => {
  if (!cluster) return null;
  const index = await getAssetIndex();
  const normalized = normalizeCluster(cluster);
  const hex = toHex(cluster);

  const directGlyph =
    index.glyph.get(normalized) || index.glyph.get(stripVS16(cluster)) || index.glyph.get(cluster);
  if (directGlyph) return directGlyph;

  const directHex =
    index.hex.get(hex) || index.hex.get(hex.replace(/-fe0f/g, "")) || index.hex.get(toHex(stripVS16(cluster)));
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

  const roleFallback = roleFolderFallback(cluster);
  if (roleFallback) return roleFallback;

  const coupleFallback = coupleFolderFallback(cluster);
  if (coupleFallback) return coupleFallback;

  const flagFallback = flagFolderFallback(cluster);
  if (flagFallback) return flagFallback;

  return null;
};

const copyCluster = async (cluster) => {
  const hex = toHex(cluster);
  if (!hex) return { hex: "" };
  const destPath = path.join(DEST_DIR, `${hex}.svg`);
  if (fs.existsSync(destPath)) {
    return { hex };
  }

  const resolved = await resolveCluster(cluster);
  if (!resolved || !resolved.svgPath || !fs.existsSync(resolved.svgPath)) {
    try {
      await createPlaceholderSvg(cluster, destPath);
      return { hex };
    } catch (error) {
      missingClusters.add(cluster);
      return { hex };
    }
  }

  await fse.ensureDir(DEST_DIR);
  await fse.copy(resolved.svgPath, destPath);
  return { hex };
};

const collectClustersFromData = async () => {
  const sourceFile = fs.existsSync(COMPILED_DATA_FILE) ? COMPILED_DATA_FILE : RAW_DATA_FILE;
  if (!sourceFile || !fs.existsSync(sourceFile)) return new Set();
  try {
    const raw = await fsp.readFile(sourceFile, "utf8");
    const json = JSON.parse(raw);
    const list = Array.isArray(json) ? json : Object.values(json || {});
    const clusters = new Set();
    for (const item of list) {
      const output = item?.emojiString || item?.output || "";
      splitGraphemes(output).forEach((cluster) => clusters.add(cluster));
      if (Array.isArray(item?.tokenHex)) {
        item.tokenHex.forEach((hex) => {
          const glyph = fromHex(hex);
          if (glyph) clusters.add(glyph);
        });
      }
    }
    return clusters;
  } catch (err) {
    console.warn("[sync-fluent-emoji] Unable to parse movies data", err.message);
    return new Set();
  }
};

const syncAll = async () => {
  missingClusters.clear();
  const clusters = await collectClustersFromData();
  for (const extra of REQUIRED_CLUSTERS) {
    if (extra) clusters.add(extra);
  }
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
        .map((glyph) => `${glyph} (U+${toHex(glyph).toUpperCase().replace(/-/g, " U+")})`)
        .join(", ")
    );
  }
};

const syncFullLibrary = async () => {
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
};

const run = async () => {
  if (process.env.EMOJI_FULL_SYNC) {
    await syncFullLibrary();
    return;
  }
  await syncAll();
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  copyCluster,
  toHex,
  splitGraphemes,
};
