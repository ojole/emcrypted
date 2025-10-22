/* eslint-disable */
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const fse = require("fs-extra");
const glob = require("glob");

// -------- paths --------
const ROOT = path.resolve(__dirname, "..");
const MOVIES_JSON = path.join(ROOT, "public", "data", "moviesG2G.json");
const OUT_DIR = path.join(ROOT, "public", "vendor", "fluent-emoji");
const FLUENT_DIR = path.join(ROOT, "vendor", "fluentui-emoji", "assets");

// Optional CLDR metadata for fuzzy matching
let CLDR = {};
try { CLDR = require(path.join(ROOT, "src", "data", "data-by-emoji.json")); } catch (_) {}

// Settings
const STYLE_PREF = ["Color", "Flat", "3D", "High Contrast"];
const FULL_SYNC = String(process.env.EMOJI_FULL_SYNC || "").toLowerCase() === "true";  // EMOJI_FULL_SYNC=true npm run sync:emoji

// Codepoint helpers
const VS16 = /\uFE0F/g;   // variation selector
const SKIN = /\p{Emoji_Modifier}/u; // tone
function toHex(seq) {
  const s = (seq || "").replace(VS16, "");
  const out = [];
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i);
    out.push(cp.toString(16));
    i += cp > 0xffff ? 2 : 1;
  }
  return out.join("-");
}

// Lightweight cluster splitter for COLLECTION (runtime rendering still uses robust splitter)
function splitGraphemesStr(str) {
  const out = [];
  let buf = "";
  const push = () => { if (buf) { out.push(buf); buf = ""; } };
  for (let i = 0; i < str.length; ) {
    const cp = str.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    buf += ch;
    const step = cp > 0xffff ? 2 : 1;
    const next = str.codePointAt(i + step);
    if (next === 0x200d) { i += step; continue; } // keep joining
    push();
    i += step;
  }
  push();
  return out.filter(Boolean);
}

// ---------- NORMALIZERS (collapse gender/tones/variants to base glyphs where Fluent folders use a single name) ----------

// Professions & roles (expanded from earlier patch)
function neutralizeProfession(cluster) {
  const rules = [
    [/👨\u200d⚕️|👩\u200d⚕️|🧑\u200d⚕️/u, "🧑‍⚕️"], [/👨\u200d🎓|👩\u200d🎓|🧑\u200d🎓/u, "🧑‍🎓"],
    [/👨\u200d🏫|👩\u200d🏫|🧑\u200d🏫/u, "🧑‍🏫"], [/👨\u200d⚖️|👩\u200d⚖️|🧑\u200d⚖️/u, "🧑‍⚖️"],
    [/👨\u200d🌾|👩\u200d🌾|🧑\u200d🌾/u, "🧑‍🌾"], [/👨\u200d🍳|👩\u200d🍳|🧑\u200d🍳/u, "🧑‍🍳"],
    [/👨\u200d🔧|👩\u200d🔧|🧑\u200d🔧/u, "🧑‍🔧"], [/👨\u200d🏭|👩\u200d🏭|🧑\u200d🏭/u, "🧑‍🏭"],
    [/👨\u200d💼|👩\u200d💼|🧑\u200d💼/u, "🧑‍💼"], [/👨\u200d🔬|👩\u200d🔬|🧑\u200d🔬/u, "🧑‍🔬"],
    [/👨\u200d💻|👩\u200d💻|🧑\u200d💻/u, "🧑‍💻"], [/👨\u200d🎤|👩\u200d🎤|🧑\u200d🎤/u, "🧑‍🎤"],
    [/👨\u200d🎨|👩\u200d🎨|🧑\u200d🎨/u, "🧑‍🎨"], [/👨\u200d✈️|👩\u200d✈️|🧑\u200d✈️/u, "🧑‍✈️"],
    [/👨\u200d🚀|👩\u200d🚀|🧑\u200d🚀/u, "🧑‍🚀"], [/👨\u200d🚒|👩\u200d🚒|🧑\u200d🚒/u, "🧑‍🚒"],
    [/👮\u200d♂️|👮\u200d♀️|👮/u, "👮"], [/🕵\u200d♂️|🕵\u200d♀️|🕵/u, "🕵"], [/👷\u200d♂️|👷\u200d♀️|👷/u, "👷"],
    [/🤴|👸|🫅/u, "🫅"], [/🎅|🤶|🧑\u200d🎄/u, "🧑‍🎄"], [/👳\u200d♂️|👳\u200d♀️|👳/u, "👳"],
  ];
  let base = Array.from(cluster).filter(ch => !SKIN.test(ch)).join("");
  for (const [re, rep] of rules) base = base.replace(re, rep);
  return base;
}

