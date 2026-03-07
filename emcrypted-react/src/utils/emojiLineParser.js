import { splitGraphemes } from "./graphemes";

const EMOJI_CLUSTER_REGEX = /[\p{Extended_Pictographic}\u200d\uFE0F\u20E3]/u;

const isEmojiCluster = (cluster) => EMOJI_CLUSTER_REGEX.test(cluster || "");

export const parseEmojiPrefixedLine = (line) => {
  const sanitized = String(line || "").replace(/^•\s*/, "").trim();
  if (!sanitized) {
    return {
      emojiClusters: [],
      emojiText: "",
      description: "",
    };
  }

  const splitMatch = sanitized.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  const emojiSource = splitMatch ? splitMatch[1].trim() : sanitized;
  const emojiClusters = splitGraphemes(emojiSource).filter(isEmojiCluster);

  let description = splitMatch ? splitMatch[2].trim() : sanitized;

  if (!splitMatch && emojiClusters.length) {
    const emojiPrefix = emojiClusters.join("");
    if (sanitized.startsWith(emojiPrefix)) {
      const remainder = sanitized
        .slice(emojiPrefix.length)
        .replace(/^\s*[-–—]?\s*/, "")
        .trim();
      if (remainder) {
        description = remainder;
      }
    }
  }

  return {
    emojiClusters,
    emojiText: emojiClusters.join(""),
    description: description || sanitized,
  };
};
