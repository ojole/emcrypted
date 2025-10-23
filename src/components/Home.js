import React from "react";

const Home = ({ onStart, onLogin, onSignup, onLeaderboards }) => {
  return (
    <div className="home-screen">
      <h1 className="emcrypted-title">EMCRYPTED</h1>
      <button className="btn hint-btn" type="button" onClick={onStart}>Start</button>
      <button className="btn hint-btn" type="button" onClick={onLogin}>Login</button>
      <button className="btn hint-btn" type="button" onClick={onSignup}>Signup</button>
      <button className="btn hint-btn" type="button" onClick={onLeaderboards}>Leaderboards</button>
    </div>
  );
};

export default Home;
