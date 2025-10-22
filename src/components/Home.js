import React from "react";

const Home = ({ onStart, onLogin, onSignup, onLeaderboards }) => {
  return (
    <div className="home-screen">
      <h1 className="emcrypted-title">EMCRYPTED</h1>
      <button className="hint-btn" onClick={onStart}>Start</button>
      <button className="hint-btn" onClick={onLogin}>Login</button>
      <button className="hint-btn" onClick={onSignup}>Signup</button>
      <button className="hint-btn" onClick={onLeaderboards}>Leaderboards</button>
    </div>
  );
};

export default Home;