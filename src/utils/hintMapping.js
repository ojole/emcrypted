/* eslint-disable */
import { splitEmojiClusters } from "./emojiSegment";

/** "1. 🏹 - ..." → "🏹" */
export function extractHintEmojiString(hintLine) {
  if (!hintLine) return "";
  const idx = hintLine.indexOf(" - ");
  const lhs = idx >= 0 ? hintLine.slice(0, idx) : hintLine;
  return lhs.replace(/^\s*\d+\.\s*/, "").trim();
}

function findContiguousRun(seqClusters, targetClusters) {
  const n = seqClusters.length, m = targetClusters.length;
  if (!m || m > n) return null;
  for (let i = 0; i <= n - m; i++) {
    let ok = true;
    for (let j = 0; j < m; j++) {
      if (seqClusters[i + j] !== targetClusters[j]) { ok = false; break; }
    }
    if (ok) return Array.from({ length: m }, (_, k) => i + k);
  }
  return null;
}

function findOrderedNonContiguous(seqClusters, targetClusters) {
  const out = [];
  let last = -1;
  for (const t of targetClusters) {
    const i = seqClusters.findIndex((s, idx) => idx > last && s === t);
    if (i === -1) { return []; } // give up if any piece is missing
    out.push(i);
    last = i;
  }
  return out;
}

/**
 * Return indices to highlight for a given hint line.
 * Strategy:
 *   1) Prefer the first CONTIGUOUS run that matches the hint sequence.
 *   2) If none exists, fall back to the first ORDERED, NON-CONTIGUOUS match.
 */
export function indicesForHint(hintLine, puzzleOutput) {
  const target = extractHintEmojiString(hintLine);
  const targetClusters = splitEmojiClusters(target);
  const seqClusters = splitEmojiClusters(puzzleOutput);

  if (!targetClusters.length) return { indices: [], total: seqClusters.length };

  const contiguous = findContiguousRun(seqClusters, targetClusters);
  if (contiguous && contiguous.length) {
    return { indices: contiguous, total: seqClusters.length };
  }

  const ordered = findOrderedNonContiguous(seqClusters, targetClusters);
  return { indices: ordered, total: seqClusters.length };
}
