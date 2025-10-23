#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fse = require("fs-extra");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "public", "data", "moviesG2G.json");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "moviesG2G.compiled.json");
const SVG_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");

const { splitGraphemes } = require("../src/utils/graphemes");
const { copyCluster, toHex } = require("./sync-fluent-emoji.cjs");

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const buildTokenEntry = async (cluster) => {
  const { hex } = await copyCluster(cluster);
  const assetPath = `/vendor/fluent-emoji/${hex}.svg`;
  return {
    cluster,
    hex,
    asset: assetPath,
  };
};

const compilePuzzle = async (puzzle) => {
  const output = String(puzzle?.output || "");
  const clusters = splitGraphemes(output);
  const tokens = [];
  const tokenHex = [];

  for (const cluster of clusters) {
    // eslint-disable-next-line no-await-in-loop
    const token = await buildTokenEntry(cluster);
    tokens.push(token);
    tokenHex.push(token.hex);
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

  const raw = await fsp.readFile(SOURCE_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const puzzles = ensureArray(parsed);

  await fse.ensureDir(SVG_DIR);

  const compiled = [];
  for (const puzzle of puzzles) {
    // eslint-disable-next-line no-await-in-loop
    compiled.push(await compilePuzzle(puzzle));
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
