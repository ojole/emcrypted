import React, { forwardRef } from "react";
import EmojiIcon from "../utils/EmojiIcon";

const DEFAULT_COLS = 7;

const EmojiGrid = forwardRef(({ tokens = [], highlightedEmojis = [], dimmedEmojis = [] }, ref) => {
  const highlightSet = new Set(highlightedEmojis);
  const dimSet = new Set(dimmedEmojis);
  const isDimming = dimSet.size > 0;
  const columns = tokens.length
    ? Math.min(DEFAULT_COLS, Math.max(3, Math.ceil(Math.sqrt(tokens.length))))
    : DEFAULT_COLS;
  const gridClass = ["emoji-grid", isDimming ? "dim-others" : ""].filter(Boolean).join(" ");

  return (
    <div ref={ref} className={gridClass} style={{ "--grid-cols": columns }}>
      {tokens.map((token, index) => {
        const highlighted = highlightSet.has(index);
        const dimmed = !highlighted && dimSet.has(index);
        const classes = ["emoji-item"];
        if (highlighted) classes.push("highlighted");
        if (dimmed) classes.push("dimmed");
        return (
          <div key={`${token.hex || token.cluster || index}-${index}`} className={classes.join(" ")}>
            <EmojiIcon
              asset={token.asset}
              cluster={token.cluster}
              hex={token.hex}
              hexFull={token.hexFull}
              hasTone={token.hasTone}
              size={40}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        );
      })}
    </div>
  );
});

export default EmojiGrid;
