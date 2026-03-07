import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import EmojiGrid from "./EmojiGrid";
import HintButton from "./HintButton";
import EmojiIcon from "../utils/EmojiIcon";
import { getRenderableEmojiTokens } from "../utils/emojiPolicy";
import embeddedMoviesData from "./moviesEmbedded.json";
import "./Game.css";

const { splitGraphemes } = require("../utils/graphemes");

/**
 * Apply emoji policy to tokens while preserving original clusters for highlighting
 */
const applyPolicyToTokens = (inputTokens) => {
  if (!Array.isArray(inputTokens) || !inputTokens.length) {
    return [];
  }

  const tokensByCluster = new Map();
  inputTokens.forEach((token) => {
    if (token && token.cluster) {
      tokensByCluster.set(token.cluster, token);
    }
  });

  const clusters = inputTokens.map((token) => token.cluster);
  const renderTokens = getRenderableEmojiTokens(clusters, tokensByCluster);
  return renderTokens.map((renderToken) => {
    const originalToken = tokensByCluster.get(renderToken.cluster) || {};
    const hex = renderToken.hex || originalToken.hex || "";
    return {
      ...originalToken,
      cluster: renderToken.cluster || originalToken.cluster || "",
      asset: renderToken.asset || originalToken.asset || "",
      hex,
      hexFull: originalToken.hexFull || hex,
      hexBase: originalToken.hexBase || stripToneFromHex(hex),
      hasTone:
        typeof renderToken.hasTone === "boolean"
          ? renderToken.hasTone
          : Boolean(originalToken.hasTone),
    };
  });
};

const HINT_DURATION = 5;
const CORRECT_FEEDBACK_MS = 1000;
const WRONG_FEEDBACK_MS = 1000;
const EXIT_ICON = "❎";
const EXIT_SAD_ICON = "😞";
const PRIMARY_DATA_URL = "/data/moviesG2G.compiled.json";
const FALLBACK_DATA_URL = "/data/moviesG2G.json";

const toHex = (cluster) => {
  if (!cluster) return "";
  const codes = [];
  for (const char of cluster) {
    codes.push(char.codePointAt(0).toString(16));
  }
  return codes.join("-");
};

const assetPathForCluster = (cluster) => {
  if (!cluster) return null;
  return `/vendor/fluent-emoji/${toHex(cluster)}.svg`;
};

const buildTokensFromEmojiString = (emojiString) => {
  const source = String(emojiString || "");
  if (!source) return [];
  return splitGraphemes(source).map((cluster) => {
    const hex = toHex(cluster);
    return {
      cluster,
      hex,
      hexBase: stripToneFromHex(hex),
      hasTone: TONE_REGEX.test(cluster),
      asset: assetPathForCluster(cluster),
    };
  });
};

const normalizeMovies = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  return Object.values(data || {}).filter(Boolean);
};

const normalizeAndTokenizeMovies = (data) => normalizeMovies(data).map(ensureMovieTokens);

const TONE_REGEX = /[\u{1F3FB}-\u{1F3FF}]/u;
const stripToneFromHex = (hex) =>
  (hex || "")
    .split("-")
    .filter((part) => part && !/^(?:1f3fb|1f3fc|1f3fd|1f3fe|1f3ff)$/i.test(part))
    .join("-") || hex;

const ensureMovieTokens = (movie) => {
  if (!movie) return movie;
  const output = movie.output || movie.emojiString || "";
  const hasTokens = Array.isArray(movie.tokens) && movie.tokens.length > 0;
  const baseClusters = hasTokens
    ? movie.tokens.map((token) => token?.cluster ?? "")
    : splitGraphemes(output);

  const tokens = hasTokens
    ? movie.tokens.map((token, index) => {
        const cluster = token?.cluster ?? baseClusters[index] ?? "";
        const hex = token?.hex && token.hex.length ? token.hex : toHex(cluster);
        const hasTone = typeof token?.hasTone === "boolean" ? token.hasTone : TONE_REGEX.test(cluster);
        const hexBase = token?.hexBase || stripToneFromHex(hex);
        return {
          cluster,
          hex,
          hexBase,
          hasTone,
          asset: token?.asset || assetPathForCluster(cluster),
        };
      })
    : buildTokensFromEmojiString(output);

  const tokenHex =
    Array.isArray(movie.tokenHex) && movie.tokenHex.length === tokens.length
      ? movie.tokenHex
      : tokens.map((token) => token.hex);

  return {
    ...movie,
    tokens,
    tokenHex,
    emojiString: movie.emojiString || output,
  };
};

