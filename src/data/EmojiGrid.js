import React from "react";
import { splitEmojiClusters } from "../utils/emojiSegment";
import { assetPathForEmoji } from "../utils/emojiAssetMap";

const EmojiGrid = ({ emojiSequence, highlightedEmojis = [], dimmedEmojis = [] }) => {
  const clusters = splitEmojiClusters(emojiSequence);

  return (
    <div className="emoji-grid">
      {clusters.map((emoji, index) => {
        const src = assetPathForEmoji(emoji);
        const stateClass = highlightedEmojis.includes(index)
          ? "highlighted"
          : dimmedEmojis.includes(index)
          ? "dimmed"
          : "";

        return (
          <span key={`${emoji}-${index}`} className={`emoji-item ${stateClass}`} data-index={index}>
            <img
              src={src}
              alt=""
              draggable="false"
              onError={(event) => {
                const textNode = document.createTextNode(emoji);
                event.currentTarget.replaceWith(textNode);
              }}
            />
          </span>
        );
      })}
    </div>
  );
};

export default EmojiGrid;
