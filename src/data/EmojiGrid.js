import React, { useMemo } from "react";
import EmojiIcon from "../components/EmojiIcon";
import { splitEmojiClusters } from "../utils/emojiSegment";

const EmojiGrid = ({
  emojiSequence,
  highlightedEmojis = [],
  dimmedEmojis = [],
  hintActive = false,
}) => {
  const clusters = useMemo(() => splitEmojiClusters(emojiSequence), [emojiSequence]);
  const highlightedSet = useMemo(() => new Set(highlightedEmojis), [highlightedEmojis]);
  const dimmedSet = useMemo(() => new Set(dimmedEmojis), [dimmedEmojis]);
  const shouldDimOthers = dimmedSet.size > 0;
  const containerClasses = useMemo(() => {
    const classes = ["emoji-grid"];
    if (shouldDimOthers) classes.push("dim-others");
    if (hintActive) classes.push("hint-active");
    return classes.join(" ");
  }, [shouldDimOthers, hintActive]);

  return (
    <div className={containerClasses}>
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
