import React, { useMemo, useRef, useState } from "react";
import { useThemeContext } from "../theme/ThemeContext";
import EmojiIcon from "../utils/EmojiIcon";
import PrimaryButton from "./PrimaryButton";
import ShareToast from "./ShareToast";
import InlineOwnedScrollbar from "./ui/InlineOwnedScrollbar";
import { getRenderableEmojiTokens } from "../utils/emojiPolicy";
import { formatMilliseconds } from "../utils/formatTime";
import { parseEmojiPrefixedLine } from "../utils/emojiLineParser";
import "../styles.css";

// 🎉 headline confetti emoji (Fluent asset)
const UI_EMOJIS = {
  celebration: {
    asset: "/vendor/fluent-emoji/1f389.svg",
    hex: "1f389",
    hasTone: false,
  },
};

const VictoryScreen = ({ gameData, onNextGame, onHome }) => {
  const { theme } = useThemeContext();
  const [showToast, setShowToast] = useState(false);
  const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  const decryptedAsciiSrc =
    theme === "dark"
      ? `${publicUrl}/data/DECRYPTED_ascii_white.gif`
      : `${publicUrl}/data/DECRYPTED_ascii_black.gif`;

  // normalize incoming props, provide defaults
  const summary = {
    title: "",
    breakdown: [],
    tokens: [],
    guesses: 0,
    hintsUsed: 0,
    sessionTime: 0, // ms
    ...(gameData || {}),
  };

  // Build cluster -> token map from summary.tokens
  const tokensByCluster = useMemo(() => {
    const map = new Map();
    if (Array.isArray(summary.tokens)) {
      summary.tokens.forEach((token) => {
        if (token && token.cluster) {
          map.set(token.cluster, token);
        }
      });
    }
    return map;
  }, [summary.tokens]);

  // Clean + filter breakdown lines (strip bullets, trim blanks)
  const breakdownLines = useMemo(() => {
    if (Array.isArray(summary.breakdown) && summary.breakdown.length > 0) {
      return summary.breakdown
        .map((line) => (typeof line === "string" ? line.trim() : ""))
        .filter(Boolean);
    }
    return ["No breakdown available."];
  }, [summary.breakdown]);

  // Handlers
  const handleHome =
    typeof onHome === "function" ? onHome : () => {};
  const handleNextGame =
    typeof onNextGame === "function" ? onNextGame : () => {};

  const handleShare = async () => {
    const timeStr = formatMilliseconds(summary.sessionTime);
    const shareText = `I decrypted "${summary.title}" in ${summary.guesses} guesses, ${summary.hintsUsed} hints, ${timeStr} on EMCRYPTED 🔐🎬 Can you beat me?`;

    try {
      await navigator.clipboard.writeText(shareText);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: show alert
      window.alert(shareText);
    }
  };

  // Scrollbar theme (affects custom scrollbar colors in styles.css)
  const scrollTheme = theme === "dark" ? "dark" : "light";

  const scrollRef = useRef(null);

  return (
    <div className="resultCardOuter">
      {/* ASCII HEADER GIF for DECRYPTED */}
      <div className="summaryAsciiHeader">
        <img
          className="summaryAsciiImg"
          src={decryptedAsciiSrc}
          alt="DECRYPTED"
        />
      </div>

      <div className="resultCardInner">

        {/* TOP: headline + movie title (always visible) */}
        <div className="summaryFixedTop" style={{ color: "var(--summaryHeadlineColor)" }}>
          <div className="summaryHeadline">
            <EmojiIcon
              asset={UI_EMOJIS.celebration.asset}
              hex={UI_EMOJIS.celebration.hex}
              hasTone={UI_EMOJIS.celebration.hasTone}
              size={20}
            />
            <span>You Did It!</span>
            <EmojiIcon
              asset={UI_EMOJIS.celebration.asset}
              hex={UI_EMOJIS.celebration.hex}
              hasTone={UI_EMOJIS.celebration.hasTone}
              size={20}
            />
          </div>

          {summary.title && (
            <div
              className="summaryMovieTitle"
              style={{ color: "var(--summaryTitleColor)" }}
            >
              {summary.title}
            </div>
          )}
        </div>

        {/* MIDDLE: scrollable breakdown ONLY */}
        <div className={`summaryScrollWrap ${scrollTheme}`}>
          <div
            className={`summaryScrollable scrollArea ${scrollTheme}`}
            ref={scrollRef}
          >
            {breakdownLines.map((line, index) => {
              const { emojiClusters, description } = parseEmojiPrefixedLine(line);
              const renderTokens = getRenderableEmojiTokens(
                emojiClusters,
                tokensByCluster
              );

              // VictoryScreen currently has a unicode fallback
              const showUnicodeFallback =
                (!renderTokens || renderTokens.length === 0) &&
                emojiClusters.length > 0;

              return (
                <div
                  key={`${line}-${index}`}
                  className="summaryBreakdownRow"
                >
                  <div className="emoji-col">
                    {renderTokens && renderTokens.length > 0
                      ? renderTokens.map((t, emojiIndex) => (
                          <EmojiIcon
                            key={`${index}-${emojiIndex}-${t.cluster || t.hex || "raw"}`}
                            asset={t.asset}
                            hex={t.hex}
                            hasTone={t.hasTone}
                            size={28}
                          />
                        ))
                      : showUnicodeFallback
                      ? (
                          <span
                            style={{
                              fontSize: "28px",
                              lineHeight: 1.2,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "4px",
                              justifyContent: "center",
                            }}
                          >
                            {emojiClusters.join("")}
                          </span>
                        )
                      : null}
                  </div>

                  <div
                    className="text-col"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {description}
                  </div>
                </div>
              );
            })}
          </div>
          <InlineOwnedScrollbar targetRef={scrollRef} className={scrollTheme} />
        </div>

        {/* BOTTOM: stats (always visible) */}
        <div
          className="summaryFixedBottom summaryStats"
          style={{ color: "var(--summaryStatsColor)" }}
        >
          {[
            { label: "Guesses", value: summary.guesses },
            { label: "Hints Used", value: summary.hintsUsed },
            { label: "Elapsed", value: formatMilliseconds(summary.sessionTime) },
          ].map((entry) => (
            <div key={entry.label}>
              {entry.label}: {entry.value}
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="summaryActions">
        <PrimaryButton iconEmoji="🏠" label="Home" onClick={handleHome} />
        <PrimaryButton
          iconEmoji="➡️"
          label="Next Game"
          onClick={handleNextGame}
        />
        <PrimaryButton
          iconEmoji="📤"
          label="Share"
          onClick={handleShare}
        />
      </div>

      {/* Share Toast */}
      {showToast && (
        <ShareToast
          message="Copied!"
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default VictoryScreen;
