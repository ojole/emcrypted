#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "vendor", "fluent-emoji-src", "assets");
const DEST_DIR = path.join(ROOT, "vendor", "fluent-emoji");

// Mapping from skin tone folder names to hex codes
const SKIN_TONE_MAP = {
  Default: null, // no tone
  Light: "1f3fb",
  "Medium-Light": "1f3fc",
  Medium: "1f3fd",
  "Medium-Dark": "1f3fe",
  Dark: "1f3ff",
};

/**
 * Extract SVG for a specific emoji + tone variant
 */
async function extractVariant(emojiDir, toneFolderName, unicode, emojiName) {
  const toneHex = SKIN_TONE_MAP[toneFolderName];

  // Build the path to the tone variant folder
  const tonePath = path.join(emojiDir, toneFolderName);
  if (!fs.existsSync(tonePath)) {
    return null;
  }

  // Try Color first, then Flat as fallback
  let svgPath = path.join(tonePath, "Color");
  if (!fs.existsSync(svgPath)) {
    svgPath = path.join(tonePath, "Flat");
    if (!fs.existsSync(svgPath)) {
      console.warn(`[extract] No Color or Flat folder for ${emojiName} ${toneFolderName}`);
      return null;
    }
  }

  // Find the SVG file
  const files = fs.readdirSync(svgPath);
  const svgFile = files.find((f) => f.endsWith(".svg"));
  if (!svgFile) {
    console.warn(`[extract] No SVG file found in ${svgPath}`);
    return null;
  }

  const sourcePath = path.join(svgPath, svgFile);

  // Build filename from unicode
  // metadata.json has unicode like "1f46e 200d 2640 fe0f" or "1f46e 1f3fb"
  // We need to join with hyphens
  let hexFilename = unicode.replace(/\s+/g, "-").toLowerCase();

  // If there's a tone modifier specified, inject it if not already present
  // Actually, the unicodeSkintones array already has the tone in it, so we can use it directly

  const destPath = path.join(DEST_DIR, `${hexFilename}.svg`);

  return { sourcePath, destPath, hexFilename };
}

/**
 * Process a single emoji directory
 */
async function processEmoji(emojiName) {
  const emojiDir = path.join(SOURCE_DIR, emojiName);
  const metadataPath = path.join(emojiDir, "metadata.json");

  if (!fs.existsSync(metadataPath)) {
    console.warn(`[extract] No metadata.json for ${emojiName}`);
    return 0;
  }

  const metadata = JSON.parse(await fsp.readFile(metadataPath, "utf8"));
  const { unicodeSkintones, unicode } = metadata;

  let copiedCount = 0;

  if (unicodeSkintones && unicodeSkintones.length > 0) {
    // Process each skin tone variant
    for (let i = 0; i < unicodeSkintones.length; i++) {
      const toneUnicode = unicodeSkintones[i];
      const toneFolderName = Object.keys(SKIN_TONE_MAP)[i];

      if (!toneFolderName) {
        console.warn(`[extract] No tone folder mapping for index ${i} in ${emojiName}`);
        continue;
      }

      const result = await extractVariant(emojiDir, toneFolderName, toneUnicode, emojiName);

      if (result) {
        try {
          await fsp.copyFile(result.sourcePath, result.destPath);
          copiedCount++;
        } catch (err) {
          console.error(`[extract] Failed to copy ${result.sourcePath}:`, err.message);
        }
      }
    }
  } else if (unicode) {
    // No skin tone variants - extract from root folder
    // Try Color first, then Flat
    let svgPath = path.join(emojiDir, "Color");
    if (!fs.existsSync(svgPath)) {
      svgPath = path.join(emojiDir, "Flat");
    }

    if (fs.existsSync(svgPath)) {
      const files = fs.readdirSync(svgPath);
      const svgFile = files.find((f) => f.endsWith(".svg"));

      if (svgFile) {
        const sourcePath = path.join(svgPath, svgFile);
        const hexFilename = unicode.replace(/\s+/g, "-").toLowerCase();
        const destPath = path.join(DEST_DIR, `${hexFilename}.svg`);

        try {
          await fsp.copyFile(sourcePath, destPath);
          copiedCount++;
        } catch (err) {
          console.error(`[extract] Failed to copy ${sourcePath}:`, err.message);
        }
      }
    }
  }

  return copiedCount;
}

/**
 * Main extraction process
 */
async function run() {
  console.log("[extract-fluent-emojis] Starting extraction...");

  // Ensure destination directory exists
  await fsp.mkdir(DEST_DIR, { recursive: true });

  // Get all emoji directories
  const emojiDirs = fs.readdirSync(SOURCE_DIR).filter((name) => {
    const fullPath = path.join(SOURCE_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`[extract-fluent-emojis] Found ${emojiDirs.length} emoji directories`);

  let totalCopied = 0;

  for (const emojiName of emojiDirs) {
    const count = await processEmoji(emojiName);
    totalCopied += count;
  }

  console.log(`[extract-fluent-emojis] ✅ Extracted ${totalCopied} SVG files to ${DEST_DIR}`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error("[extract-fluent-emojis] Failed:", error);
    process.exit(1);
  });
}

module.exports = run;
