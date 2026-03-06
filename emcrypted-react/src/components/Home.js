import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../data/Header";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="phoneCard">
      <div className="home-screen">
        <Header />
        <button className="btn btn-lg" type="button" onClick={() => navigate('/start')}>
          Start
        </button>
        <button className="btn btn-lg" type="button" onClick={() => navigate('/login')}>
          Login
        </button>
        <button className="btn btn-lg" type="button" onClick={() => navigate('/signup')}>
          Signup
        </button>
        <button className="btn btn-lg" type="button" onClick={() => navigate('/high-scores')}>
          High Scores
        </button>
      </div>
    </div>
  );
};

export default Home;
