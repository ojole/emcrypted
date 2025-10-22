const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fse = require("fs-extra");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "data", "moviesG2G.json");
const OUT = path.join(ROOT, "public", "data", "moviesG2G.compiled.json");
const SVGDIR = path.join(ROOT, "public", "vendor", "fluent-emoji");

const sync = require("./sync-fluent-emoji.cjs");

async function compileOne(item) {
  const output = String(item.output || "");
  const clusters = sync.splitGraphemesStr(output);
  const tokens = [];
  for (const cluster of clusters) {
    // eslint-disable-next-line no-await-in-loop
    const { hex } = await sync.copyCluster(cluster);
    const svgPath = path.join(SVGDIR, `${hex}.svg`);
    tokens.push({
      cluster,
      hex,
      asset: fs.existsSync(svgPath) ? `/vendor/fluent-emoji/${hex}.svg` : null,
    });
  }
  return { ...item, tokens };
}

async function run() {
  await fse.ensureDir(SVGDIR);
  const raw = await fsp.readFile(SRC, "utf8");
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : Object.values(data || {});
  const compiled = [];
  for (const item of list) {
    // eslint-disable-next-line no-await-in-loop
    compiled.push(await compileOne(item));
  }
  await fse.ensureDir(path.dirname(OUT));
  await fsp.writeFile(OUT, JSON.stringify(compiled, null, 2), "utf8");
  console.log(`compile-puzzles: wrote ${compiled.length} puzzles → ${path.relative(ROOT, OUT)}`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = run;