// Person activities (gendered → neutral)
function neutralizePersonActivity(cluster) {
  const rules = [
    [/🚶\u200d♂️|🚶\u200d♀️|🚶/u, "🚶"], [/🏃\u200d♂️|🏃\u200d♀️|🏃/u, "🏃"], [/🧎\u200d♂️|🧎\u200d♀️|🧎/u, "🧎"],
    [/🧍\u200d♂️|🧍\u200d♀️|🧍/u, "🧍"], [/🙇\u200d♂️|🙇\u200d♀️|🙇/u, "🙇"], [/💁\u200d♂️|💁\u200d♀️|💁/u, "💁"],
    [/🙋\u200d♂️|🙋\u200d♀️|🙋/u, "🙋"], [/🙆\u200d♂️|🙆\u200d♀️|🙆/u, "🙆"], [/🙅\u200d♂️|🙅\u200d♀️|🙅/u, "🙅"],
    [/🤦\u200d♂️|🤦\u200d♀️|🤦/u, "🤦"], [/🤷\u200d♂️|🤷\u200d♀️|🤷/u, "🤷"],
    [/🕺|💃/u, "🕺"], [/🚴\u200d♂️|🚴\u200d♀️|🚴/u, "🚴"], [/🚵\u200d♂️|🚵\u200d♀️|🚵/u, "🚵"],
    [/🏋️\u200d♂️|🏋️\u200d♀️|🏋️/u, "🏋️"], [/🏌️\u200d♂️|🏌️\u200d♀️|🏌️/u, "🏌️"],
    [/🏄|🏄\u200d♂️|🏄\u200d♀️/u, "🏄"], [/🏊|🏊\u200d♂️|🏊\u200d♀️/u, "🏊"],
    [/🚣|🚣\u200d♂️|🚣\u200d♀️/u, "🚣"], [/⛹️\u200d♂️|⛹️\u200d♀️|⛹️/u, "⛹️"],
    [/🤸\u200d♂️|🤸\u200d♀️|🤸/u, "🤸"], [/🤾\u200d♂️|🤾\u200d♀️|🤾/u, "🤾"], [/🤽\u200d♂️|🤽\u200d♀️|🤽/u, "🤽"],
  ];
  let base = Array.from(cluster).filter(ch => !SKIN.test(ch)).join("");
  for (const [re, rep] of rules) base = base.replace(re, rep);
  return base;
}

// Couples & family collapse
function neutralizeCoupleFamily(cluster) {
  const rules = [
    [/💏/u, "💏"], [/💑/u, "💑"], // couples
    // families → generic family (Fluent often uses one folder)
    [/👨\u200d👩\u200d👧\u200d👦|👨\u200d👩\u200d👧|👨\u200d👩\u200d👦|👪/u, "👪"],
    // people holding hands variants → neutral
    [/👬|👭|👫|🧑\u200d🤝\u200d🧑/u, "🧑‍🤝‍🧑"]
  ];
  let base = Array.from(cluster).filter(ch => !SKIN.test(ch)).join("");
  for (const [re, rep] of rules) base = base.replace(re, rep);
  return base;
}

