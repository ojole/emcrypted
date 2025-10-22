// ShareButton.js

import React from 'react';

const ShareButton = ({ results }) => {
  const shareResults = () => {
    const text = `I finished the game in ${results.time} seconds, with ${results.guesses} guesses and used ${results.hints} hints!`;
    if (navigator.share) {
      navigator.share({
        title: 'EMCRYPTED Game Results',
        text: text,
        url: window.location.href,
      });
    } else {
      alert("Share not supported, copy this text: " + text);
    }
  };

  return <button onClick={shareResults}>Share</button>;
};

export default ShareButton;
