import React from "react";
import EmojiIcon from "../utils/EmojiIcon";

// Hardcoded UI emoji tokens (no-tone variants, real Fluent art)
const UI_EMOJIS = {
  home: { asset: "/vendor/fluent-emoji/1f3e0.svg", hex: "1f3e0", hasTone: false },
  rightArrow: { asset: "/vendor/fluent-emoji/27a1-fe0f.svg", hex: "27a1-fe0f", hasTone: false },
  share: { asset: "/vendor/fluent-emoji/1f4e4.svg", hex: "1f4e4", hasTone: false },
  game: { asset: "/vendor/fluent-emoji/1f3ae.svg", hex: "1f3ae", hasTone: false },
};

/**
 * PrimaryButton component
 * Reuses the exact same .btn style from home screen (App.css)
 * Automatically themes with dark/light mode via CSS variables
 *
 * @param {string} iconEmoji - The emoji to display (e.g., "🏠", "➡️")
 * @param {string} label - The button text
 * @param {function} onClick - Click handler
 */
const PrimaryButton = ({ iconEmoji, label, onClick }) => {
  // Map emoji to Fluent SVG token
  const getIconToken = (emoji) => {
    switch (emoji) {
      case "🏠":
        return UI_EMOJIS.home;
      case "➡️":
        return UI_EMOJIS.rightArrow;
      case "📤":
        return UI_EMOJIS.share;
      case "🎮":
      case "🕹":
        return UI_EMOJIS.game;
      default:
        return null;
    }
  };

  const iconToken = getIconToken(iconEmoji);

  return (
    <button
      type="button"
      className="btn btn-lg"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      {iconToken && (
        <EmojiIcon
          asset={iconToken.asset}
          hex={iconToken.hex}
          hasTone={iconToken.hasTone}
          size={28}
        />
      )}
      <span>{label}</span>
    </button>
  );
};

export default PrimaryButton;
