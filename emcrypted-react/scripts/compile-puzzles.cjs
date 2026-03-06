#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fse = require("fs-extra");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "public", "data", "moviesG2G.json");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "moviesG2G.compiled.json");

const { splitGraphemes } = require("../src/utils/graphemes");
const { buildAssetIndex } = require("./sync-fluent-emoji.cjs");

// Skin tone modifiers (Fitzpatrick)
const SKIN_TONES = new Set(["1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff"]);

// Hair modifiers
const HAIR_MODIFIERS = new Set(["1f9b0", "1f9b1", "1f9b2", "1f9b3"]);

// Variation selectors (must be stripped for consistent base signatures)
const VARIATION_SELECTORS = new Set(["fe0f"]);

// Tone priority: no-tone (neutral/vendor default) FIRST - real Fluent art
// Tone-coded variants (1f3fb, etc.) are mostly placeholder <text> emojis in our bundle
const TONE_PRIORITY = [
  null,    // vendor no-tone, real Fluent art
  "1f3fb",
  "1f3fc",
  "1f3fd",
  "1f3fe",
  "1f3ff",
];

// Human base codepoints for single-person detection
const HUMAN_BASES = new Set([
  "1f466", "1f467", "1f468", "1f469", "1f9d1", "1f474", "1f475",
  "1f46e", "1f575", "1f482", "1f3c3", "1f3ca", "1f6b6", "1f3c4",
  "1f3cb", "1f9cd", "1f64e", "1f471", "1f476", "1f477", "1f478",
  "1f473", "1f472", "1f9d4", "1f9d5", "1f9d6", "1f9d7", "1f9d8",
  "1f9d9", "1f9da", "1f9db", "1f9dc", "1f9dd", "1f9de", "1f9df",
  "1f486", "1f487", "1f6a3", "1f6b4", "1f6b5", "1f938", "1f93d",
  "1f93e", "1f939", "1f6c0", "1f6cc", "1f574", "1f483", "1f57a",
  "1f385", "1f936", "1f9b8", "1f9b9", "1f470", "1f930", "1f931",
  "1f47c", "1f934", "1f935", "1f64d", "1f645", "1f646", "1f481",
  "1f64b", "1f9cf", "1f647", "1f926", "1f937",
]);

// Body part bases (hands, arms) that should also be tone-normalized
const BODY_PART_BASES = new Set([
  "1f4aa", // 💪 flexed biceps
  "1f44f", // 👏 clapping hands
  "1f44d", // 👍 thumbs up
  "1f44e", // 👎 thumbs down
  "1f44b", // 👋 waving hand
  "1f64f", // 🙏 folded hands
  "1f64c", // 🙌 raising hands
  "1f44a", // 👊 oncoming fist
  "270c", // ✌ victory hand
  "270b", // ✋ raised hand
  "1faf6", // 🫶 heart hands
  "1f450", // 👐 open hands
  "1f44c", // 👌 OK hand
  "1f448", // 👈 backhand index pointing left
  "1f449", // 👉 backhand index pointing right
  "1f446", // 👆 backhand index pointing up
  "1f447", // 👇 backhand index pointing down
  "261d", // ☝ index pointing up
  "1f91e", // 🤞 crossed fingers
  "1f91f", // 🤟 love-you gesture
  "1f918", // 🤘 sign of the horns
  "1f919", // 🤙 call me hand
  "1f590", // 🖐 hand with fingers splayed
  "270a", // ✊ raised fist
  "1f91b", // 🤛 left-facing fist
  "1f91c", // 🤜 right-facing fist
  "1f91a", // 🤚 raised back of hand
  "1f596", // 🖖 vulcan salute
  "1f64b", // 🙋 person raising hand (overlaps with human)
  "1f64e", // 🙎 person pouting (overlaps with human)
  "1f64d", // 🙍 person frowning (overlaps with human)
  "1f645", // 🙅 person gesturing NO (overlaps with human)
  "1f646", // 🙆 person gesturing OK (overlaps with human)
  "1f481", // 💁 person tipping hand (overlaps with human)
  "1f926", // 🤦 person facepalming (overlaps with human)
  "1f937", // 🤷 person shrugging (overlaps with human)
  "1f9b5", // 🦵 leg
  "1f9b6", // 🦶 foot
  "1f442", // 👂 ear
  "1f443", // 👃 nose
]);

