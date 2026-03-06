import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Game from '../data/Game';
import VictoryScreen from './VictoryScreen';
import BetterLuckNextTimeScreen from './BetterLuckNextTimeScreen';
import Referee from './Referee';

const GameFlow = () => {
  const navigate = useNavigate();
  const { addRoundToHistory } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('game');
  const [lastGameData, setLastGameData] = useState(null);
  const [refereeData, setRefereeData] = useState({ time: 0, guesses: 0, hintsUsed: 0 });

  const startNewGame = () => {
    setRefereeData({ time: 0, guesses: 0, hintsUsed: 0 });
    setLastGameData(null);
    setCurrentScreen('game');
  };

  const showVictoryScreen = (gameData) => {
    // Save to history/leaderboard
    if (gameData && gameData.title) {
      addRoundToHistory({
        title: gameData.title,
        guesses: gameData.guesses || 0,
        hintsUsed: gameData.hintsUsed || 0,
        elapsedMs: gameData.sessionTime || 0,
        isVictory: gameData?.isVictory !== false,
      });
    }
    setLastGameData(gameData);
    setCurrentScreen('victory');
  };

  const showBetterLuckNextTimeScreen = (gameData) => {
    // Save to history/leaderboard
    if (gameData && gameData.title) {
      addRoundToHistory({
        title: gameData.title,
        guesses: gameData.guesses || 0,
        hintsUsed: gameData.hintsUsed || 0,
        elapsedMs: gameData.elapsedMs || 0,
        isVictory: gameData?.isVictory ?? false,
      });
    }
    setLastGameData(gameData);
    setCurrentScreen('betterLuckNextTime');
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <>
      <Referee refereeData={refereeData} setRefereeData={setRefereeData} />

      {currentScreen === 'game' && (
        <div className="phoneCard phoneCard--game">
          <Game
            onVictory={showVictoryScreen}
            onExit={showBetterLuckNextTimeScreen}
            refereeData={refereeData}
            setRefereeData={setRefereeData}
          />
        </div>
      )}

      {currentScreen === 'victory' && lastGameData && (
        <VictoryScreen
          gameData={lastGameData}
          onNextGame={startNewGame}
          onHome={goHome}
        />
      )}

      {currentScreen === 'betterLuckNextTime' && lastGameData && (
        <BetterLuckNextTimeScreen
          gameData={lastGameData}
          onNextGame={startNewGame}
          onHome={goHome}
        />
      )}
    </>
  );
};

export default GameFlow;
