import React from "react";
import { createPortal } from "react-dom";
import EmojiIcon from "../../utils/EmojiIcon";
import "./FloatingCornerButton.css";

const TOKENS = {
  "🚪": { hex: "1f6aa", asset: "/vendor/fluent-emoji/1f6aa.svg" },
  "🔓": { hex: "1f513", asset: "/vendor/fluent-emoji/1f513.svg" },
  "❎": { hex: "274e", asset: "/vendor/fluent-emoji/274e.svg" },
  "⬅️": { hex: "2b05-fe0f", asset: "/vendor/fluent-emoji/2b05-fe0f.svg" },
};

function InnerButton({ onClick, token, emoji, ariaLabel }) {
  return (
    <button
      type="button"
      className="floatingCornerButton"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {token ? (
        <EmojiIcon asset={token.asset} hex={token.hex} hasTone={false} size={24} />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </button>
  );
}

export default function FloatingCornerButton({
  onClick,
  emoji = "🚪",
  ariaLabel = "Back",
}) {
  const token = TOKENS[emoji] || null;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <InnerButton
      onClick={onClick}
      token={token}
      emoji={emoji}
      ariaLabel={ariaLabel}
    />,
    document.body
  );
}
