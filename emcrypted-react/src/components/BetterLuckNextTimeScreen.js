import React, { useMemo, useRef, useEffect } from "react";
import { useThemeContext } from "../theme/ThemeContext";
import EmojiIcon from "../utils/EmojiIcon";
import PrimaryButton from "./PrimaryButton";
import { getRenderableEmojiTokens } from "../utils/emojiPolicy";
import { splitGraphemes } from "../utils/graphemes";
import "../styles.css";

const formatMilliseconds = (ms) => {
  if (!ms || Number.isNaN(ms)) return "0s";
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
};

const noop = () => {};

// Hardcoded UI emoji tokens (no-tone variants -> real Fluent SVG in /public/vendor/fluent-emoji)
const UI_EMOJIS = {
  brokenHeart: {
    asset: "/vendor/fluent-emoji/1f494.svg",
    hex: "1f494",
    hasTone: false,
  },
};

const BetterLuckNextTimeScreen = ({ gameData, onNextGame, onHome }) => {
  const { theme } = useThemeContext();
  const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  const gameOverAsciiSrc =
    theme === "dark"
      ? `${publicUrl}/data/GAMEOVER_ascii_white.gif`
      : `${publicUrl}/data/GAMEOVER_ascii_black.gif`;

  // merge in defaults so we don't blow up if data is missing
  const summary = {
    title: "",
    breakdown: [],
    emojiString: "",
    tokenHex: [],
    tokens: [],
    guesses: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    ...(gameData || {}),
  };

  // cluster -> token map (token has .asset which points to Fluent SVG)
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

  // cleanup breakdown lines
  const breakdownLines = useMemo(() => {
    if (Array.isArray(summary.breakdown) && summary.breakdown.length > 0) {
      return summary.breakdown
        .map((line) => (typeof line === "string" ? line.trim() : ""))
        .filter(Boolean);
    }
    return ["No breakdown available."];
  }, [summary.breakdown]);

  const handleHome = typeof onHome === "function" ? onHome : noop;
  const handleNextGame =
    typeof onNextGame === "function" ? onNextGame : noop;

  // light/dark class for scrollbar styling
  const scrollTheme = theme === "dark" ? "dark" : "light";

  // auto-scroll "credits roll" effect - scroll once, then stop
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let frame;
    function step() {
      // still scrolling?
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if (!atBottom) {
        el.scrollTop += 0.3; // scroll down slowly
        frame = requestAnimationFrame(step);
      }
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="resultCardOuter">
      {/* ASCII HEADER GIF */}
      <div className="summaryAsciiHeader">
        <img
          className="summaryAsciiImg"
          src={gameOverAsciiSrc}
          alt="GAME OVER"
        />
      </div>

      <div className="resultCardInner">

        {/* TOP: headline + movie title (always visible) */}
        <div className="summaryFixedTop" style={{ color: "var(--summaryHeadlineColor)" }}>
          <div className="summaryHeadline">
            <EmojiIcon
              asset={UI_EMOJIS.brokenHeart.asset}
              hex={UI_EMOJIS.brokenHeart.hex}
              hasTone={UI_EMOJIS.brokenHeart.hasTone}
              size={20}
            />
            <span>Better Luck Next Time!</span>
            <EmojiIcon
              asset={UI_EMOJIS.brokenHeart.asset}
              hex={UI_EMOJIS.brokenHeart.hex}
              hasTone={UI_EMOJIS.brokenHeart.hasTone}
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
        <div
          className={`summaryScrollable scrollArea ${scrollTheme}`}
          ref={scrollRef}
        >
          {breakdownLines.map((line, index) => {
            const sanitized = line.replace(/^•\s*/, "");
            const [emojiRaw = "", ...rest] = sanitized.split(" - ");
            const description = rest.join(" - ").trim() || sanitized;

            const emojiClusters = splitGraphemes(emojiRaw.trim());
            const renderTokens = getRenderableEmojiTokens(
              emojiClusters,
              tokensByCluster
            );

            const showUnicodeFallback =
              (!renderTokens || renderTokens.length === 0) &&
              emojiClusters.length > 0;

            return (
              <div
                key={`${line}-${index}`}
                className="summaryBreakdownRow"
              >
                <div className="emoji-col">
                  {renderTokens.length > 0
                    ? renderTokens.map((t, emojiIndex) => (
                        <EmojiIcon
                          key={emojiIndex}
                          asset={t.asset}
                          hex={t.hex}
                          hasTone={t.hasTone}
                          size={28}
                        />
                      ))
                    : showUnicodeFallback
                    ? (
                        <span className="summaryUnicodeFallback">
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

        {/* BOTTOM: stats (always visible) */}
        <div
          className="summaryFixedBottom summaryStats"
          style={{ color: "var(--summaryStatsColor)" }}
        >
          {[
            { label: "Guesses", value: summary.guesses },
            { label: "Hints Used", value: summary.hintsUsed },
            { label: "Elapsed", value: formatMilliseconds(summary.elapsedMs) },
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
      </div>
    </div>
  );
};

export default BetterLuckNextTimeScreen;
