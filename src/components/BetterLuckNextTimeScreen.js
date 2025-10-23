import React, { useMemo } from "react";
import EmojiIcon from "../utils/EmojiIcon";

const { splitGraphemes } = require("../utils/graphemes");

const toHex = (cluster) => {
  if (!cluster) return "";
  const codes = [];
  for (const char of cluster) {
    codes.push(char.codePointAt(0).toString(16));
  }
  return codes.join("-");
};

const formatMilliseconds = (ms) => {
  if (!ms || Number.isNaN(ms)) return "0s";
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
};

const BetterLuckNextTimeScreen = ({ gameData, onNextGame }) => {
  const summary = {
    title: "",
    breakdown: [],
    emojiString: "",
    tokenHex: [],
    guesses: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    ...(gameData || {}),
  };

  const emojiTokens = useMemo(() => {
    const clusters = splitGraphemes(summary.emojiString || "");
    if (summary.tokenHex?.length === clusters.length && clusters.length > 0) {
      return summary.tokenHex.map((hex, index) => ({
        cluster: clusters[index],
        hex,
        asset: `/vendor/fluent-emoji/${hex}.svg`,
      }));
    }
    return clusters.map((cluster) => ({
      cluster,
      hex: toHex(cluster),
      asset: `/vendor/fluent-emoji/${toHex(cluster)}.svg`,
    }));
  }, [summary.emojiString, summary.tokenHex]);

  return (
    <div className="blnt-screen">
      <div className="blnt-message">Better Luck Next Time! 😞</div>
      <h2 className="blnt-title">{summary.title}</h2>
      {emojiTokens.length > 0 && (
        <div className="blnt-emoji-row">
          {emojiTokens.map((token, index) => (
            <EmojiIcon key={`${token.hex}-${index}`} cluster={token.cluster} asset={token.asset} size={48} />
          ))}
        </div>
      )}
      <div className="blnt-stats">
        <div className="blnt-stat">
          <span className="label">Guesses</span>
          <span className="value">{summary.guesses}</span>
        </div>
        <div className="blnt-stat">
          <span className="label">Hints Used</span>
          <span className="value">{summary.hintsUsed}</span>
        </div>
        <div className="blnt-stat">
          <span className="label">Elapsed</span>
          <span className="value">{formatMilliseconds(summary.elapsedMs)}</span>
        </div>
      </div>
      <div className="blnt-breakdown">
        {Array.isArray(summary.breakdown) && summary.breakdown.length > 0 ? (
          summary.breakdown.map((item, index) => <p key={index}>{item}</p>)
        ) : (
          <p>No breakdown available.</p>
        )}
      </div>
      <button className="btn blnt-button" type="button" onClick={onNextGame}>
        Next Game
      </button>
    </div>
  );
};

export default BetterLuckNextTimeScreen;