// Hearts, keycaps, flags, special symbols
function normalizeSpecials(cluster) {
  // hearts
  const hearts = [
    [/❤️\u200d🔥|❤️‍🔥/u, "Heart on Fire"],
    [/❤️\u200d🩹|❤️‍🩹/u, "Mending Heart"],
    [/❤️/u, "Red Heart"], [/🩷/u, "Pink Heart"], [/🩵/u, "Light Blue Heart"],
    [/🖤/u, "Black Heart"], [/💙/u, "Blue Heart"], [/💚/u, "Green Heart"],
    [/💛/u, "Yellow Heart"], [/🧡/u, "Orange Heart"], [/💜/u, "Purple Heart"],
    [/🤍/u, "White Heart"], [/🤎/u, "Brown Heart"], [/💘/u, "Heart with Arrow"]
  ];
  for (const [re, name] of hearts) if (re.test(cluster)) return { kind: "folder", value: name };

  // keycaps (#, *, digits 0-9)
  const keycapMap = { "#️⃣": "Keycap #", "*️⃣": "Keycap *", "0️⃣": "Keycap 0", "1️⃣": "Keycap 1", "2️⃣": "Keycap 2", "3️⃣": "Keycap 3", "4️⃣": "Keycap 4", "5️⃣": "Keycap 5", "6️⃣": "Keycap 6", "7️⃣": "Keycap 7", "8️⃣": "Keycap 8", "9️⃣": "Keycap 9" };
  if (keycapMap[cluster]) return { kind: "folder", value: keycapMap[cluster] };

  // pirate flag + transgender
  if (/🏴\u200d☠️|🏴‍☠️/u.test(cluster)) return { kind: "folder", value: "Pirate Flag" };
  if (/🏳️\u200d⚧️|🏳‍⚧️/u.test(cluster)) return { kind: "folder", value: "Transgender Flag" };

  // Regional indicator flags → country name (English)
  const code = flagToRegionCode(cluster);
  if (code) {
    const name = regionCodeToEnglishName(code);
    if (name) return { kind: "flag", value: name }; // search “<country>” folder
  }

  return { kind: "none", value: null };
}
function flagToRegionCode(emoji) {
  // Two Regional Indicator Symbols map to A–Z
  const A = 0x1f1e6;
  const codePoints = Array.from(emoji).map(ch => ch.codePointAt(0));
  if (codePoints.length === 2 && codePoints.every(cp => cp >= A && cp <= 0x1f1ff)) {
    const cc = String.fromCharCode(codePoints[0] - A + 65) + String.fromCharCode(codePoints[1] - A + 65);
    return cc;
  }
  return null;
}
function regionCodeToEnglishName(code) {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(code) || null;
  } catch {
    return null;
  }
}

// ---------- curated folder dictionaries ----------

// (1) Roles/professions
const ROLE_FOLDER = {
  "👮": "Police officer", "🕵": "Detective", "👷": "Construction worker",
  "🧑‍⚕️": "Health worker", "🧑‍🎓": "Student", "🧑‍🏫": "Teacher",
  "🧑‍⚖️": "Judge", "🧑‍🌾": "Farmer", "🧑‍🍳": "Cook",
  "🧑‍🔧": "Mechanic", "🧑‍🏭": "Factory worker", "🧑‍💼": "Office worker",
  "🧑‍🔬": "Scientist", "🧑‍💻": "Technologist", "🧑‍🎤": "Singer",
  "🧑‍🎨": "Artist", "🧑‍✈️": "Pilot", "🧑‍🚀": "Astronaut",
  "🧑‍🚒": "Firefighter",
  "🦸": "Superhero", "🦹": "Supervillain",
  "🧙": "Mage", "🧛": "Vampire", "🧟": "Zombie", "🧜": "Merperson",
  "🧝": "Elf", "🧚": "Fairy", "🧞": "Genie",
  "🧑‍🎄": "Mx Claus", "🫅": "Person with Crown", "👳": "Person wearing Turban",
  // UI / frequently used
  "❎": "Cross Mark Button", "😞": "Disappointed Face", "💏": "Kiss", "💑": "Couple with Heart", "👪": "Family", "🧑‍🤝‍🧑": "People holding hands"
};

