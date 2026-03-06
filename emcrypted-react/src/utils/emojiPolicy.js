import { splitGraphemes } from "./graphemes.js";

/**
 * Central emoji normalization rules for rendering in:
 *  - Game board grid
 *  - Hint dropdown / highlighted hint sequence
 *  - VictoryScreen breakdown
 *  - BetterLuckNextTimeScreen breakdown
 *
 * We sanitize clusters and map them to *Fluent-supported* assets only.
 *
 * Rules recap:
 *  - FAMILY-style clusters -> Busts in silhouette (neutral group)
 *  - HOLDING-HANDS / COUPLES -> Handshake
 *  - Unsupported country flags -> skip entirely
 *  - Known good flags -> allowed
 *  - Anchor -> force Fluent anchor asset
 */

const BUSTS_HEX = "1f465"; // Busts in silhouette U+1F465
const BUSTS_ASSET = "/vendor/fluent-emoji/1f465.svg";

const HANDSHAKE_HEX = "1f91d"; // Handshake U+1F91D
const HANDSHAKE_ASSET = "/vendor/fluent-emoji/1f91d.svg";

const HUGGING_HEX = "1fac2"; // People Hugging U+1FAC2
const HUGGING_ASSET = "/vendor/fluent-emoji/1fac2.svg";

/**
 * FAMILY_CLUSTERS:
 * These are "family / parent-child / family group" style emojis.
 * We collapse ALL of them to the neutral "Busts in silhouette".
 * Includes multi-person parent/kid combos, mixed-gender families, etc.
 */
const FAMILY_CLUSTERS = new Set([
  "👨‍👦",
  "👨‍👧",
  "👨‍👧‍👦",
  "👨‍👦‍👦",
  "👨‍👧‍👧",
  "👩‍👦",
  "👩‍👧",
  "👩‍👧‍👦",
  "👩‍👦‍👦",
  "👩‍👧‍👧",
  "👨‍👩‍👦",
  "👨‍👩‍👧",
  "👨‍👩‍👧‍👦",
  "👨‍👩‍👦‍👦",
  "👨‍👩‍👧‍👧",
  "👨‍👨‍👦",
  "👨‍👨‍👧",
  "👩‍👩‍👦",
  "👩‍👩‍👧",
  // Generic "busts" / "group silhouette" also treated as 'group of people'
  "👥",
  // Base family emoji (no gender ZWJ chain)
  "👪",
]);

/**
 * HOLDING_HANDS_CLUSTERS:
 * These represent "people holding hands / couple holding hands".
 * We'll normalize ALL of them to 🤝 Handshake for a neutral togetherness vibe.
 * Includes gendered pairs (👬, 👭, 👫) and 🧑‍🤝‍🧑 etc. (all tone variants).
 */
const HOLDING_HANDS_CLUSTERS = new Set([
  "🧑‍🤝‍🧑",
  "👬",
  "👭",
  "👫",
  // Common skin tone variants for 👬/👭/👫 are multiple codepoints; we'll
  // catch them by prefix check below if needed. The base ones listed above
  // are the most typical clusters we see in puzzle data.
]);

/**
 * ROMANTIC_COUPLE_CLUSTERS:
 * These are "couple with heart" romantic emojis.
 * We normalize these to 🫂 People Hugging for a neutral romantic/affectionate vibe.
 * This is DIFFERENT from holding hands (which uses handshake).
 */
const ROMANTIC_COUPLE_CLUSTERS = new Set([
  "💑",        // couple with heart
  "👩‍❤️‍👨",  // woman, heart, man
  "👨‍❤️‍👨",  // man, heart, man
  "👩‍❤️‍👩",  // woman, heart, woman
]);

/**
 * TRAVEL_OBJECT_FALLBACKS:
 * These are single-codepoint (or single-cluster) emojis from Travel & Places / Objects
 * that sometimes come through without assets after compile. We hardwire them here.
 * Verified actual filenames in /public/vendor/fluent-emoji.
 */
const ANCHOR_HEX = "2693";
const ANCHOR_ASSET = "/vendor/fluent-emoji/2693.svg";

const SAILBOAT_HEX = "26f5";
const SAILBOAT_ASSET = "/vendor/fluent-emoji/26f5.svg";

