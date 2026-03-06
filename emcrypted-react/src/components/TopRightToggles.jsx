import React from "react";
import { useThemeContext } from "../theme/ThemeContext";
import EmojiIcon from "../utils/EmojiIcon";

// All icons use no-tone (neutral) Fluent SVG variants - real vector art, not placeholders
const ICONS = {
  sun: { cluster: "☀️", hex: "2600-fe0f", asset: "/vendor/fluent-emoji/2600-fe0f.svg", hasTone: false },
  moon: { cluster: "🌙", hex: "1f319", asset: "/vendor/fluent-emoji/1f319.svg", hasTone: false },
};

const TopRightToggles = () => {
  const { theme, setTheme } = useThemeContext();

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const themeLabel = theme === "dark" ? "Light Mode" : "Dark Mode";
  const isDark = theme === "dark";
  const themeIcon = isDark ? ICONS.moon : ICONS.sun;

  return (
    <div className="top-right-toggles" role="group" aria-label="Display options">
      <button
        type="button"
        className="toggle-btn"
        onClick={handleThemeToggle}
        aria-label={themeLabel}
        title={themeLabel}
      >
        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EmojiIcon
            asset={themeIcon.asset}
            cluster={themeIcon.cluster}
            hex={themeIcon.hex}
            hasTone={themeIcon.hasTone}
            size={28}
          />
        </div>
      </button>
    </div>
  );
};

export default TopRightToggles;
