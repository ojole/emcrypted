import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';
import GameHistoryRow from './GameHistoryRow';
import PrimaryButton from './PrimaryButton';
import '../styles/ArcadeFont.css';
import '../styles/ScoreTable.css';
import '../styles/Profile.css';
import '../styles/Auth.css';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { isAuthenticated, username, history } = useAuth();
  const { theme } = useThemeContext();
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handlePlayGame = () => {
    navigate('/start');
  };

  const isDark = theme === 'dark';
  const profileAsciiSrc = isDark
    ? `${publicUrl}/data/PROFILE_ascii_white.gif`
    : `${publicUrl}/data/PROFILE_ascii_black.gif`;

  return (
    <div className="phoneCard profileCard">
      <header className="panelHeader profileHeader">
        <img
          className="authHeaderGif"
          src={profileAsciiSrc}
          alt="Profile"
        />
      </header>

      <div className="profileWelcome">Welcome, {username}</div>

      <section className="historySection">
        <div className="scoreTableWrapper profileTableBlock">
          <div className="scoreTableScroll scrollArea">
            {history.length === 0 ? (
              <div className={`scoreTableNoData ${isDark ? 'dark' : ''}`}>
                NO GAMES PLAYED YET. CLICK "PLAY NOW 🎮" BELOW TO START!
              </div>
            ) : (
              history.map((game, idx) => (
                <GameHistoryRow
                  key={`${game.timestamp}-${idx}`}
                  game={game}
                  isDark={isDark}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <div className="profilePlaySection">
        <PrimaryButton
          iconEmoji="🎮"
          label="Play Now"
          onClick={handlePlayGame}
        />
      </div>
    </div>
  );
};

export default ProfileScreen;
