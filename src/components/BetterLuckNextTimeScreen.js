import React from "react";
import EmojiIcon from "./EmojiIcon";

const BetterLuckNextTimeScreen = ({ gameData, onNextGame, onClose }) => {
  const handleClose = onClose || onNextGame;

  return (
    <div className="better-luck-next-time-screen">
      <button className="close-btn" type="button" onClick={handleClose} aria-label="Close">
        <EmojiIcon char="❎" size={28} />
      </button>
      <div className="better-luck-message">
        Better Luck Next Time! 💔
      </div>
      <h2 className="result-title">{gameData.title}</h2>
      <div className="breakdown-container">
        {gameData.breakdown && gameData.breakdown.length > 0 ? (
          gameData.breakdown.map((item, index) => <p key={index}>{item}</p>)
        ) : (
          <p>No breakdown available.</p>
        )}
      </div>
      <button className="hint-btn" onClick={onNextGame} type="button">
        Next Game
      </button>
    </div>
  );
};

export default BetterLuckNextTimeScreen;
