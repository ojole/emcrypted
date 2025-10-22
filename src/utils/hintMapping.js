/* eslint-disable */
import { splitEmojiClusters } from "./emojiSegment";

export function extractHintEmojiString(hintLine) {
  if (!hintLine) return "";
  const idx = hintLine.indexOf(" - ");
  const lhs = idx >= 0 ? hintLine.slice(0, idx) : hintLine;
  return lhs.replace(/^\s*\d+\.\s*/, "").trim();
}

export function extractHintDescription(hintLine) {
  if (!hintLine) return "";
  const idx = hintLine.indexOf(" - ");
  const rhs = idx >= 0 ? hintLine.slice(idx + 3) : hintLine;
  return rhs.trim();
}

export function indicesForHint(hintLine, puzzleOutput) {
  const target = extractHintEmojiString(hintLine);
  const targetClusters = splitEmojiClusters(target);
  const seqClusters = splitEmojiClusters(puzzleOutput);

  const total = seqClusters.length;
  if (!targetClusters.length || !total) {
    return { indices: [], total };
  }

  const contiguousMatch = (() => {
    const span = targetClusters.length;
    for (let start = 0; start <= total - span; start += 1) {
      let matches = true;
      for (let offset = 0; offset < span; offset += 1) {
        if (seqClusters[start + offset] !== targetClusters[offset]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return Array.from({ length: span }, (_, idx) => start + idx);
      }
    }
    return null;
  })();

  if (contiguousMatch) {
    return { indices: contiguousMatch, total };
  }

  const orderedMatch = (() => {
    const out = [];
    let searchStart = 0;
    for (const cluster of targetClusters) {
      let found = -1;
      for (let idx = searchStart; idx < total; idx += 1) {
        if (seqClusters[idx] === cluster) {
          found = idx;
          break;
        }
      }
      if (found === -1) {
        return null;
      }
      out.push(found);
      searchStart = found + 1;
    }
    return out;
  })();

  if (orderedMatch) {
    return { indices: orderedMatch, total };
  }

  const fallback = [];
  targetClusters.forEach((cluster) => {
    seqClusters.forEach((seqCluster, index) => {
      if (seqCluster === cluster) {
        fallback.push(index);
      }
    });
  });

  const deduped = Array.from(new Set(fallback));
  return { indices: deduped, total };
}
