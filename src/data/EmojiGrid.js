import React, { useMemo } from "react";
import EmojiIcon from "../components/EmojiIcon";
import { splitEmojiClusters } from "../utils/emojiSegment";

const EmojiGrid = ({ emojiSequence, highlightedEmojis = [], dimmedEmojis = [] }) => {
  const clusters = useMemo(() => splitEmojiClusters(emojiSequence), [emojiSequence]);
  const highlightedSet = useMemo(() => new Set(highlightedEmojis), [highlightedEmojis]);
  const dimmedSet = useMemo(() => new Set(dimmedEmojis), [dimmedEmojis]);
  const shouldDimOthers = dimmedSet.size > 0;

  return (
    <div className={`emoji-grid ${shouldDimOthers ? "dim-others" : ""}`.trim()}>
      {clusters.map((emoji, index) => {
        const isHighlighted = highlightedSet.has(index);
        const isDimmed = dimmedSet.has(index);
        const extraClasses = [
          isHighlighted ? "highlighted" : "",
          isDimmed ? "dimmed" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <EmojiIcon
            key={`${emoji}-${index}`}
            char={emoji}
            size={44}
            className={extraClasses}
          />
        );
      })}
    </div>
  );
};

export default EmojiGrid;