const HOURGLASS_HEX = "231b";       // ⌛ hourglass done
const HOURGLASS_ASSET = "/vendor/fluent-emoji/231b.svg";

const HOURGLASS_HEX_2 = "23f3";     // ⏳ hourglass not done
const HOURGLASS_ASSET_2 = "/vendor/fluent-emoji/23f3.svg";

const SNOWMAN_HEX = "2603";         // ☃ snowman
const SNOWMAN_ASSET = "/vendor/fluent-emoji/2603.svg";

const STAR_HEX = "2b50";            // ⭐ star
const STAR_ASSET = "/vendor/fluent-emoji/2b50.svg";

const CHURCH_HEX = "26ea";          // ⛪ church
const CHURCH_ASSET = "/vendor/fluent-emoji/26ea.svg";

const SOCCER_HEX = "26bd";          // ⚽ soccer ball
const SOCCER_ASSET = "/vendor/fluent-emoji/26bd.svg";

const BLACK_SQUARE_HEX = "2b1b";    // ⬛ black large square
const BLACK_SQUARE_ASSET = "/vendor/fluent-emoji/2b1b.svg";

const RIGHT_ARROW_HEX = "27a1";     // ➡ right arrow
const RIGHT_ARROW_ASSET = "/vendor/fluent-emoji/27a1.svg";
const TONE_REGEX = /[\u{1F3FB}-\u{1F3FF}]/u;

const toHex = (cluster) =>
  Array.from(String(cluster || ""))
    .map((char) => char.codePointAt(0).toString(16))
    .join("-");

const TRAVEL_OBJECT_FALLBACKS = {
  "⚓":  { asset: ANCHOR_ASSET,       hex: ANCHOR_HEX,        hasTone: false },
  "⚓️": { asset: ANCHOR_ASSET,       hex: ANCHOR_HEX,        hasTone: false },
  "⛵":  { asset: SAILBOAT_ASSET,     hex: SAILBOAT_HEX,      hasTone: false },
  "⛵️": { asset: SAILBOAT_ASSET,     hex: SAILBOAT_HEX,      hasTone: false },
  "⌛":  { asset: HOURGLASS_ASSET,    hex: HOURGLASS_HEX,     hasTone: false },
  "⌛️": { asset: HOURGLASS_ASSET,    hex: HOURGLASS_HEX,     hasTone: false },
  "⏳":  { asset: HOURGLASS_ASSET_2,  hex: HOURGLASS_HEX_2,   hasTone: false },
  "⏳️": { asset: HOURGLASS_ASSET_2,  hex: HOURGLASS_HEX_2,   hasTone: false },
  "☃":  { asset: SNOWMAN_ASSET,      hex: SNOWMAN_HEX,       hasTone: false },
  "☃️": { asset: SNOWMAN_ASSET,      hex: SNOWMAN_HEX,       hasTone: false },
  "⭐":  { asset: STAR_ASSET,         hex: STAR_HEX,          hasTone: false },
  "⭐️": { asset: STAR_ASSET,         hex: STAR_HEX,          hasTone: false },
  "⛪":  { asset: CHURCH_ASSET,       hex: CHURCH_HEX,        hasTone: false },
  "⛪️": { asset: CHURCH_ASSET,       hex: CHURCH_HEX,        hasTone: false },
  "⚽":  { asset: SOCCER_ASSET,       hex: SOCCER_HEX,        hasTone: false },
  "⚽️": { asset: SOCCER_ASSET,       hex: SOCCER_HEX,        hasTone: false },
};

/**
 * SHAPES_AND_UI_FALLBACKS:
 * Geometric shapes and UI elements that sometimes don't compile correctly.
 * This prevents asset reuse bugs (e.g., ➡️⬛️ showing two arrows).
 */
const SHAPES_AND_UI_FALLBACKS = {
  "⬛":  { asset: BLACK_SQUARE_ASSET, hex: BLACK_SQUARE_HEX, hasTone: false },
  "⬛️": { asset: BLACK_SQUARE_ASSET, hex: BLACK_SQUARE_HEX, hasTone: false },
  "➡":  { asset: RIGHT_ARROW_ASSET,  hex: RIGHT_ARROW_HEX,  hasTone: false },
  "➡️": { asset: RIGHT_ARROW_ASSET,  hex: RIGHT_ARROW_HEX,  hasTone: false },
};

