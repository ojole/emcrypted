import React, { forwardRef, useEffect, useState } from "react";
import EmojiIcon from "../utils/EmojiIcon";

const DEFAULT_COLS = 7;

const EmojiGrid = forwardRef(
  ({ tokens = [], highlightedEmojis = [], dimmedEmojis = [], compactMode = false }, ref) => {
    const [viewport, setViewport] = useState(() => ({
      width: typeof window !== "undefined" ? window.innerWidth : 1024,
      height: typeof window !== "undefined" ? window.innerHeight : 900,
    }));

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const handleResize = () =>
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      window.addEventListener("resize", handleResize, { passive: true });
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const isEmbeddedCompactWidth = viewportWidth <= 760;
    const isVeryCompactWidth = viewportWidth <= 560;
    const isPhoneWidth = viewportWidth <= 430;
    const isNarrowWidth = viewportWidth <= 640;
    const isCompactHeight = viewportHeight <= 860;
    const isTightHeight = viewportHeight <= 760;
    const isUltraTightHeight = viewportHeight <= 680;

    const highlightSet = new Set(highlightedEmojis);
    const dimSet = new Set(dimmedEmojis);
    const isDimming = dimSet.size > 0;

    let iconSize = isPhoneWidth
      ? 26
      : isVeryCompactWidth
        ? 27
        : isNarrowWidth
          ? 29
          : isEmbeddedCompactWidth
            ? 31
            : 34;
    if (isCompactHeight) iconSize -= 1;
    if (isTightHeight) iconSize -= 1;
    if (isUltraTightHeight) iconSize -= 1;
    if (compactMode) iconSize -= isPhoneWidth ? 1 : 2;
    iconSize = Math.max(24, iconSize);

    const cellSize = iconSize + (isTightHeight ? 1 : 2);
    const cellGap = isPhoneWidth
      ? (isUltraTightHeight ? 2 : 3)
      : isNarrowWidth
        ? (isTightHeight ? 3 : 4)
        : isEmbeddedCompactWidth
          ? 5
          : 6;
    const maxColsByWidth = isPhoneWidth ? 7 : isNarrowWidth ? 8 : isEmbeddedCompactWidth ? 8 : DEFAULT_COLS;
    const minCols = isPhoneWidth ? 4 : 5;
    const targetRows = isUltraTightHeight ? 6 : isTightHeight ? 7 : isCompactHeight ? 8 : isEmbeddedCompactWidth ? 8 : 9;
    const desiredCols = tokens.length ? Math.ceil(tokens.length / targetRows) : maxColsByWidth;
    const columns = tokens.length
      ? Math.min(maxColsByWidth, Math.max(minCols, desiredCols))
      : maxColsByWidth;
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
  }
);

export default EmojiGrid;