/**
 * Analyze SVG content for skin tone brightness
 * Returns { isVector: boolean, avgBrightness: number | null }
 */
function analyzeSVGBrightness(svgContent) {
  if (!svgContent || typeof svgContent !== "string") {
    return { isVector: false, avgBrightness: null };
  }

  // Detect if this is a placeholder <text> emoji (not real Fluent vector art)
  if (svgContent.includes("<text")) {
    return { isVector: false, avgBrightness: null };
  }

  // Real Fluent SVG contains paths, gradients, etc.
  const isVector = svgContent.includes("<path") || svgContent.includes("<g") || svgContent.includes("linearGradient");

  if (!isVector) {
    return { isVector: false, avgBrightness: null };
  }

  // Find all fill colors
  const fillMatches = svgContent.matchAll(/fill="(#[0-9a-fA-F]{6})"/g);
  const fills = Array.from(fillMatches, (m) => m[1]);

  // Filter for skin-tone-like colors (warm colors in beige/pink/brown range)
  const skinColors = fills.filter((color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Skin tones are typically warm (R > B) and not too saturated
    // Exclude pure grays, pure blacks, pure whites
    const isWarm = r > b;
    const notGray = Math.abs(r - g) > 10 || Math.abs(g - b) > 10 || Math.abs(r - b) > 10;
    const notExtreme = r < 255 && (r > 50 || g > 50 || b > 50);

    return isWarm && notGray && notExtreme;
  });

  if (skinColors.length === 0) {
    return { isVector: true, avgBrightness: null };
  }

  // Compute average brightness for skin colors
  const brightnesses = skinColors.map((color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return (r + g + b) / 3;
  });

  const avgBrightness = brightnesses.reduce((sum, b) => sum + b, 0) / brightnesses.length;

  return { isVector: true, avgBrightness };
}

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const toCodePoints = (cluster) =>
  Array.from(cluster.normalize("NFC"), (char) => char.codePointAt(0))
    .filter((cp) => !Number.isNaN(cp))
    .map((cp) => cp.toString(16).toLowerCase());

/**
 * Check if codepoints array has explicit skin tone
 */
function hasExplicitSkinTone(codepoints) {
  return codepoints.some((cp) => SKIN_TONES.has(cp));
}

/**
 * Check if this is a single-person human emoji (not family, couple, or crowd)
 */
function isSinglePersonHuman(codepoints) {
  // Count human bases
  const countHumans = codepoints.filter((cp) => HUMAN_BASES.has(cp)).length;
  if (countHumans !== 1) return false;

  // Exclude silhouettes like 👥 (1f465)
  if (codepoints.includes("1f465")) return false;

  return true;
}

/**
 * Check if this emoji is tone-normalizable (single human or single body part)
 * Returns true if we should pick the brightest variant for this emoji
 */
function isToneNormalizableSingleActor(codepoints) {
  // Case A: Single-person human
  if (isSinglePersonHuman(codepoints)) {
    return true;
  }

  // Case B: Single body-part (hand, arm, etc.)
  // Check if the first non-modifier codepoint is a body part
  const firstBase = codepoints.find(
    (cp) => !SKIN_TONES.has(cp) && !HAIR_MODIFIERS.has(cp) && !VARIATION_SELECTORS.has(cp)
  );

  if (firstBase && BODY_PART_BASES.has(firstBase)) {
    // Make sure it's not a multi-person gesture like handshake
    // Handshake is 1f91d which is NOT in BODY_PART_BASES, so we're good
    const humanCount = codepoints.filter((cp) => HUMAN_BASES.has(cp)).length;
    if (humanCount > 1) return false; // Multi-person

    return true;
  }

  return false;
}