/**
 * Return true if this cluster is ANY flag (country, pride, pirate, etc.).
 * We now hide ALL flags, not just country flags.
 */
function isAnyFlag(cluster) {
  // Country flags: 2 Regional Indicator Symbols
  const codepoints = Array.from(cluster).map(ch => ch.codePointAt(0));
  if (
    codepoints.length === 2 &&
    codepoints.every(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF)
  ) {
    return true;
  }

  // Known flag bases and combinations
  const flagPatterns = [
    "🏁",         // chequered flag
    "🚩",         // triangular flag
    "🎌",         // crossed flags
    "🏴",         // black flag
    "🏳",         // white flag
    "🏳️",        // white flag with VS16
    "🏳️‍🌈",      // rainbow pride flag
    "🏳️‍⚧️",     // trans flag
    "🏴‍☠️",      // pirate flag
  ];

  for (const pattern of flagPatterns) {
    if (cluster.includes(pattern)) return true;
  }

  return false;
}

/**
 * Return true if this cluster is a keycap digit (e.g., "5⃣").
 * These are digit + variation selector + combining enclosing keycap.
 */
function isKeycapDigit(cluster) {
  // Keycap pattern: digit/char + FE0F (optional) + 20E3 (combining enclosing keycap)
  return cluster.includes("\u20E3");
}

/**
 * Return true if this is a weird unsupported symbol we don't want to render.
 * Example: "⛼" which shows as a broken tile.
 */
function isWeirdUnsupportedSymbol(cluster) {
  return cluster === "⛼";
}

/**
 * Given a grapheme cluster:
 *  - return a forced override token object if we have one
 *  - return null to SKIP rendering (for flags, keycap digits)
 *  - return undefined if we should fall back to compiled token
 */
function policyOverrideForCluster(cluster) {
  // 1. Family group => busts-in-silhouette
  if (FAMILY_CLUSTERS.has(cluster)) {
    return {
      asset: BUSTS_ASSET,
      hex: BUSTS_HEX,
      hasTone: false,
      cluster, // include original for highlighting
      _policy: "family->busts",
    };
  }

  // 2. Romantic couples with heart => people hugging
  //    Direct exact match or contains heart connector:
  if (ROMANTIC_COUPLE_CLUSTERS.has(cluster) || cluster.includes("‍❤️‍")) {
    return {
      asset: HUGGING_ASSET,
      hex: HUGGING_HEX,
      hasTone: false,
      cluster, // include original for highlighting
      _policy: "romance->hugging",
    };
  }

  // 3. Holding-hands couples => handshake
  //    Direct exact match:
  if (HOLDING_HANDS_CLUSTERS.has(cluster)) {
    return {
      asset: HANDSHAKE_ASSET,
      hex: HANDSHAKE_HEX,
      hasTone: false,
      cluster, // include original for highlighting
      _policy: "holdinghands->handshake",
    };
  }
  //    Also catch variants where cluster starts with those base emojis
  //    (to catch skin tone ZWJ forms, like 👩🏽‍🤝‍👩🏼 etc.).
  for (const base of HOLDING_HANDS_CLUSTERS) {
    if (cluster.startsWith(base)) {
      return {
        asset: HANDSHAKE_ASSET,
        hex: HANDSHAKE_HEX,
        hasTone: false,
        cluster, // include original for highlighting
        _policy: "holdinghands->handshake",
      };
    }
  }

  // 4. ALL flags => skip entirely (hide them)
  if (isAnyFlag(cluster)) {
    return null;
  }

  // 5. Keycap digits like "5⃣" => skip entirely
  if (isKeycapDigit(cluster)) {
    return null;
  }

  // 6. Weird unsupported symbols like "⛼" => skip entirely
  if (isWeirdUnsupportedSymbol(cluster)) {
    return null;
  }

  // 7. Travel/Object fallback (anchor, sailboat, hourglass, snowman, star, church, soccer)
  if (TRAVEL_OBJECT_FALLBACKS[cluster]) {
    const fb = TRAVEL_OBJECT_FALLBACKS[cluster];
    return {
      asset: fb.asset,
      hex: fb.hex,
      hasTone: fb.hasTone,
      cluster, // include original for highlighting
      _policy: "travel-object-fallback",
    };
  }

  // 8. Shapes/UI fallback (black square, right arrow, etc.)
  if (SHAPES_AND_UI_FALLBACKS[cluster]) {
    const fb = SHAPES_AND_UI_FALLBACKS[cluster];
    return {
      asset: fb.asset,
      hex: fb.hex,
      hasTone: fb.hasTone,
      cluster, // include original for highlighting
      _policy: "shape-ui-fallback",
    };
  }

  // 9. Default: no special override
  return undefined;
}


