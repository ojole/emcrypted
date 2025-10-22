import React from 'react';

const HintButton = ({ displayHint }) => {
  return (
    <div className="hint-button">
      <button className="btn hint-btn" onClick={displayHint}>
        Hint
      </button>
    </div>
  );
};

export default HintButton;