const parseHint = (hint) => {
  if (!hint) {
    return { emojiText: "", message: "" };
  }
  const parts = String(hint).split(" - ");
  if (parts.length === 1) {
    return { emojiText: "", message: parts[0].trim() };
  }
  const emojiSource = parts[0].replace(/^\d+\.\s*/, "").trim();
  const message = parts.slice(1).join(" - ").trim();
  return { emojiText: emojiSource, message };
};

const findContiguousSpan = (gridClusters, hintClusters, startAt = 0) => {
  if (!hintClusters.length || !gridClusters.length || hintClusters.length > gridClusters.length) {
    return -1;
  }

  outer: for (let i = Math.max(0, startAt); i <= gridClusters.length - hintClusters.length; i += 1) {
    for (let j = 0; j < hintClusters.length; j += 1) {
      if (gridClusters[i + j] !== hintClusters[j]) {
        continue outer;
      }
    }
    return i;
  }

  return -1;
};

const Game = ({ onVictory, onExit, refereeData, setRefereeData }) => {
  const [moviesList, setMoviesList] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [guess, setGuess] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [showHintBar, setShowHintBar] = useState(false);
  const [hintText, setHintText] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null);
  const [submittedGuess, setSubmittedGuess] = useState("");
  const [highlightedEmojis, setHighlightedEmojis] = useState([]);
  const [dimmedEmojis, setDimmedEmojis] = useState([]);
  const [usedGuesses, setUsedGuesses] = useState([]);
  const [sessionStartMs, setSessionStartMs] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [exitGlyph, setExitGlyph] = useState(EXIT_ICON);
  const [hintHistory, setHintHistory] = useState([]);
  const [activeHint, setActiveHint] = useState(null);
  const [isHintRailExpanded, setIsHintRailExpanded] = useState(false);
  const exitTimerRef = useRef(null);
  const exitOverlayRef = useRef(null);
  const hintRailOverlayRef = useRef(null);
  const hintTimeoutRef = useRef(null);

  const isHintActive = showHintBar && countdown > 0;
  const hintsAvailable =
    currentMovie && Array.isArray(currentMovie.hints) ? currentMovie.hints.length : 0;
  const hintExhausted = !hintsAvailable || hintIndex >= hintsAvailable;

  const resetHintAndEmoji = useCallback(() => {
    setHintText("");
    setShowHintBar(false);
    setCountdown(0);
    setHighlightedEmojis([]);
    setDimmedEmojis([]);
  }, []);

  const highlightHintTokens = useCallback((hintObj, tokens) => {
    const hintClusters = Array.isArray(hintObj?.hintClusters) ? hintObj.hintClusters : [];
    if (!Array.isArray(tokens) || !tokens.length || !hintClusters.length) {
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      return;
    }

    const gridClusters = tokens.map((token) => token.cluster);
    const explicitSpan = Array.isArray(hintObj?.span) ? hintObj.span : [];
    const validSpan = explicitSpan.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < gridClusters.length
    );

    let highlighted = validSpan;

    if (!highlighted.length) {
      const matchStart = findContiguousSpan(gridClusters, hintClusters, 0);
      if (matchStart !== -1) {
        highlighted = Array.from({ length: hintClusters.length }, (_, idx) => matchStart + idx);
      } else {
        // Last resort: map duplicates by count instead of highlighting every repeated cluster.
        const neededCounts = new Map();
        hintClusters.forEach((cluster) => {
          neededCounts.set(cluster, (neededCounts.get(cluster) || 0) + 1);
        });
        highlighted = gridClusters
          .map((cluster, index) => {
            const remaining = neededCounts.get(cluster) || 0;
            if (remaining <= 0) {
              return -1;
            }
            neededCounts.set(cluster, remaining - 1);
            return index;
          })
          .filter((index) => index !== -1);
      }
    }

    const highlightSet = new Set(highlighted);
    const dimmed = gridClusters
      .map((_, index) => index)
      .filter((index) => !highlightSet.has(index));

    setHighlightedEmojis(highlighted);
    setDimmedEmojis(dimmed);
  }, []);

  const startNewGame = useCallback(
    (movies) => {
      if (!movies?.length) return;
      const randomIndex = Math.floor(Math.random() * movies.length);
      const selected = ensureMovieTokens(movies[randomIndex]);
      setSessionStartMs(Date.now());
      setCurrentMovie(selected);
      setHintIndex(0);
      setShowHintBar(false);
      setHintText("");
      setCountdown(0);
      setIsCorrect(null);
      setGuess("");
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      setUsedGuesses([]);
      setSearchResults([]);
      setSubmittedGuess("");
      setGameOver(false);
      setExitGlyph(EXIT_ICON);
      setHintHistory([]);
      setActiveHint(null);
      setIsHintRailExpanded(false);
      setRefereeData({
        time: 0,
        guesses: 0,
        hintsUsed: 0,
      });
    },
    [setRefereeData]
  );

  useEffect(() => {
    const fetchMoviesList = async () => {
      const loadMovies = async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          const error = new Error(`Request failed with status ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return response.json();
      };

      try {
        let moviesData;
        try {
          moviesData = await loadMovies(PRIMARY_DATA_URL);
        } catch (err) {
          console.warn("Failed to load compiled puzzles, trying fallback source", err);
          moviesData = await loadMovies(FALLBACK_DATA_URL);
        }

        const normalized = normalizeAndTokenizeMovies(moviesData);
        if (!normalized.length) {
          throw new Error("No movies available after loading puzzle data");
        }
        setMoviesList(normalized);
        startNewGame(normalized);
      } catch (error) {
        console.error("Error fetching movies:", error);
        const embedded = normalizeAndTokenizeMovies(embeddedMoviesData);
        if (!embedded.length) {
          return;
        }
        setMoviesList(embedded);
        startNewGame(embedded);
      }
    };

    fetchMoviesList();
  }, [startNewGame]);

  useEffect(() => {
    if (!showHintBar) return undefined;
    if (countdown <= 0) {
      resetHintAndEmoji();
      return undefined;
    }
    const timer = setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showHintBar, countdown, resetHintAndEmoji]);

  useEffect(() => {
    if (!gameOver) return;
    const elapsed = Date.now() - sessionStartMs;
    setRefereeData((prev) => ({
      ...prev,
      time: elapsed,
    }));
  }, [gameOver, sessionStartMs, setRefereeData]);

  const handleGuessChange = (event) => {
    const userInput = event.target.value;
    setGuess(userInput);

    if (userInput.length > 0) {
      const filteredMovies = moviesList.filter((movie) =>
        movie.title.toLowerCase().includes(userInput.toLowerCase())
      );
      const remainingResults = filteredMovies.filter(
        (movie) => !usedGuesses.includes(movie.title.toLowerCase())
      );
      setSearchResults(remainingResults.slice(0, 5));
    } else {
      setSearchResults([]);
    }
    setSubmittedGuess("");
  };

  const calculateElapsedMs = useCallback(() => Date.now() - sessionStartMs, [sessionStartMs]);

  const submitGuess = (movieTitle) => {
    const submittedTitle = String(movieTitle || "").toLowerCase();
    setSubmittedGuess(submittedTitle);
    setGuess(movieTitle);
    setUsedGuesses((prev) => [...prev, movieTitle.toLowerCase()]);
    setRefereeData((prev) => ({
      ...prev,
      guesses: prev.guesses + 1,
    }));
    if (!currentMovie) return;
    if (movieTitle.toLowerCase() === currentMovie.title.toLowerCase()) {
      setIsCorrect(true);
      setGameOver(true);
      setRefereeData((prev) => ({
        ...prev,
        time: calculateElapsedMs(),
      }));
      setTimeout(() => {
        onVictory({
          title: currentMovie.title,
          hintsUsed: hintHistory.length,
          guesses: usedGuesses.length + 1,
          sessionTime: calculateElapsedMs(),
          breakdown: currentMovie.breakdown,
          tokens: policyTokens,
          isVictory: true,
        });
      }, CORRECT_FEEDBACK_MS);
    } else {
      setIsCorrect(false);
      setTimeout(() => {
        setIsCorrect(null);
        setSubmittedGuess("");
      }, WRONG_FEEDBACK_MS);
    }
  };

  const closeHint = useCallback(() => {
    setActiveHint(null);
    setShowHintBar(false);
    setHintText("");
    setCountdown(0);
    setHighlightedEmojis([]);
    setDimmedEmojis([]);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, []);

  // Apply emoji policy to game tokens
  const policyTokens = useMemo(() => {
    if (!currentMovie) return [];

    const sourceTokens =
      Array.isArray(currentMovie.tokens) && currentMovie.tokens.length
        ? currentMovie.tokens
        : buildTokensFromEmojiString(currentMovie.emojiString || currentMovie.output || "");

    if (!sourceTokens.length) return [];

    const normalizedSourceTokens = sourceTokens.map((token) => {
      const cluster = token?.cluster || "";
      const hex = token?.hex || toHex(cluster);
      return {
        ...token,
        cluster,
        hex,
        hexBase: token?.hexBase || stripToneFromHex(hex),
        hasTone: typeof token?.hasTone === "boolean" ? token.hasTone : TONE_REGEX.test(cluster),
        asset: token?.asset || assetPathForCluster(cluster),
      };
    });

    const policyAppliedTokens = applyPolicyToTokens(normalizedSourceTokens);
    const candidateTokens =
      Array.isArray(policyAppliedTokens) && policyAppliedTokens.length
        ? policyAppliedTokens
        : normalizedSourceTokens;

    return candidateTokens.map((token) => {
      const cluster = token?.cluster || "";
      const hex = token?.hex || toHex(cluster);
      return {
        ...token,
        cluster,
        hex,
        hexBase: token?.hexBase || stripToneFromHex(hex),
        hasTone: typeof token?.hasTone === "boolean" ? token.hasTone : TONE_REGEX.test(cluster),
        asset: token?.asset || assetPathForCluster(cluster),
      };
    });
  }, [currentMovie]);

  const resolvedHints = useMemo(() => {
    if (!currentMovie || !Array.isArray(currentMovie.hints)) {
      return [];
    }

    const gridClusters = policyTokens.map((token) => token.cluster);
    let cursor = 0;

    return currentMovie.hints.map((rawHint, index) => {
      const { emojiText, message } = parseHint(rawHint);
      const hintClusters = splitGraphemes(emojiText);

      let span = [];
      if (hintClusters.length) {
        const fromCursor = findContiguousSpan(gridClusters, hintClusters, cursor);
        const fromStart = fromCursor === -1 ? findContiguousSpan(gridClusters, hintClusters, 0) : fromCursor;
        const matchStart = fromCursor !== -1 ? fromCursor : fromStart;
        if (matchStart !== -1) {
          span = Array.from({ length: hintClusters.length }, (_, offset) => matchStart + offset);
          cursor = matchStart + hintClusters.length;
        }
      }

      return {
        id: index,
        rawHint,
        message,
        emojiText,
        hintClusters,
        span,
      };
    });
  }, [currentMovie, policyTokens]);

  const showHint = useCallback((hintObj) => {
    const { emojiText, message, id } = hintObj;
    const hintClusters = Array.isArray(hintObj?.hintClusters)
      ? hintObj.hintClusters
      : splitGraphemes(emojiText);
    const span = Array.isArray(hintObj?.span) ? hintObj.span : [];

    setActiveHint({ id, message, emojiText, hintClusters, span });
    setShowHintBar(true);
    setHintText(message);
    setCountdown(HINT_DURATION);
    highlightHintTokens({ id, message, emojiText, hintClusters, span }, policyTokens);

    // Auto-close after HINT_DURATION seconds
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      closeHint();
    }, HINT_DURATION * 1000);
  }, [policyTokens, closeHint, highlightHintTokens]);

  const previewHint = useCallback((hintObj) => {
    if (!hintObj?.emojiText || !Array.isArray(hintObj?.hintClusters)) {
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      return;
    }
    highlightHintTokens(hintObj, policyTokens);
  }, [highlightHintTokens, policyTokens]);

  const restoreHintPreview = useCallback(() => {
    if (activeHint?.emojiText) {
      highlightHintTokens(activeHint, policyTokens);
      return;
    }
    setHighlightedEmojis([]);
    setDimmedEmojis([]);
  }, [activeHint, highlightHintTokens, policyTokens]);

  const toggleHintRail = useCallback(() => {
    if (isHintActive) return;
    setIsHintRailExpanded((prev) => !prev);
  }, [isHintActive]);

  const handleHintClick = useCallback(() => {
    if (isHintActive || hintExhausted || !currentMovie) return;
    const nextHint = resolvedHints[hintIndex];
    if (!nextHint) return;

    setHintHistory((prev) => [...prev, nextHint]);
    setHintIndex((prev) => prev + 1);
    setRefereeData((prevData) => ({
      ...prevData,
      hintsUsed: prevData.hintsUsed + 1,
    }));
    showHint(nextHint);
  }, [isHintActive, hintExhausted, currentMovie, hintIndex, resolvedHints, showHint, setRefereeData]);

  const handleExit = () => {
    if (exitTimerRef.current) return;

    const summary =
      currentMovie && currentMovie.title
        ? {
            title: currentMovie.title,
            tokenHex: currentMovie.tokenHex || [],
            emojiString: currentMovie.emojiString || "",
            tokens: currentMovie.tokens || [],
            guesses: usedGuesses.length,
            hintsUsed: hintHistory.length,
            elapsedMs: calculateElapsedMs(),
            breakdown: currentMovie.breakdown || [],
            isVictory: false,
          }
        : null;

    setRefereeData((prevData) => ({
      ...prevData,
      time: calculateElapsedMs(),
      guesses: usedGuesses.length,
      hintsUsed: hintHistory.length,
    }));

    resetHintAndEmoji();
    closeHint();
    setExitGlyph(EXIT_SAD_ICON);
    exitTimerRef.current = setTimeout(() => {
      setExitGlyph(EXIT_ICON);
      exitTimerRef.current = null;
      onExit(summary);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const node = document.createElement("div");
    node.className = "overlay-exit-btn";
    document.body.appendChild(node);
    exitOverlayRef.current = node;
    return () => {
      exitOverlayRef.current = null;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const node = document.createElement("div");
    node.className = "overlay-hint-rail";
    document.body.appendChild(node);
    hintRailOverlayRef.current = node;
    return () => {
      hintRailOverlayRef.current = null;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  const exitButtonPortal =
    exitOverlayRef.current && typeof document !== "undefined"
      ? createPortal(
          <button className="exit-game" type="button" onClick={handleExit} aria-label="Exit game">
            <EmojiIcon asset={assetPathForCluster(exitGlyph)} cluster={exitGlyph} size={28} />
          </button>,
          exitOverlayRef.current
        )
      : null;

  // UI emoji for hint pills (question mark)
  const questionMarkToken = {
    asset: "/vendor/fluent-emoji/2753.svg",
    hex: "2753",
    hasTone: false,
  };

  // UI emoji for revealed hint pills (exclamation mark)
  const exclamationToken = {
    asset: "/vendor/fluent-emoji/2757.svg",
    hex: "2757",
    hasTone: false,
  };

  // UI emoji for close button (cross mark)
  const crossMarkToken = {
    asset: "/vendor/fluent-emoji/274c.svg",
    hex: "274c",
    hasTone: false,
  };

  const hintRailPortal =
    hintRailOverlayRef.current && hintHistory.length > 0 && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`hintHistoryRail ${isHintRailExpanded ? "hintHistoryRail-expanded" : "hintHistoryRail-collapsed"}`}
          >
            <div className="hintPillToggleStack">
              <button
                className="hintPill hintPill-toggle"
                type="button"
                aria-label={isHintRailExpanded ? "Hide previous hints" : "Show previous hints"}
                onClick={toggleHintRail}
              >
                <EmojiIcon
                  className="hintPillToggleIcon"
                  asset={questionMarkToken.asset}
                  hex={questionMarkToken.hex}
                  hasTone={questionMarkToken.hasTone}
                  size={22}
                />
              </button>
              <button
                className={`hintDrawerHandle ${isHintRailExpanded ? "hintDrawerHandle-open" : ""}`}
                type="button"
                aria-label={isHintRailExpanded ? "Collapse hint drawer" : "Expand hint drawer"}
                onClick={toggleHintRail}
              >
                <span
                  className="hintPillChevron"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
            </div>

            {isHintRailExpanded && hintHistory.map((hint) => {
              const isThisActive = activeHint && activeHint.id === hint.id;

              const pillIcon = isThisActive
                ? crossMarkToken   // active state -> show ❌
                : exclamationToken; // inactive state -> show ❗

              return (
                <button
                  key={hint.id}
                  className={`hintPill ${isThisActive ? "hintPill-active" : ""}`}
                  type="button"
                  aria-label={
                    isThisActive
                      ? `Hide hint ${hint.id + 1}`
                      : `Show hint ${hint.id + 1}`
                  }
                  onClick={() => {
                    if (isThisActive) {
                      // clicking the active pill hides the hint
                      closeHint();
                    } else {
                      // clicking an inactive pill shows that hint,
                      // but only if we're not currently counting down an active one
                      if (!isHintActive) {
                        showHint(hint);
                      }
                    }
                  }}
                  onMouseEnter={() => previewHint(hint)}
                  onMouseLeave={restoreHintPreview}
                  onFocus={() => previewHint(hint)}
                  onBlur={restoreHintPreview}
                >
                  <EmojiIcon
                    asset={pillIcon.asset}
                    hex={pillIcon.hex}
                    hasTone={pillIcon.hasTone}
                    size={28}
                  />
                </button>
              );
            })}
          </div>,
          hintRailOverlayRef.current
        )
      : null;

  return (
    <>
      {exitButtonPortal}
      {hintRailPortal}
      <div className={`game-screen ${hintHistory.length ? "has-hint-rail" : ""}`}>
        <div className="game-board">
          {currentMovie && (
            <div className="emojiGridWrap">
              <EmojiGrid
                tokens={policyTokens}
                highlightedEmojis={highlightedEmojis}
                dimmedEmojis={dimmedEmojis}
                compactMode={hintHistory.length > 0}
              />
            </div>
          )}
        </div>
        <div className="game-input">
          <div className="hintZone">
            {showHintBar && activeHint && (
              <div className="hintBar">
                {/*
                  We intentionally avoid aria-live / role=status here because on macOS some global
                  assistants treat live regions as a help request and steal OS focus. We keep the
                  hint fully visual so we don't bounce the user out of the browser/app.
                */}
                <div className="hintBarRow">
                  <span className="copy">{hintText}</span>

                  <span className="countCluster">
                    <span className="separator">•</span>
                    <span className="count">{countdown}</span>
                  </span>

                  <button
                    type="button"
                    className="hintCloseInlineBare"
                    aria-label="Close hint"
                    onClick={closeHint}
                  >
                    <span className="hintCloseGlyph">
                      <EmojiIcon
                        asset={crossMarkToken.asset}
                        hex={crossMarkToken.hex}
                        hasTone={crossMarkToken.hasTone}
                        size={14}
                      />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="search-bar">
            <input
              id="movie-guess"
              className="text-input"
              type="text"
              value={guess}
              onChange={handleGuessChange}
              placeholder="Guess the movie..."
            />
            <div className="search-results scrollArea">
              {searchResults.map((movie, index) => {
                const isThisCorrect =
                  isCorrect === true && movie.title.toLowerCase() === submittedGuess;
                const isThisWrong =
                  isCorrect === false && movie.title.toLowerCase() === submittedGuess;

                const arrowToken = {
                  asset: "/vendor/fluent-emoji/27a1-fe0f.svg",
                  cluster: "➡",
                  hex: "27a1-fe0f",
                  hasTone: false,
                };

                const celebrationToken = {
                  asset: "/vendor/fluent-emoji/1f389.svg",
                  cluster: "🎉",
                  hex: "1f389",
                  hasTone: false,
                };

                const crossToken = {
                  asset: "/vendor/fluent-emoji/274c.svg",
                  cluster: "❌",
                  hex: "274c",
                  hasTone: false,
                };

                const iconToken = isThisCorrect
                  ? celebrationToken
                  : isThisWrong
                    ? crossToken
                    : arrowToken;

                return (
                  <div
                    key={`${movie.title}-${index}`}
                    className={`result-item ${isThisWrong ? "wrong-guess" : isThisCorrect ? "correct-guess" : ""}`}
                    onClick={() => submitGuess(movie.title)}
                  >
                    <span className="guess-option-title">{movie.title}</span>
                    <button
                      type="button"
                      className="result-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        submitGuess(movie.title);
                      }}
                    >
                      <EmojiIcon
                        asset={iconToken.asset}
                        cluster={iconToken.cluster}
                        hex={iconToken.hex}
                        hasTone={iconToken.hasTone}
                        size={24}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <HintButton displayHint={handleHintClick} disabled={isHintActive || hintExhausted} />
        </div>
      </div>
    </>
  );
};

export default Game;
