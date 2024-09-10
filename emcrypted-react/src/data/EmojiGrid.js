import React from 'react';
import emojiData from "../data/data-by-emoji.json";
import emojiComponents from "../data/data-emoji-components.json";
import orderedEmoji from "../data/data-ordered-emoji.json";

// Analyze the emoji sequence
export const analyzeEmojiSequence = (emojiSequence) => {
  const emojiRegex = /(\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?|\p{Emoji}\u200D(?:\p{Emoji}|\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?)|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji}\u200D[\p{Emoji}\u200D]*\p{Emoji})/gu;

  // Handle skin tone variations and components
  return [...emojiSequence.matchAll(emojiRegex)].map((match) => {
    const emoji = match[0];
    if (emojiData[emoji]) {
      return emoji;
    } else if (emojiComponents[emoji]) {
      return emojiComponents[emoji];
    } else {
      const variant = orderedEmoji.find(e => e === emoji || e.startsWith(emoji));
      return variant || emoji;
    }
  });
};

// EmojiGrid Component
const EmojiGrid = ({ emojiSequence, highlightedEmojis, dimmedEmojis }) => {
  const analyzedEmojis = analyzeEmojiSequence(emojiSequence);

  return (
    <div className="emoji-grid">
      {analyzedEmojis.map((emoji, index) => (
        <span
          key={index}
          className={`emoji-item ${
            highlightedEmojis.includes(index)
              ? "highlighted"
              : dimmedEmojis.includes(index)
              ? "dimmed"
              : ""
          }`}
          data-index={index}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};

export default EmojiGrid;
