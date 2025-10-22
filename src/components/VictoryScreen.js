import React from "react";

const VictoryScreen = ({ gameData, onNextGame, onResult }) => {
  return (
    <div className="victory-screen">
      <div className="victory-message">
        🎉 Congratulations! You guessed correctly! 🎉
      </div>
      <h2 className="result-title">{gameData.title}</h2>
      <div className="breakdown-container">
        {gameData.breakdown.map((item, index) => (
          <p key={index}>{item}</p>
        ))}
      </div>
      <button className="hint-btn" onClick={onResult}>
        View Results
      </button>
      <button className="hint-btn" onClick={onNextGame}>
        Next Game
      </button>
    </div>
  );
};

export default VictoryScreen;
