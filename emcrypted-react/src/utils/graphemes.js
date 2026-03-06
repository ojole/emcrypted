const GraphemerModule = require("graphemer");

let segmenter;
let graphemer;

const ensureSegmenter = () => {
  if (!segmenter && typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    } catch (error) {
      segmenter = null;
    }
  }
  return segmenter;
};

const ensureGraphemer = () => {
  if (!graphemer) {
    const GraphemerClass =
      GraphemerModule?.Graphemer || GraphemerModule?.default || GraphemerModule;
    graphemer = new GraphemerClass();
  }
  return graphemer;
};

const splitGraphemes = (value) => {
  if (!value) return [];
  const input = typeof value === "string" ? value : String(value);
  const seg = ensureSegmenter();
  if (seg) {
    return Array.from(seg.segment(input), ({ segment }) => segment);
  }
  return ensureGraphemer().splitGraphemes(input);
};

module.exports = {
  splitGraphemes,
};
