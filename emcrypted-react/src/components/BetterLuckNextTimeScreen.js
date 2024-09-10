import React from "react";

const BetterLuckNextTimeScreen = ({ gameData, onNextGame }) => {
  return (
    <div className="better-luck-next-time-screen">
      <div className="better-luck-message">
        Better Luck Next Time! 💔
      </div>
      <h2 className="result-title">{gameData.title}</h2>
      <div className="breakdown-container">
        {gameData.breakdown && gameData.breakdown.length > 0 ? (
          gameData.breakdown.map((item, index) => (
            <p key={index}>{item}</p>
          ))
        ) : (
          <p>No breakdown available.</p>
        )}
      </div>
      <button className="hint-btn" onClick={onNextGame}>
        Next Game
      </button>
    </div>
  );
};

export default BetterLuckNextTimeScreen;
