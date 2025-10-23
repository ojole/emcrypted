import React from "react";

const HintButton = ({ displayHint, disabled }) => {
  return (
    <div className="hint-button">
      <button className="btn hint-btn" type="button" onClick={displayHint} disabled={disabled}>
        Hint
      </button>
    </div>
  );
};

export default HintButton;
