import React from "react";

const ResultScreen = ({ gameData, refereeData, onHome, onNextGame }) => {
  return (
    <div className="result-screen">
      <h2>Game Results</h2>
      <p>Time: {refereeData.time} seconds</p>
      <p>Guesses: {refereeData.guesses}</p>
      <p>Hints Used: {refereeData.hintsUsed}</p>
      <button className="hint-btn" onClick={onHome}>
        🏠 Home
      </button>
      <button className="hint-btn" onClick={onNextGame}>
        Next Game
      </button>
      <button className="hint-btn" onClick={() => alert('Share feature coming soon!')}>
        Share Results
      </button>
    </div>
  );
};

export default ResultScreen;











