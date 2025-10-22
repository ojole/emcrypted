import React from 'react';

const HintButton = ({ displayHint }) => {
  return (
    <div>
      <button className="hint-btn" onClick={displayHint}>
        Hint
      </button>
    </div>
  );
};

export default HintButton;