/**
 * Build base signature by removing skin tones, hair modifiers, and variation selectors
 * This ensures variants like "1f575-fe0f" and "1f575-1f3fb" map to the same base
 */
function buildBaseSignature(codepoints) {
  return codepoints
    .map((cp) => cp.toLowerCase())
    .filter((cp) => !SKIN_TONES.has(cp) && !HAIR_MODIFIERS.has(cp) && !VARIATION_SELECTORS.has(cp))
    .join("-");
}

/**
 * Extract tone from codepoints (returns first tone found or null)
 */
function extractTone(codepoints) {
  for (const cp of codepoints) {
    if (SKIN_TONES.has(cp)) return cp;
  }
  return null;
}

/**
 * Build emoji inventory from asset index
 * Maps baseSignature -> array of variant objects with brightness analysis
 */
function buildEmojiInventory(assetIndex) {
  const inventory = {};

  // Iterate through hex map
  for (const [hexStr, entry] of assetIndex.hex.entries()) {
    const codepoints = hexStr.split("-").filter(Boolean);
    const baseSignature = buildBaseSignature(codepoints);
    const tone = extractTone(codepoints);
    const filename = `${hexStr}.svg`;

    // Read and analyze the SVG file
    let isVector = false;
    let avgBrightness = null;

    try {
      if (entry.svgPath && fs.existsSync(entry.svgPath)) {
        const svgContent = fs.readFileSync(entry.svgPath, "utf8");
        const analysis = analyzeSVGBrightness(svgContent);
        isVector = analysis.isVector;
        avgBrightness = analysis.avgBrightness;
      }
    } catch (err) {
      // If we can't read the file, assume it's not usable
      console.warn(`[buildEmojiInventory] Failed to analyze ${filename}:`, err.message);
    }

    if (!inventory[baseSignature]) {
      inventory[baseSignature] = [];
    }

    inventory[baseSignature].push({
      filename,
      hex: hexStr,
      tone,
      codepoints,
      svgPath: entry.svgPath,
      isVector,
      avgBrightness,
    });
  }

  return inventory;
}

/**
 * Choose the best variant using brightness-based selection
 * This replaces the old TONE_PRIORITY approach with actual SVG analysis
 */
