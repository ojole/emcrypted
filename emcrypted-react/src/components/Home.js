import React from "react";

const Home = ({ onStart }) => {
  return (
    <div className="home-screen">
      <h1 className="emcrypted-title">EMCRYPTED</h1>
      <button className="hint-btn" onClick={onStart}> Start </button>
      <button className="hint-btn">Login</button>
      <button className="hint-btn">Signup</button>
      <button className="hint-btn">Leaderboards</button>
    </div>
  );
};

export default Home;
