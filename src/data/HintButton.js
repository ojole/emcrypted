import React from "react";

const HintButton = ({ displayHint, disabled }) => {
  return (
    <div>
      <button className="hint-btn" type="button" onClick={displayHint} disabled={disabled}>
        Hint
      </button>
    </div>
  );
};

export default HintButton;
