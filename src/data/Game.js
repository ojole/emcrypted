import React, { useState, useEffect, useCallback } from "react";
import EmojiGrid from "./EmojiGrid";
import HintButton from "./HintButton";
import Header from "./Header";
import EmojiIcon from "../utils/EmojiIcon";
import "./Game.css";

const HINT_DURATION = 10;

const segmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const splitGraphemes = (value) => {
  if (!value) return [];
  if (segmenter) {
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }
  const pieces = [];
  for (const char of value) pieces.push(char);
  return pieces;
};

const toHex = (cluster) => {
  if (!cluster) return "";
  const codes = [];
  for (const char of cluster) {
    codes.push(char.codePointAt(0).toString(16));
  }
  return codes.join("-");
};

const normalizeMovies = (data) => {
  const list = Array.isArray(data) ? data : Object.values(data || {});
  return list.filter(Boolean);
};

const ensureMovieTokens = (movie) => {
  if (!movie) return movie;
  const rawTokens = Array.isArray(movie.tokens) ? movie.tokens : [];
  const tokens = rawTokens.length
    ? rawTokens.map((token) => ({
        cluster: token.cluster ?? token.text ?? "",
        hex: token.hex ?? (token.cluster ? toHex(token.cluster) : ""),
        asset: token.asset ?? null,
      }))
    : splitGraphemes(movie.output || "").map((cluster) => ({
        cluster,
        hex: toHex(cluster),
        asset: null,
      }));
  return { ...movie, tokens };
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
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [exitGlyph, setExitGlyph] = useState("❎");

  const resetHintAndEmoji = useCallback(() => {
    setHintText("");
    setShowHintBar(false);
    setCountdown(0);
    setHighlightedEmojis([]);
    setDimmedEmojis([]);
  }, []);

  const highlightHintTokens = useCallback(
    (hintClusters, tokens) => {
      if (!Array.isArray(tokens) || !tokens.length || !hintClusters.length) {
        setHighlightedEmojis([]);
        setDimmedEmojis([]);
        return;
      }

      const gridClusters = tokens.map((token) => token.cluster);
      const highlighted = [];
      const dimmed = [];
      let matchIndex = 0;

      for (let i = 0; i < gridClusters.length; i += 1) {
        if (gridClusters[i] === hintClusters[matchIndex]) {
          highlighted.push(i);
          matchIndex += 1;
          if (matchIndex === hintClusters.length) {
            break;
          }
        } else {
          dimmed.push(i);
        }
      }

      setHighlightedEmojis(highlighted);
      setDimmedEmojis(dimmed);
    },
    [setHighlightedEmojis, setDimmedEmojis]
  );

  const startNewGame = useCallback(
    (movies) => {
      if (!movies?.length) return;
      const randomIndex = Math.floor(Math.random() * movies.length);
      const selected = ensureMovieTokens(movies[randomIndex]);
      setSessionStartTime(Date.now());
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
      setExitGlyph("❎");
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
          moviesData = await loadMovies("/data/moviesG2G.compiled.json");
        } catch (err) {
          if (err.status && err.status !== 404) {
            console.warn("Failed to load compiled puzzles, falling back", err);
          }
          if (!err.status || err.status === 404) {
            moviesData = await loadMovies("/data/moviesG2G.json");
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

  const handleGuessChange = (e) => {
    const userInput = e.target.value;
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

  const calculateSessionTime = useCallback(() => {
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    return `${duration} seconds`;
  }, [sessionStartTime]);

  useEffect(() => {
    if (gameOver) {
      setRefereeData((prevData) => ({
        ...prevData,
        time: calculateSessionTime(),
      }));
    }
  }, [gameOver, setRefereeData, calculateSessionTime]);

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

  const submitGuess = (movieTitle) => {
    setUsedGuesses((prev) => [...prev, movieTitle.toLowerCase()]);
    if (!currentMovie) return;
    if (movieTitle.toLowerCase() === currentMovie.title.toLowerCase()) {
      setIsCorrect(true);
      setGameOver(true);
      setTimeout(() => {
        onVictory({
          title: currentMovie.title,
          hintsUsed: hintIndex,
          guesses: guess.length,
          sessionTime: calculateSessionTime(),
          breakdown: currentMovie.breakdown,
        });
      }, 1000);
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
    if (!currentMovie || hintIndex >= currentMovie.hints.length) return;
    const rawHint = currentMovie.hints[hintIndex];
    const { emojiText, message } = parseHint(rawHint);
    const hintClusters = splitGraphemes(emojiText);

    setShowHintBar(true);
    setHintText(message || rawHint);
    setCountdown(HINT_DURATION);
    highlightHintTokens(hintClusters, currentMovie.tokens);
    setHintIndex((prev) => prev + 1);

    setRefereeData((prevData) => ({
      ...prevData,
      hintsUsed: prevData.hintsUsed + 1,
    }));
  };

  const handleExit = () => {
    setExitGlyph("😞");
    setTimeout(() => {
      setExitGlyph("❎");
      onExit();
    }, 200);
  };

  return (
    <div className="game-screen">
      <Header />
      <span id="exit-container">
        <button className="exit-game" onClick={handleExit}>
          <EmojiIcon text={exitGlyph} size={36} />
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
              key={index}
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
      <HintButton displayHint={handleHintClick} />
    </div>
  );
};

export default Game;