function chooseVariantForAutoTone(variants, explicitTone) {
  if (!variants || variants.length === 0) return null;

  //
  // CASE 1: Puzzle author explicitly chose a tone (e.g. 👨🏾 in the source string)
  // We MUST respect that, culturally and historically.
  //
  if (explicitTone) {
    // Try exact tone match that is real Fluent vector art
    const exactVector = variants.find(
      (v) => v.tone === explicitTone && v.isVector
    );
    if (exactVector) return exactVector;

    // Fallback: any real Fluent vector in this baseSignature bucket
    const anyVector = variants.find((v) => v.isVector);
    if (anyVector) return anyVector;

    // Absolute last resort: just return something so rendering doesn't break
    return variants[0];
  }

  //
  // CASE 2: No explicit tone (author did NOT pick a skin modifier)
  // We are allowed to normalize this emoji (isToneNormalizableSingleActor === true).
  //
  // STEP 2a: Prefer the vendor's neutral/yellow default:
  //          tone === null (i.e. no Fitzpatrick modifier) AND it's real vector art.
  //
  const defaultVector = variants.find(
    (v) => v.tone == null && v.isVector
  );
  if (defaultVector) {
    return defaultVector;
  }

  //
  // STEP 2b: If there's no usable neutral default, fall back to
  //          our brightness sort across *real* Fluent vectors.
  //
  const realVectors = variants.filter((v) => v.isVector);
  if (realVectors.length === 0) {
    // Nothing usable? Just return something to avoid broken <img>.
    return variants[0];
  }

  realVectors.sort((a, b) => {
    const aHas = typeof a.avgBrightness === "number";
    const bHas = typeof b.avgBrightness === "number";

    if (aHas && bHas) {
      // brighter skin first
      return b.avgBrightness - a.avgBrightness;
    }
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  return realVectors[0];
}

/**
 * Pick the best variant from inventory based on new brightness-aware rules
 */
function pickBestVariant(inventory, baseSignature, originalCodepoints, authorExplicitTone) {
  const variants = inventory[baseSignature];
  if (!variants || variants.length === 0) {
    // Fallback: try exact match with original codepoints
    const originalHex = originalCodepoints.join("-");
    return { filename: `${originalHex}.svg`, hex: originalHex };
  }

  const explicitTone = authorExplicitTone ? extractTone(originalCodepoints) : null;

  // Check if this emoji is tone-normalizable (single human or body part)
  const isNormalizable = isToneNormalizableSingleActor(originalCodepoints);

  if (authorExplicitTone || isNormalizable) {
    // Use brightness-based selection
    const chosen = chooseVariantForAutoTone(variants, explicitTone);
    if (chosen) return chosen;
  }

  // For non-normalizable emojis (multi-person, objects, etc.)
  // Try to find exact match with original codepoints
  const originalHex = originalCodepoints.join("-");
  const exactMatch = variants.find((v) => v.hex === originalHex);
  if (exactMatch) return exactMatch;

  // Fall back to first available variant
  return variants[0];
}

/**
 * Build a token entry for a single emoji cluster
 */
const buildTokenEntry = (cluster, emojiInventory) => {
  const codepoints = toCodePoints(cluster);
  const originalHex = codepoints.join("-");
  const baseSignature = buildBaseSignature(codepoints);
  const authorExplicitTone = hasExplicitSkinTone(codepoints);

  // Pick the best variant
  const variant = pickBestVariant(emojiInventory, baseSignature, codepoints, authorExplicitTone);
  const finalHex = variant.hex;
  const filename = variant.filename;

  const token = {
    cluster,
    hex: finalHex,
    hexFull: finalHex,
    hexBase: baseSignature,
    hasTone: authorExplicitTone,
    asset: `/vendor/fluent-emoji/${filename}`,
    originalHex,
  };

  return token;
};

const compilePuzzle = (puzzle, emojiInventory) => {
  const output = String(puzzle?.output || "");
  const clusters = splitGraphemes(output);
  const tokens = [];
  const tokenHex = [];

  for (const cluster of clusters) {
    const token = buildTokenEntry(cluster, emojiInventory);
    tokens.push(token);
    tokenHex.push(token.hexFull || token.hex);
  }

  return {
    ...puzzle,
    emojiString: output,
    tokens,
    tokenHex,
  };
};

const run = async () => {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.warn(`compile-puzzles: source file not found at ${SOURCE_FILE}`);
    return;
  }

  // Build asset index from Fluent emoji source
  console.log("compile-puzzles: building asset index from vendor/fluentui-emoji...");
  const assetIndex = await buildAssetIndex();
  console.log(`compile-puzzles: indexed ${assetIndex?.hex?.size || 0} emoji variants`);

  // Build emoji inventory (grouped by base signature)
  console.log("compile-puzzles: building emoji inventory...");
  const emojiInventory = buildEmojiInventory(assetIndex);
  const inventorySize = Object.keys(emojiInventory).length;
  console.log(`compile-puzzles: inventory contains ${inventorySize} base signatures`);

  const raw = await fsp.readFile(SOURCE_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const puzzles = ensureArray(parsed);

  const compiled = [];
  for (const puzzle of puzzles) {
    compiled.push(compilePuzzle(puzzle, emojiInventory));
  }

  await fse.ensureDir(path.dirname(OUTPUT_FILE));
  await fsp.writeFile(OUTPUT_FILE, JSON.stringify(compiled, null, 2), "utf8");
  console.log(`compile-puzzles: wrote ${compiled.length} puzzles → ${path.relative(ROOT, OUTPUT_FILE)}`);
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = run;
