const hasSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function";
let segmenter;

function getSegmenter() {
  if (!hasSegmenter) return null;
  if (!segmenter) {
    try {
      segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    } catch (error) {
      segmenter = null;
    }
  }
  return segmenter;
}

const emojiLikePattern = /[\p{Extended_Pictographic}\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Component}]/u;
const regionalIndicatorPattern = /[\u{1F1E6}-\u{1F1FF}]/u;
const tonePattern = /[\u{1F3FB}-\u{1F3FF}]/u;
const joinerPattern = /[\u200D\uFE0F\uFE0E\u20E3]/u;
const keycapBasePattern = /[#*0-9]/;

function isEmojiCluster(cluster) {
  if (!cluster) return false;
  if (emojiLikePattern.test(cluster)) return true;
  if (regionalIndicatorPattern.test(cluster)) return true;
  if (tonePattern.test(cluster)) return true;
  if (joinerPattern.test(cluster)) return true;
  if (keycapBasePattern.test(cluster) && cluster.includes("\u20E3")) return true;
  return false;
}

export function splitEmojiClusters(str) {
  if (!str) return [];
  const source = String(str);
  const seg = getSegmenter();
  const clusters = [];

  if (seg && typeof seg.segment === "function") {
    for (const part of seg.segment(source)) {
      if (part && typeof part.segment === "string") {
        clusters.push(part.segment);
      }
    }
  } else {
    for (const char of Array.from(source)) {
      clusters.push(char);
    }
  }

  return clusters.filter(isEmojiCluster);
}

export default splitEmojiClusters;
