import React, { forwardRef, useEffect, useState } from "react";
import EmojiIcon from "../utils/EmojiIcon";

const DEFAULT_COLS = 7;

const EmojiGrid = forwardRef(({ tokens = [], highlightedEmojis = [], dimmedEmojis = [] }, ref) => {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const highlightSet = new Set(highlightedEmojis);
  const dimSet = new Set(dimmedEmojis);
  const isDimming = dimSet.size > 0;
  const maxCols = viewportWidth <= 430 ? 5 : viewportWidth <= 640 ? 6 : DEFAULT_COLS;
  const iconSize = viewportWidth <= 640 ? 32 : 36;
  const cellSize = viewportWidth <= 430 ? 34 : viewportWidth <= 640 ? 35 : 38;
  const cellGap = viewportWidth <= 430 ? 4 : viewportWidth <= 640 ? 5 : 8;
  const columns = tokens.length
    ? Math.min(maxCols, Math.max(3, Math.ceil(Math.sqrt(tokens.length))))
    : maxCols;
  const gridClass = ["emoji-grid", isDimming ? "dim-others" : ""].filter(Boolean).join(" ");

  return (
    <div
      ref={ref}
      className={gridClass}
      style={{
        "--grid-cols": columns,
        "--emoji-render-size": `${iconSize}px`,
        "--emoji-cell-size": `${cellSize}px`,
        "--cell-gap": `${cellGap}px`,
      }}
    >
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
              size={iconSize}
            />
          </div>
        );
      })}
    </div>
  );
});

export default EmojiGrid;
