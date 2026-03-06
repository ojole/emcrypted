// --- skin tone + human detection helpers ---

// These are the base "human-ish" starter codepoints we care about.
// Important: these are the ones we WANT to normalize to yellow when no tone was given.
const HUMAN_BASES = new Set([
  "1f466", // boy
  "1f467", // girl
  "1f468", // man
  "1f469", // woman
  "1f9d1", // person
  "1f474", // older man
  "1f475", // older woman
  "1f46e", // police officer
  "1f575", // detective / sleuth
  "1f482", // guard
  "1f3c3", // runner
  "1f3ca", // swimmer
  "1f6b6", // pedestrian / person walking
  "1f3c4", // surfer
  "1f3cb", // lifting weights / person lifting
  "1f9cd", // person kneeling
  "1f64e", // person pouting
  "1f471", // person: blond hair
  "1f476", // baby
  "1f477", // construction worker
  "1f478", // princess
  "1f473", // person wearing turban
  "1f472", // person with skullcap
  "1f9d4", // person: beard
  "1f9d5", // person with headscarf
  "1f9d6", // person in steamy room
  "1f9d7", // person climbing
  "1f9d8", // person in lotus position
  "1f9d9", // mage
  "1f9da", // fairy
  "1f9db", // vampire
  "1f9dc", // merperson
  "1f9dd", // elf
  "1f9de", // genie
  "1f9df", // zombie
  "1f486", // person getting massage
  "1f487", // person getting haircut
  "1f6a3", // person rowing boat
  "1f6b4", // person biking
  "1f6b5", // person mountain biking
  "1f938", // person cartwheeling
  "1f93d", // person playing water polo
  "1f93e", // person playing handball
  "1f939", // person juggling
  "1f6c0", // person taking bath
  "1f6cc", // person in bed
  "1f574", // person in suit levitating
  "1f483", // woman dancing
  "1f57a", // man dancing
  "1f385", // Santa Claus
  "1f936", // Mrs. Claus
  "1f9b8", // superhero
  "1f9b9", // supervillain
  "1f470", // person with veil
  "1f930", // pregnant woman
  "1f931", // breast-feeding
  "1f47c", // baby angel
  "1f934", // prince
  "1f935", // person in tuxedo
  "1f64d", // person frowning
  "1f645", // person gesturing NO
  "1f646", // person gesturing OK
  "1f481", // person tipping hand
  "1f64b", // person raising hand
  "1f9cf", // deaf person
  "1f647", // person bowing
  "1f926", // person facepalming
  "1f937", // person shrugging
]);

// Fitzpatrick tone modifiers (we only care about 1f3fb - 1f3ff)
const SKIN_TONES = new Set([
  "1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff",
]);

function splitHexToCodepoints(hexStr) {
  // "1f46e-200d-2642-fe0f" -> ["1f46e","200d","2642","fe0f"]
  return hexStr.toLowerCase().split("-").filter(Boolean);
}

function joinCodepoints(cpArr) {
  return cpArr.join("-");
}

function sequenceHasExplicitTone(cpArr) {
  return cpArr.some(cp => SKIN_TONES.has(cp));
}

function countHumanBases(cpArr) {
  return cpArr.filter(cp => HUMAN_BASES.has(cp)).length;
}

// Decide if we SHOULD force-yellow for this token.
function shouldNormalizeToYellow(cpArr, hasToneFromSource) {
  // If the puzzle explicitly specified a tone (🧑🏼 etc.), never override.
  if (hasToneFromSource) return false;

  // If the sequence itself already has 1f3fb-1f3ff baked in, don't override.
  if (sequenceHasExplicitTone(cpArr)) return false;

  const humanCount = countHumanBases(cpArr);

  // 0 humans? (💼, 💎, 🚓, 🎥, etc.) -> no
  if (humanCount === 0) return false;

  // More than 1 distinct human base (families, couples, etc.) -> skip.
  // We don't try to "yellow normalize" families or multiple-people clusters.
  if (humanCount > 1) return false;

  // Otherwise yes, this is like 👮‍♂️ / 🕵️‍♂️ / 🚶‍♀️ / 👴 etc with no tone,
  // and we want to force-yellow.
  return true;
}

// Inject LIGHT tone (1f3fb) in the right place.
// Rules:
// - Find first HUMAN_BASE in the sequence.
// - If the very next cp after that base is "fe0f", in toned emoji it usually
//   becomes the tone instead of fe0f. So replace that fe0f with "1f3fb".
// - Else just insert "1f3fb" immediately after the base.
// - Keep the rest (200d, gender selectors, etc.) as-is.
function injectLightTone(cpArrOriginal) {
  const LIGHT = "1f3fb";
  const arr = [...cpArrOriginal];
  const baseIdx = arr.findIndex(cp => HUMAN_BASES.has(cp));
  if (baseIdx === -1) return arr;

  const nextCp = arr[baseIdx + 1];

  if (nextCp && nextCp.toLowerCase() === "fe0f") {
    // Replace that fe0f with 1f3fb
    arr.splice(baseIdx + 1, 1, LIGHT);
  } else {
    // Insert LIGHT right after base
    arr.splice(baseIdx + 1, 0, LIGHT);
  }

  return arr;
}

module.exports = {
  HUMAN_BASES,
  SKIN_TONES,
  splitHexToCodepoints,
  joinCodepoints,
  sequenceHasExplicitTone,
  shouldNormalizeToYellow,
  injectLightTone,
  countHumanBases,
};
