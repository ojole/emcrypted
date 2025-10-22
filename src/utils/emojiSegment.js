/* eslint-disable */
const EMOJIISH = /[\p{Extended_Pictographic}\u200d\uFE0F]/u;
const FALLBACK_REGEX = /(\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?|\p{Emoji}\u200D(?:\p{Emoji}|\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?)|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji}\u200D[\p{Emoji}\u200D]*\p{Emoji})/gu;

class GraphemeSplitter {
  constructor() {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      this.segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    }
  }

  splitGraphemes(value) {
    const input = value || "";
    if (!input) return [];

    if (this.segmenter) {
      return Array.from(this.segmenter.segment(input), (segment) => segment.segment);
    }

    const fallbackMatches = input.match(FALLBACK_REGEX);
    if (fallbackMatches && fallbackMatches.length) {
      return fallbackMatches;
    }

    return Array.from(input);
  }
}

const splitter = new GraphemeSplitter();

export function splitEmojiClusters(str) {
  const clusters = splitter.splitGraphemes(str || "");
  return clusters.filter((cluster) => EMOJIISH.test(cluster));
}

export default splitEmojiClusters;
