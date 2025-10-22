/* eslint-disable */
import React from "react";
import { assetPathForEmoji } from "../utils/emojiAssetMap";

export default function EmojiIcon({ char, size = 24, className = "" }) {
  const src = assetPathForEmoji(char);
  const style = { width: size, height: size, fontSize: size, lineHeight: `${size}px` };

  return (
    <span className={`emoji-item ${className}`.trim()} style={style}>
      <img
        src={src}
        alt=""
        draggable="false"
        width={size}
        height={size}
        onError={(event) => {
          event.currentTarget.replaceWith(document.createTextNode(char));
        }}
      />
    </span>
  );
}
