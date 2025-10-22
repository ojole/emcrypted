import React, { useState, useEffect, useCallback } from "react";
import EmojiGrid from "./EmojiGrid";
import HintButton from "./HintButton";
import Header from "./Header";
import "./Game.css";
import { splitEmojiClusters } from "../utils/emojiSegment";

const Game = ({ onVictory, onExit, refereeData, setRefereeData }) => {
  const [moviesList, setMoviesList] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [guess, setGuess] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [hintTimer, setHintTimer] = useState(10);
  const [isCorrect, setIsCorrect] = useState(null);
  const [highlightedEmojis, setHighlightedEmojis] = useState([]);
  const [dimmedEmojis, setDimmedEmojis] = useState([]);
  const [usedGuesses, setUsedGuesses] = useState([]);
  const [currentHint, setCurrentHint] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);

  const resetHintAndEmoji = () => {
    setCurrentHint("");
    setHighlightedEmojis([]);
    setDimmedEmojis([]);
    setShowHint(false);
  };

  const startNewGame = useCallback(
    (movies) => {
      const randomIndex = Math.floor(Math.random() * movies.length);
      setSessionStartTime(Date.now());
      setCurrentMovie(movies[randomIndex]);
      setHintIndex(0);
      setShowHint(false);
      setHintTimer(10);
      setIsCorrect(null);
      setGuess("");
      setHighlightedEmojis([]);
      setDimmedEmojis([]);
      setUsedGuesses([]);
      setGameOver(false);
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
        startNewGame(movies);
        setMoviesList(movies);
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
    if (hintIndex < currentMovie.hints.length) {
      const hintText = currentMovie.hints[hintIndex].split(" - ")[1];
      setShowHint(true);
      setCurrentHint(hintText);
      setHintTimer(10);
      highlightHintEmojis(hintText, currentMovie.output);
      setHintIndex((prev) => prev + 1);

      setRefereeData((prevData) => ({
        ...prevData,
        hintsUsed: prevData.hintsUsed + 1,
      }));

      const interval = setInterval(() => {
        setHintTimer((prev) => {
          if (prev === 1) {
            clearInterval(interval);
            resetHintAndEmoji();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const highlightHintEmojis = (hintText, emojiSequence) => {
    const analyzedEmojis = splitEmojiClusters(emojiSequence);
    const hintEmojis = splitEmojiClusters(hintText);

    let matchIndex = 0;
    const highlighted = [];
    const dimmed = [];

    for (let i = 0; i < analyzedEmojis.length; i += 1) {
      if (analyzedEmojis[i] === hintEmojis[matchIndex]) {
        highlighted.push(i);
        matchIndex += 1;
        if (matchIndex === hintEmojis.length) {
          break;
        }
      } else {
        dimmed.push(i);
      }
    }

    setHighlightedEmojis(highlighted);
    setDimmedEmojis(dimmed);
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
        <button className="exit-game" onClick={onExit}>
          ❎
        </button>
      </span>
      {currentMovie && (
        <EmojiGrid
          emojiSequence={currentMovie.output}
          highlightedEmojis={highlightedEmojis}
          dimmedEmojis={dimmedEmojis}
        />
      )}
      {showHint && (
        <div id="hint-text-container">
          {currentHint}
          <span id="countdown-timer">{hintTimer}</span>
        </div>
      )}
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
              <button>
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
