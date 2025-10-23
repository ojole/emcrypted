import React, { useState, useEffect, useCallback, useRef } from "react";
import EmojiGrid from "./EmojiGrid";
import HintButton from "./HintButton";
import Header from "./Header";
import EmojiIcon from "../utils/EmojiIcon";
import "./Game.css";

const { splitGraphemes } = require("../utils/graphemes");

const HINT_DURATION = 10;
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

const normalizeMovies = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  return Object.values(data || {}).filter(Boolean);
};

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
        return {
          cluster,
          hex,
          asset: token?.asset ?? null,
        };
      })
    : baseClusters.map((cluster) => ({
        cluster,
        hex: toHex(cluster),
        asset: null,
      }));

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
  const [highlightedEmojis, setHighlightedEmojis] = useState([]);
  const [dimmedEmojis, setDimmedEmojis] = useState([]);
  const [usedGuesses, setUsedGuesses] = useState([]);
  const [sessionStartMs, setSessionStartMs] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [exitGlyph, setExitGlyph] = useState(EXIT_ICON);
  const exitTimerRef = useRef(null);

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

  const highlightHintTokens = useCallback((hintClusters, tokens) => {
    if (!Array.isArray(tokens) || !tokens.length || !hintClusters.length) {
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      return;
    }

    const gridClusters = tokens.map((token) => token.cluster);
    const length = hintClusters.length;
    let matchStart = -1;

    outer: for (let i = 0; i <= gridClusters.length - length; i += 1) {
      for (let j = 0; j < length; j += 1) {
        if (gridClusters[i + j] !== hintClusters[j]) {
          continue outer;
        }
      }
      matchStart = i;
      break;
    }

    let highlighted = [];
    if (matchStart !== -1) {
      highlighted = Array.from({ length }, (_, idx) => matchStart + idx);
    } else {
      const hintSet = new Set(hintClusters);
      highlighted = gridClusters
        .map((cluster, index) => (hintSet.has(cluster) ? index : -1))
        .filter((index) => index !== -1);
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
      setGameOver(false);
      setExitGlyph(EXIT_ICON);
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
          if (err.status && err.status !== 404) {
            console.warn("Failed to load compiled puzzles, falling back", err);
          }
          if (!err.status || err.status === 404) {
            moviesData = await loadMovies(FALLBACK_DATA_URL);
          }
        }

        const normalized = normalizeMovies(moviesData).map(ensureMovieTokens);
        setMoviesList(normalized);
        startNewGame(normalized);
      } catch (error) {
        console.error("Error fetching movies:", error);
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
  };

  const calculateElapsedMs = useCallback(() => Date.now() - sessionStartMs, [sessionStartMs]);

  const submitGuess = (movieTitle) => {
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
          hintsUsed: hintIndex,
          guesses: usedGuesses.length + 1,
          sessionTime: calculateElapsedMs(),
          breakdown: currentMovie.breakdown,
        });
      }, 600);
    } else {
      setIsCorrect(false);
      setSearchResults((prev) =>
        prev.filter((movie) => movie.title.toLowerCase() !== movieTitle.toLowerCase())
      );
      setTimeout(() => {
        setIsCorrect(null);
      }, 2000);
    }
  };

  const handleHintClick = () => {
    if (isHintActive || hintExhausted || !currentMovie) return;
    const rawHint = currentMovie.hints?.[hintIndex];
    if (!rawHint) return;
    const { emojiText, message } = parseHint(rawHint);
    const hintClusters = splitGraphemes(emojiText);

    setShowHintBar(true);
    setHintText(message || rawHint);
    setCountdown(HINT_DURATION);
    highlightHintTokens(hintClusters, currentMovie.tokens || []);
    setHintIndex((prev) => prev + 1);

    setRefereeData((prevData) => ({
      ...prevData,
      hintsUsed: prevData.hintsUsed + 1,
    }));
  };

  const handleExit = () => {
    if (exitTimerRef.current) return;

    const summary =
      currentMovie && currentMovie.title
        ? {
            title: currentMovie.title,
            tokenHex: currentMovie.tokenHex || [],
            emojiString: currentMovie.emojiString || "",
            guesses: usedGuesses.length,
            hintsUsed: hintIndex,
            elapsedMs: calculateElapsedMs(),
            breakdown: currentMovie.breakdown || [],
          }
        : null;

    setRefereeData((prevData) => ({
      ...prevData,
      time: calculateElapsedMs(),
      guesses: usedGuesses.length,
      hintsUsed: hintIndex,
    }));

    resetHintAndEmoji();
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
    };
  }, []);

  return (
    <div className="game-screen">
      <Header />
      <span id="exit-container">
        <button className="exit-game" type="button" onClick={handleExit}>
          <EmojiIcon asset={assetPathForCluster(exitGlyph)} cluster={exitGlyph} size={40} />
        </button>
      </span>
      {currentMovie && (
        <EmojiGrid
          tokens={currentMovie.tokens}
          highlightedEmojis={highlightedEmojis}
          dimmedEmojis={dimmedEmojis}
        />
      )}
      {showHintBar && (
        <div className="hint-bar">
          <span className="hint-text">{hintText}</span>
          <span className="hint-count">{countdown}</span>
        </div>
      )}
      <div className="search-bar">
        <input
          id="movie-guess"
          className="text-input"
          type="text"
          value={guess}
          onChange={handleGuessChange}
          placeholder="Guess the movie..."
        />
        <div className="search-results">
          {searchResults.map((movie, index) => (
            <div
              key={`${movie.title}-${index}`}
              className={`result-item ${
                isCorrect === false && movie.title.toLowerCase() === guess.toLowerCase()
                  ? "wrong-guess"
                  : isCorrect === true && movie.title.toLowerCase() === guess.toLowerCase()
                  ? "correct-guess"
                  : ""
              }`}
              onClick={() => submitGuess(movie.title)}
            >
              <span>{movie.title}</span>
              <button type="button">
                {isCorrect === false && movie.title.toLowerCase() === guess.toLowerCase()
                  ? "👎"
                  : isCorrect === true && movie.title.toLowerCase() === guess.toLowerCase()
                  ? "🎉"
                  : "➡️"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <HintButton displayHint={handleHintClick} disabled={isHintActive || hintExhausted} />
    </div>
  );
};

export default Game;
