#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const glob = require("glob");

const ROOT = path.resolve(__dirname, "..");
const TONE_REGEX = /[\u{1F3FB}-\u{1F3FF}]/u;
const TONE_HEX_REGEX = /(1f3fb|1f3fc|1f3fd|1f3fe|1f3ff)/i;
const NON_LIGHT_TONE_REGEX = /(1f3fc|1f3fd|1f3fe|1f3ff)/i; // Tones other than light (1f3fb)
const SVG_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");

const normaliseList = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const loadJsonFile = async (filePath) => {
  const raw = await fsp.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const describeIssue = ({ file, title, cluster, hex, index }) =>
  `• ${path.relative(ROOT, file)} — "${title || "Unknown"}" token #${index + 1} (${cluster ||
    "∅"}) -> ${hex}`;

const auditFile = async (filePath, issues, stats, warnings) => {
  const data = await loadJsonFile(filePath);
  const puzzles = normaliseList(data);

  puzzles.forEach((entry) => {
    const title = entry?.title || entry?.movie || "Untitled";
    const tokens = normaliseList(entry?.tokens);
    const hexList = Array.isArray(entry?.tokenHex) ? entry.tokenHex : [];

    tokens.forEach((token, index) => {
      const cluster = token?.cluster || "";
      const hexFull = token?.hexFull || token?.hex || "";
      const asset = typeof token?.asset === "string" ? token.asset : "";
      const hasToneFlag = token?.hasTone === true;
      if (cluster) stats.total += 1;
      if (!cluster) return;
      const clusterHasTone = TONE_REGEX.test(cluster);

      // Check for mismatched hasTone flag
      if (hasToneFlag && !clusterHasTone) {
        issues.push({ file: filePath, title, cluster, hex: `${hexFull} (flagged tone but no tone in cluster)`, index });
      }

      // Check for non-light tones in toneless emojis (light tone 1f3fb is OK - it's our build-time normalization)
      const hexHasNonLightTone = NON_LIGHT_TONE_REGEX.test(hexFull);
      if (!hasToneFlag && hexHasNonLightTone) {
        issues.push({ file: filePath, title, cluster, hex: `${hexFull} (has non-light tone but not flagged)`, index });
      }

      // NEW: Check for missing normalized assets (build-time injected 1f3fb)
      // If hasTone === false AND asset contains 1f3fb (meaning we normalized it),
      // check if that file exists
      if (!hasToneFlag && asset && asset.includes("1f3fb")) {
        // Extract filename from asset path (e.g., "/vendor/fluent-emoji/1f46e-1f3fb-200d-2642-fe0f.svg")
        const filename = path.basename(asset);
        const assetPath = path.join(SVG_DIR, filename);

        if (!fs.existsSync(assetPath)) {
          warnings.push({
            file: filePath,
            title,
            cluster,
            asset: filename,
            index,
          });
        }
      }
    });

    hexList.forEach((hex, index) => {
      const cluster = tokens[index]?.cluster || "";
      if (!cluster) return;
      const hasTone = TONE_REGEX.test(cluster);
      const hexHasNonLightTone = NON_LIGHT_TONE_REGEX.test(String(hex));
      if (!hasTone && hexHasNonLightTone) {
        issues.push({ file: filePath, title, cluster, hex: `${hex} (tokenHex has non-light tone)`, index });
      }
    });
  });
};

const run = async () => {
  const compiled = glob.sync("public/data/movies*.compiled.json", {
    cwd: ROOT,
    absolute: true,
  });
  const raw = glob.sync("public/data/movies*.json", {
    cwd: ROOT,
    absolute: true,
  }).filter((file) => !file.endsWith(".compiled.json"));
  const files = Array.from(new Set([...raw, ...compiled]));

  if (!files.length) {
    console.warn("[verify:skin] No movie data files found.");
    return;
  }

  const issues = [];
  const warnings = [];
  const stats = { total: 0 };

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    await auditFile(file, issues, stats, warnings);
  }

  if (issues.length) {
    console.error("[verify:skin] Found tokens with unexpected skin-tone modifiers:");
    issues.forEach((issue) => console.error(describeIssue(issue)));
    process.exit(1);
  }

  if (warnings.length) {
    console.warn("[tone-normalize] Missing normalized assets (build-time 1f3fb injection):");
    warnings.forEach((warning) => {
      const relativePath = path.relative(ROOT, warning.file);
      console.warn(
        `  [tone-normalize] missing asset ${warning.asset} for "${warning.title}" token ${warning.index + 1} (${warning.cluster})`
      );
    });
    console.warn(
      `[tone-normalize] ${warnings.length} normalized emoji(s) missing from ${path.relative(ROOT, SVG_DIR)}/`
    );
  }

  console.log(`[verify:skin] Checked ${stats.total} tokens across ${files.length} file(s): all clear.`);
};

if (require.main === module) {
  run().catch((error) => {
    console.error("[verify:skin] Failed:", error);
    process.exit(1);
  });
}

module.exports = run;