// (2) Person activities
const PERSON_ACTION_FOLDER = {
  "🚶": "Person walking", "🏃": "Person running", "🧎": "Person kneeling", "🧍": "Person standing",
  "🙇": "Person bowing", "💁": "Person tipping hand", "🙋": "Person raising hand",
  "🙆": "Person gesturing OK", "🙅": "Person gesturing NO", "🤦": "Person facepalming", "🤷": "Person shrugging",
  "🕺": "Man dancing",
  "🚴": "Person biking", "🚵": "Person mountain biking",
  "🏋️": "Person lifting weights", "🏌️": "Person golfing", "🏄": "Person surfing", "🏊": "Person swimming",
  "🚣": "Person rowing boat", "⛹️": "Person bouncing ball", "🤸": "Person cartwheeling", "🤾": "Person playing handball", "🤽": "Person playing water polo"
};

// (3) Gestures & hands (neutralized tones)
const GESTURE_FOLDER = {
  "👍": "Thumbs Up", "👎": "Thumbs Down", "👏": "Clapping Hands", "🙏": "Folded Hands", "👌": "OK Hand",
  "✌️": "Victory Hand", "🤞": "Crossed Fingers", "🤟": "Love-You Gesture", "🤘": "Sign of the Horns",
  "🤙": "Call Me Hand", "👋": "Waving Hand", "🤚": "Raised Back of Hand", "✋": "Raised Hand",
  "🖐️": "Hand with Fingers Splayed", "🖖": "Vulcan Salute", "👊": "Oncoming Fist",
  "🤛": "Left-Facing Fist", "🤜": "Right-Facing Fist", "✍️": "Writing Hand", "💅": "Nail Polish"
};

// NOTE: “faces” (😀…🥹🤬, etc.) and most other categories map well via CLDR fuzzy names;
// we rely on the CLDR lookup + fuzzy match for those to avoid a 1000-item manual map.

// -------- index Fluent folders for fuzzy matching --------
let FLUENT_FOLDERS = [];
function indexFluentOnce() {
  if (FLUENT_FOLDERS.length) return;
  FLUENT_FOLDERS = glob.sync(path.join(FLUENT_DIR, "*"), { absolute: true, nodir: false })
    .filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory())
    .map(p => ({ path: p, name: path.basename(p), key: path.basename(p).toLowerCase() }));
}
function pickStyleFile(folderPath) {
  for (const style of STYLE_PREF) {
    const match = glob.sync(path.join(folderPath, style, "*.svg"), { absolute: true, nodir: true });
    if (match.length) return match[0];
  }
  return null;
}
function scoreName(folderKey, candidates) {
  let score = 0;
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    if (folderKey === c) score += 6;
    if (folderKey.includes(c)) score += 4;
    const ft = folderKey.split(/[\s\-\_]+/);
    const ct = c.split(/[\s\-\_]+/);
    const common = ct.filter(t => ft.includes(t)).length;
    score += common;
  }
  return score;
}
function fuzzyFindFolder(candidates) {
  indexFluentOnce();
  let best = null, bestScore = 0;
  for (const f of FLUENT_FOLDERS) {
    const s = scoreName(f.key, candidates);
    if (s > bestScore) { best = f; bestScore = s; }
  }
  return best && bestScore > 0 ? best.path : null;
}
function cldrCandidates(emoji, base) {
  const meta = CLDR[emoji] || CLDR[base] || {};
  const names = [meta.slug, meta.name, meta.short_name].filter(Boolean).map(String);
  const toks = new Set();
  names.forEach(n => {
    const pretty = n.replace(/_/g, " ").replace(/:/g, "").trim();
    if (pretty) {
      toks.add(pretty);
      toks.add(pretty.replace(/\b(man|woman|men|women|male|female)\b/gi, "person").trim());
    }
  });
  return Array.from(toks).filter(Boolean);
}

// -------- copy logic --------
async function copyFromFolder(folderPath, dest) {
  const file = pickStyleFile(folderPath);
  if (!file) return false;
  await fse.ensureDir(path.dirname(dest));
  await fse.copy(file, dest, { overwrite: true });
  return true;
}

