/* eslint-disable */
import { splitEmojiClusters } from "./emojiSegment";

export function extractHintEmojiString(hintLine) {
  if (!hintLine) return "";
  const idx = hintLine.indexOf(" - ");
  const lhs = idx >= 0 ? hintLine.slice(0, idx) : hintLine;
  return lhs.replace(/^\s*\d+\.\s*/, "").trim();
}

export function indicesForHint(hintLine, puzzleOutput) {
  const target = extractHintEmojiString(hintLine);
  const targetClusters = splitEmojiClusters(target);
  const seqClusters = splitEmojiClusters(puzzleOutput);

  const indices = [];
  targetClusters.forEach((tc) => {
    seqClusters.forEach((sc, i) => {
      if (sc === tc) {
        indices.push(i);
      }
    });
  });

  return { indices, total: seqClusters.length };
}
