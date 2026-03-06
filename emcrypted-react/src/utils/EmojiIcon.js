import React, { forwardRef, useMemo, useState, useEffect, useCallback } from "react";

const stripVS16 = (hex) => String(hex || "").toLowerCase().replace(/-fe0f/g, "");

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const extractHexFromAssetPath = (assetPath) => {
  const match = /\/([0-9a-f-]+)\.svg$/i.exec(String(assetPath || ""));
  return match ? match[1].toLowerCase() : "";
};

const toAssetPath = (hex) => (hex ? `/vendor/fluent-emoji/${hex}.svg` : "");

const expandHexCandidates = (hex) => {
  const raw = String(hex || "").toLowerCase().trim();
  if (!raw) return [];

  const stripped = stripVS16(raw);
  const padded = stripped
    .split("-")
    .map((part) => (/^[0-9a-f]{1,3}$/i.test(part) ? part.padStart(4, "0") : part))
    .join("-");

  return unique([raw, stripped, padded]);
};

const buildSourceCandidates = ({ asset, hex, hexFull }) => {
  const hexFromAsset = extractHexFromAssetPath(asset);
  const hexCandidates = unique([
    ...expandHexCandidates(hexFull),
    ...expandHexCandidates(hex),
    ...expandHexCandidates(hexFromAsset),
  ]);

  const assetCandidates = unique([
    asset,
    asset ? asset.replace(/-fe0f/gi, "") : "",
    hexFromAsset ? toAssetPath(hexFromAsset) : "",
  ]);

  return unique([
    ...assetCandidates,
    ...hexCandidates.map(toAssetPath),
  ]);
};

/**
 * EmojiIcon - Dead simple emoji renderer
 *
 * All tone normalization happens at BUILD TIME in compile-puzzles.cjs.
 * This component just renders the pre-computed token.asset.
 * No runtime tone logic. No fallbacks. No guessing.
 */
const EmojiIcon = forwardRef(function EmojiIcon(
  {
    asset,
    cluster,
    text,
    size = 32,
    className = "",
    alt = "",
    style,
    hex,
    hexFull,
    hasTone,
    onError,
    loading = "eager",
    decoding = "sync",
    ...rest
  },
  ref
) {
  const sourceCandidates = useMemo(
    () => buildSourceCandidates({ asset, hex, hexFull }),
    [asset, hex, hexFull]
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasExhaustedSources, setHasExhaustedSources] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setHasExhaustedSources(false);
  }, [sourceCandidates]);

  const src = sourceCandidates[sourceIndex] || "";

  const handleError = useCallback(
    (event) => {
      if (typeof onError === "function") {
        onError(event);
      }
      setSourceIndex((index) => {
        if (index < sourceCandidates.length - 1) {
          return index + 1;
        }
        setHasExhaustedSources(true);
        return index;
      });
    },
    [onError, sourceCandidates.length]
  );

  if (!src || hasExhaustedSources) {
    const fallbackLabel = (cluster || text || alt || "?").trim() || "?";
    return (
      <span
        ref={ref}
        className={`emoji-icon emoji-fallback ${className}`.trim()}
        aria-hidden={alt ? undefined : "true"}
        title={alt || fallbackLabel}
        data-hex={hexFull || hex || ""}
        data-has-tone={hasTone ? "true" : "false"}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(12, Math.round(size * 0.82)),
          lineHeight: 1,
          maxWidth: "100%",
          maxHeight: "100%",
          ...style,
        }}
        {...rest}
      >
        {fallbackLabel}
      </span>
    );
  }

  return (
    <img
      ref={ref}
      className={`emoji-icon ${className}`.trim()}
      src={src}
      alt={alt || ""}
      aria-hidden={alt ? undefined : "true"}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        imageRendering: "auto",
        ...style,
      }}
      draggable={false}
      data-hex={hexFull || hex || ""}
      data-has-tone={hasTone ? "true" : "false"}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      {...rest}
    />
  );
});

export default EmojiIcon;