async function copyCluster(cluster) {
  const hex = toHex(cluster);
  const dest = path.join(OUT_DIR, `${hex}.svg`);
  if (fs.existsSync(dest)) return { cluster, hex, copied: true, existed: true };

  // curated cohorts
  const baseRole = neutralizeProfession(cluster);
  const baseAct  = neutralizePersonActivity(cluster);
  const baseFam  = neutralizeCoupleFamily(cluster);
  const specials = normalizeSpecials(cluster);

  const curatedName =
    ROLE_FOLDER[baseRole] || ROLE_FOLDER[cluster] ||
    PERSON_ACTION_FOLDER[baseAct] || PERSON_ACTION_FOLDER[cluster] ||
    GESTURE_FOLDER[Array.from(cluster).filter(ch => !SKIN.test(ch)).join("")] ||
    (specials.kind === "folder" ? specials.value : null);

  if (curatedName) {
    indexFluentOnce();
    const folder = FLUENT_FOLDERS.find(f => f.name.toLowerCase() === curatedName.toLowerCase())
              || FLUENT_FOLDERS.find(f => f.key.includes(curatedName.toLowerCase()));
    if (folder && await copyFromFolder(folder.path, dest)) {
      return { cluster, hex, copied: true, existed: false, via: "curated" };
    }
  }

  // flags by country name
  if (specials.kind === "flag" && specials.value) {
    indexFluentOnce();
    const name = specials.value.toLowerCase();
    const folder = FLUENT_FOLDERS.find(f => f.key.includes(name)) || FLUENT_FOLDERS.find(f => f.key.includes(`flag ${name}`));
    if (folder && await copyFromFolder(folder.path, dest)) {
      return { cluster, hex, copied: true, existed: false, via: "flag" };
    }
  }

  // CLDR fuzzy (catch-all)
  const cands = [
    ...cldrCandidates(cluster, baseRole),
    ...cldrCandidates(cluster, baseAct),
    ...cldrCandidates(cluster, baseFam),
    baseRole, baseAct, baseFam
  ].filter(Boolean);
  const folder = fuzzyFindFolder(cands);
  if (folder && await copyFromFolder(folder, dest)) {
    return { cluster, hex, copied: true, existed: false, via: "fuzzy" };
  }

  // give up → runtime native fallback
  return { cluster, hex, copied: false, existed: false };
}

// Optional: copy one asset per Fluent folder (large safety net)
async function copyAllFluentAssets() {
  indexFluentOnce();
  let copied = 0;
  for (const f of FLUENT_FOLDERS) {
    const file = pickStyleFile(f.path);
    if (!file) continue;
    const nameHex = f.name.toLowerCase().replace(/\s+/g, "-");
    const dest = path.join(OUT_DIR, `${nameHex}.svg`);
    try { await fse.copy(file, dest, { overwrite: false }); copied++; } catch {}
  }
  console.log(`FULL SYNC staged ${copied} generic assets as name-based fallbacks`);
}

// Gather all clusters from movies
async function readOutputs() {
  const raw = await fsp.readFile(MOVIES_JSON, "utf8");
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : Object.values(data);
  const set = new Set();
  for (const item of items) {
    const s = item && item.output ? String(item.output) : "";
    for (const c of splitGraphemesStr(s)) set.add(c);
  }
  return Array.from(set);
}

async function run() {
  if (!fs.existsSync(FLUENT_DIR)) {
    console.log(`Fluent UI Emoji assets not found at ${FLUENT_DIR}. Skipping copy (native fallback kicks in).`);
    return;
  }
  await fse.ensureDir(OUT_DIR);

  if (FULL_SYNC) await copyAllFluentAssets();

  const clusters = await readOutputs();
  const results = [];
  for (const c of clusters) results.push(await copyCluster(c));

  const copied = results.filter(r => r.copied).length;
  const missing = results.filter(r => !r.copied).map(r => `${r.cluster} (${r.hex})`);
  console.log(`sync-fluent-emoji: clusters=${clusters.length}, copied=${copied}, missing=${missing.length}`);
  if (missing.length) {
    console.log("Missing (native fallback will render these):");
    console.log(missing.join("  "));
  }
}
run().catch(e => { console.error(e); process.exit(1); });
