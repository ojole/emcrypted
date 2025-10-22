import React, { forwardRef } from "react";

const EmojiIcon = forwardRef(function EmojiIcon(
  { asset, cluster, text, size = 32, className = "", alt = "", style, ...rest },
  ref
) {
  const glyph = cluster ?? text ?? "";
  const baseClass = ["emoji-icon", className].filter(Boolean).join(" ");

  if (asset) {
    return (
      <img
        ref={ref}
        src={asset}
        alt={alt}
        width={size}
        height={size}
        className={baseClass}
        style={style}
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
