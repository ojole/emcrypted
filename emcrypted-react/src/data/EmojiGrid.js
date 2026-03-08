import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import EmojiIcon from "../utils/EmojiIcon";

const DEFAULT_COLS = 7;

const EmojiGrid = forwardRef(
  ({ tokens = [], highlightedEmojis = [], dimmedEmojis = [], compactMode = false }, ref) => {
    const [viewport, setViewport] = useState(() => ({
      width: typeof window !== "undefined" ? window.innerWidth : 1024,
      height: typeof window !== "undefined" ? window.innerHeight : 900,
    }));
    const [containerMetrics, setContainerMetrics] = useState({
      width: 0,
      height: 0,
    });
    const gridRef = useRef(null);

    const assignGridRef = useCallback(
      (node) => {
        gridRef.current = node;
        if (!ref) return;
        if (typeof ref === "function") {
          ref(node);
          return;
        }
        ref.current = node;
      },
      [ref]
    );

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

    useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const node = gridRef.current;
      if (!node) return undefined;
      const wrapNode = node.parentElement;
      const boardNode = node.closest(".game-board");

      const updateMetrics = () => {
        const width = wrapNode?.clientWidth || node.clientWidth || viewport.width;
        const height = boardNode?.clientHeight || wrapNode?.clientHeight || viewport.height;
        setContainerMetrics((prev) => {
          if (prev.width === width && prev.height === height) {
            return prev;
          }
          return { width, height };
        });
      };

      updateMetrics();
      window.addEventListener("resize", updateMetrics, { passive: true });

      let observer = null;
      if ("ResizeObserver" in window) {
        observer = new ResizeObserver(updateMetrics);
        if (wrapNode) observer.observe(wrapNode);
        if (boardNode) observer.observe(boardNode);
      }

      return () => {
        window.removeEventListener("resize", updateMetrics);
        if (observer) observer.disconnect();
      };
    }, [tokens.length, viewport.height, viewport.width]);

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const availableWidth = Math.max(
      200,
      (containerMetrics.width || viewportWidth) - (viewportWidth <= 430 ? 8 : 14)
    );
    const availableHeight = Math.max(
      180,
      (containerMetrics.height || viewportHeight * 0.45) - (viewportWidth <= 430 ? 8 : 14)
    );

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

    const tokenCount = Array.isArray(tokens) ? tokens.length : 0;
    const densityPenalty = tokenCount >= 72 ? 3 : tokenCount >= 60 ? 2 : tokenCount >= 48 ? 1 : 0;
    const isDenseGrid = tokenCount >= 56;

    const cellGap = isPhoneWidth
      ? (isUltraTightHeight ? 2 : 3)
      : isNarrowWidth
        ? (isTightHeight ? 3 : 4)
        : isEmbeddedCompactWidth
          ? 5
          : 6;
    const resolvedGap = Math.max(2, cellGap - (isDenseGrid ? 1 : 0));

    const minCols = isPhoneWidth ? 4 : 5;
    const maxColsByDevice = isPhoneWidth ? 6 : isNarrowWidth ? 7 : DEFAULT_COLS;
    const hardColsByWidth = Math.max(
      minCols,
      Math.floor((availableWidth + resolvedGap) / (20 + resolvedGap))
    );
    const maxCols = Math.max(minCols, Math.min(maxColsByDevice, hardColsByWidth));
    const desiredCols = tokenCount ? Math.ceil(Math.sqrt(tokenCount)) : maxCols;
    const columns = tokenCount ? Math.min(maxCols, Math.max(minCols, desiredCols)) : maxCols;
    const rows = tokenCount ? Math.ceil(tokenCount / columns) : 1;

    let preferredIconSize = isPhoneWidth
      ? 23
      : isVeryCompactWidth
        ? 24
        : isNarrowWidth
          ? 26
          : isEmbeddedCompactWidth
            ? 28
            : 30;

    if (tokenCount <= 40) preferredIconSize += 2;
    if (tokenCount <= 24) preferredIconSize += 2;
    if (isCompactHeight) preferredIconSize -= 1;
    if (isTightHeight) preferredIconSize -= 1;
    if (isUltraTightHeight) preferredIconSize -= 1;
    preferredIconSize -= densityPenalty;
    if (compactMode) preferredIconSize -= 1;

    const maxIconByWidth = Math.floor((availableWidth - (columns - 1) * resolvedGap) / columns) - 2;
    const maxIconByHeight = Math.floor((availableHeight - (rows - 1) * resolvedGap) / rows) - 2;
    let iconSize = Math.min(preferredIconSize, maxIconByWidth, maxIconByHeight);
    iconSize = Math.max(17, Math.min(32, iconSize));
    const cellSize = iconSize + (isTightHeight ? 1 : 2);
    const gridClass = ["emoji-grid", isDimming ? "dim-others" : ""].filter(Boolean).join(" ");

    return (
      <div
        ref={assignGridRef}
        className={gridClass}
        style={{
          "--grid-cols": columns,
          "--emoji-render-size": `${iconSize}px`,
          "--emoji-cell-size": `${cellSize}px`,
          "--cell-gap": `${resolvedGap}px`,
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
