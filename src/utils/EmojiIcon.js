import React, { forwardRef, useMemo, useState } from "react";

const toHex = (cluster) => {
  if (!cluster) return "";
  const codes = [];
  for (const char of cluster) {
    codes.push(char.codePointAt(0).toString(16));
  }
  return codes.join("-");
};

const EmojiIcon = forwardRef(function EmojiIcon(
  { asset, cluster, text, size = 32, className = "", alt = "", style, ...rest },
  ref
) {
  const glyph = cluster ?? text ?? "";
  const baseClass = ["emoji-icon", className].filter(Boolean).join(" ");
  const derivedAsset = useMemo(() => {
    if (asset) return asset;
    if (!glyph) return null;
    const hex = toHex(glyph);
    return hex ? `/vendor/fluent-emoji/${hex}.svg` : null;
  }, [asset, glyph]);
  const [imageErrored, setImageErrored] = useState(false);

  if (derivedAsset && !imageErrored) {
    return (
      <img
        ref={ref}
        src={derivedAsset}
        alt={alt}
        width={size}
        height={size}
        className={baseClass}
        style={style}
        onError={() => setImageErrored(true)}
        draggable="false"
        {...rest}
      />
    );
  }

  if (!glyph) return null;

  const fallbackStyle = {
    fontSize: size,
    lineHeight: `${size}px`,
    ...style,
  };

  return (
    <span ref={ref} className={`${baseClass} emoji-fallback`.trim()} style={fallbackStyle} {...rest}>
      {glyph}
    </span>
  );
});

export default EmojiIcon;
