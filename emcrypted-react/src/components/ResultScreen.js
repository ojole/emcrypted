import React from "react";
import EmojiIcon from "../utils/EmojiIcon";

// Hardcoded UI emoji tokens (no-tone variants, real Fluent art)
const UI_EMOJIS = {
  home: { asset: "/vendor/fluent-emoji/1f3e0.svg", hex: "1f3e0", hasTone: false },
};

const formatMilliseconds = (ms) => {
  if (!ms || Number.isNaN(ms)) return "0s";
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
};

const ResultScreen = ({ gameData, refereeData, onHome, onNextGame }) => {
  const breakdown = Array.isArray(gameData?.breakdown) ? gameData.breakdown : [];
  return (
    <div className="result-screen">
      <div className="results-message">Game Results</div>
      <div className="blnt-stats">
        <div className="blnt-stat">
          <span className="label">Time</span>
          <span className="value">{formatMilliseconds(refereeData.time)}</span>
        </div>
        <div className="blnt-stat">
          <span className="label">Guesses</span>
          <span className="value">{refereeData.guesses}</span>
        </div>
        <div className="blnt-stat">
          <span className="label">Hints Used</span>
          <span className="value">{refereeData.hintsUsed}</span>
        </div>
      </div>
      {breakdown.length > 0 && (
        <div className="breakdown-container">
          {breakdown.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </div>
      )}
      <button className="btn btn-lg" type="button" onClick={onHome} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <EmojiIcon
          asset={UI_EMOJIS.home.asset}
          hex={UI_EMOJIS.home.hex}
          hasTone={UI_EMOJIS.home.hasTone}
          size={24}
        />
        <span>Home</span>
      </button>
      <button className="btn btn-lg" type="button" onClick={onNextGame}>
        Next Game
      </button>
      <button
        className="btn btn-lg"
        type="button"
        onClick={() => alert("Share feature coming soon!")}
      >
        Share Results
      </button>
    </div>
  );
};

export default ResultScreen;








