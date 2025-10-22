import React from "react";

const Home = ({ onStart, onLogin, onSignup, onLeaderboards }) => {
  return (
    <div className="home">
      <h1 className="emcrypted-title">EMCRYPTED</h1>
      <div className="home-actions">
        <button className="btn" onClick={onStart}>
          Start
        </button>
        <button className="btn" onClick={onLogin}>
          Login
        </button>
        <button className="btn" onClick={onSignup}>
          Signup
        </button>
        <button className="btn" onClick={onLeaderboards}>
          Leaderboards
        </button>
      </div>
    </div>
  );
};

export default Home;
