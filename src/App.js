import React, { useState } from "react";
import Game from "./data/Game";
import Home from "./components/Home";
import VictoryScreen from "./components/VictoryScreen";
import BetterLuckNextTimeScreen from "./components/BetterLuckNextTimeScreen";
import ResultScreen from "./components/ResultScreen";
import Referee from "./components/Referee";
import "./App.css";

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [lastGameData, setLastGameData] = useState(null);
  const [refereeData, setRefereeData] = useState({ time: 0, guesses: 0, hintsUsed: 0 });

  const startGame = () => {
    setRefereeData({ time: 0, guesses: 0, hintsUsed: 0 });
    setLastGameData(null);
    setCurrentScreen("game");
  };

  // temporary placeholders so the buttons do something visible
  const notImplemented = (label) => () => {
    // swap these to real screens as they’re built
    alert(`${label} coming soon`);
  };

  const showVictoryScreen = (gameData) => {
    setLastGameData(gameData);
    setCurrentScreen("victory");
  };

  const showBetterLuckNextTimeScreen = (gameData) => {
    setLastGameData(gameData);
    setCurrentScreen("betterLuckNextTime");
  };

  const showResultScreen = () => {
    if (lastGameData) setCurrentScreen("result");
    else setCurrentScreen("home");
  };

  const goHome = () => setCurrentScreen("home");

  return (
    <div className="App">
      <Referee refereeData={refereeData} setRefereeData={setRefereeData} />

      {currentScreen === "home" && (
        <Home
          onStart={startGame}
          onLogin={notImplemented("Login")}
          onSignup={notImplemented("Signup")}
          onLeaderboards={notImplemented("Leaderboards")}
        />
      )}

      {currentScreen === "game" && (
        <Game
          onVictory={showVictoryScreen}
          onExit={showBetterLuckNextTimeScreen}
          refereeData={refereeData}
          setRefereeData={setRefereeData}
        />
      )}

      {currentScreen === "victory" && lastGameData && (
        <VictoryScreen
          gameData={lastGameData}
          onNextGame={startGame}
          onResult={showResultScreen}
        />
      )}

      {currentScreen === "betterLuckNextTime" && lastGameData && (
        <BetterLuckNextTimeScreen gameData={lastGameData} onNextGame={startGame} />
      )}

      {currentScreen === "result" && lastGameData && (
        <ResultScreen
          gameData={lastGameData}
          refereeData={refereeData}
          onHome={goHome}
          onNextGame={startGame}
        />
      )}
    </div>
  );
};

export default App;