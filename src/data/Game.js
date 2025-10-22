import React, { useState, useEffect, useCallback } from "react";
import EmojiGrid from "./EmojiGrid";
import HintButton from "./HintButton";
import Header from "./Header";
import EmojiIcon from "../components/EmojiIcon";
import "./Game.css";
import { indicesForHint } from "../utils/hintMapping";

const Game = ({ onVictory, onExit, setRefereeData }) => {
  const [moviesList, setMoviesList] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [guess, setGuess] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [highlightedEmojis, setHighlightedEmojis] = useState([]);
  const [dimmedEmojis, setDimmedEmojis] = useState([]);
  const [usedGuesses, setUsedGuesses] = useState([]);
  const [currentHint, setCurrentHint] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);

  const computeDimmed = useCallback((total, highlightedIdxs) => {
    const highlightSet = new Set(highlightedIdxs);
    const remainder = [];
    for (let i = 0; i < total; i += 1) {
      if (!highlightSet.has(i)) {
        remainder.push(i);
      }
    }
    return remainder;
  }, []);

  const startNewGame = useCallback(
    (movies) => {
      const randomIndex = Math.floor(Math.random() * movies.length);
      const nextMovie = movies[randomIndex];
      setSessionStartTime(Date.now());
      setCurrentMovie(nextMovie);
      setHintIndex(0);
      setCurrentHint(null);
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      setIsCorrect(null);
      setGuess("");
      setUsedGuesses([]);
      setGameOver(false);
      setSearchResults([]);
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
      try {
        const response = await fetch("/data/moviesG2G.json");
        const movies = await response.json();
        setMoviesList(movies);
        startNewGame(movies);
      } catch (error) {
        console.error("Error fetching movies:", error);
      }
    };

    fetchMoviesList();
  }, [startNewGame]);

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

  const submitGuess = (movieTitle) => {
    setUsedGuesses([...usedGuesses, movieTitle.toLowerCase()]);
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
    if (!currentMovie) return;
    const hints = currentMovie.hints || [];

    if (hintIndex >= hints.length) {
      return;
    }

    const nextHint = hints[hintIndex];
    const { indices, total } = indicesForHint(nextHint, currentMovie.output);

    setCurrentHint(nextHint);
    setHighlightedEmojis(indices);
    setDimmedEmojis(indices.length ? computeDimmed(total, indices) : []);
    setHintIndex((prev) => prev + 1);

    setRefereeData((prevData) => ({
      ...prevData,
      hintsUsed: prevData.hintsUsed + 1,
    }));
  };

  const handleExitGame = () => {
    if (!currentMovie) return;
    const sessionTime = calculateSessionTime();

    setGameOver(true);
    setRefereeData((prevData) => ({
      ...prevData,
      time: sessionTime,
    }));

    onExit({
      title: currentMovie.title,
      hintsUsed: hintIndex,
      guesses: guess.length,
      sessionTime,
      breakdown: currentMovie.breakdown,
    });
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

  return (
    <div className="game-screen">
      <Header />
      <span id="exit-container">
        <button className="exit-game" type="button" aria-label="Exit game" onClick={handleExitGame}>
          <EmojiIcon char="❎" size={32} />
        </button>
      </span>
      {currentMovie && (
        <EmojiGrid
          emojiSequence={currentMovie.output}
          highlightedEmojis={highlightedEmojis}
          dimmedEmojis={dimmedEmojis}
        />
      )}
      {currentHint && <div className="hint-text">{currentHint}</div>}
      <div className="search-bar">
        <input
          id="movie-guess"
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
      <HintButton
        displayHint={handleHintClick}
        disabled={!currentMovie || hintIndex >= (currentMovie?.hints?.length || 0)}
      />
    </div>
  );
};

export default Game;