/**
 * Fix broken ZWJ combos where unrelated emojis got incorrectly merged.
 * For example, "🚗‍🏃‍♂️" (car + runner) should be split into ["🚗", "🏃‍♂️"].
 * Returns an array of clusters (usually just [cluster], but may split if broken).
 */
function fixBrokenZWJCombos(cluster) {
  // Specific case: car + runner
  if (cluster.includes("🚗") && cluster.includes("🏃")) {
    // Return as separate emojis
    return ["🚗", "🏃‍♂️"];
  }

  // Check for vehicle + person combos that shouldn't be merged
  const vehicleEmojiPattern = /[\u{1F695}-\u{1F6FC}]/u; // various vehicles
  const personEmojiPattern = /[\u{1F3C3}-\u{1F3CC}\u{1F6B6}]/u; // various people activities

  // If cluster contains both vehicle and person emoji, it's likely broken
  if (vehicleEmojiPattern.test(cluster) && personEmojiPattern.test(cluster)) {
    // Split by ZWJ and reconstruct proper clusters
    return splitGraphemes(cluster);
  }

  // Otherwise, return as-is
  return [cluster];
}

/**
 * getRenderableEmojiTokens
 *
 * Inputs:
 *   emojiClusters: Array<string>  // grapheme clusters from splitGraphemes()
 *   tokensByCluster: Map<string, {asset, hex, hexFull, hasTone, ...}>
 *
 * Output:
 *   Array<{ asset, hex, hasTone, cluster }>
 *   AFTER applying:
 *     - family -> busts silhouette
 *     - romantic couples -> people hugging
 *     - holding-hands -> handshake
 *     - all flags -> dropped
 *     - keycap digits -> dropped
 *     - travel/object fallbacks
 *     - everything else -> compiled Fluent token from tokensByCluster
 */
export function getRenderableEmojiTokens(emojiClusters, tokensByCluster) {
  const out = [];

  // Fix broken ZWJ combos first
  const normalizedClusters = emojiClusters.flatMap(fixBrokenZWJCombos);

  for (const cluster of normalizedClusters) {
    if (!cluster) continue;

    const overrideToken = policyOverrideForCluster(cluster);

    if (overrideToken === null) {
      // explicit "skip this cluster" (flags, keycap digits, etc.)
      continue;
    }

    if (overrideToken !== undefined) {
      // forced override (busts, hugging, handshake, travel/object)
      out.push({
        asset: overrideToken.asset,
        hex: overrideToken.hex,
        hasTone: overrideToken.hasTone,
        cluster: overrideToken.cluster || cluster, // ensure cluster is always present
        _policy: overrideToken._policy,
      });
      continue;
    }

    // otherwise, normal path
    if (tokensByCluster && tokensByCluster.has(cluster)) {
      const token = tokensByCluster.get(cluster);
      if (token && token.asset) {
        out.push({
          asset: token.asset,
          hex: token.hex || token.hexFull || "",
          hasTone: !!token.hasTone,
          cluster, // keep the original cluster for matching/highlighting
          _policy: "normal",
        });
        continue;
      }
    }

    // Direct hex fallback path so hints/breakdowns can still map to Fluent assets
    // even when the cluster wasn't in the puzzle output token list.
    const hex = toHex(cluster);
    if (hex) {
      out.push({
        asset: `/vendor/fluent-emoji/${hex}.svg`,
        hex,
        hasTone: TONE_REGEX.test(cluster),
        cluster,
        _policy: "direct-hex",
      });
    }
  }

  return out;
}
