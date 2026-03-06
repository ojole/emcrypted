import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../theme/ThemeContext';
import { getLeaderboard } from '../data/fakeDb';
import { formatMilliseconds } from '../utils/formatTime';
import FloatingCornerButton from './ui/FloatingCornerButton';
import '../styles/ArcadeTable.css';
import '../styles/Leaderboards.css';

const LeaderboardsScreen = () => {
  const navigate = useNavigate();
  const { theme } = useThemeContext();
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const leaderboardAsciiSrc = theme === 'dark'
    ? `${publicUrl}/data/LEADERBOARD_ascii_white.gif`
    : `${publicUrl}/data/LEADERBOARD_ascii_black.gif`;

  // Get sorted leaderboard data
  const leaderboard = useMemo(() => getLeaderboard(), []);

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="leaderboardsScreen">
      {/* Floating back button (top-left) */}
      <FloatingCornerButton
        emoji="🚪"
        onClick={handleBackHome}
        ariaLabel="Back to home"
      />

      <div className="leaderboardPanel">
        <div className="centerPanel">
          {/* Animated GIF header based on theme */}
          <header className="panelHeader">
            <img
              className="authHeaderGif"
              src={leaderboardAsciiSrc}
              alt="Leaderboard"
            />
          </header>

          {/* Arcade table wrapper */}
          <div className="arcadeTableWrapper" style={{ '--arcade-grid-columns': '50px 1fr 80px 80px 90px 1.2fr' }}>
            <div className="arcadeTableScroll scrollArea">
              {/* Sticky header row */}
              <div className="arcadeHeaderRow">
                <div className="arcadeHeaderCell">#</div>
                <div className="arcadeHeaderCell">Player</div>
                <div className="arcadeHeaderCell">Guesses</div>
                <div className="arcadeHeaderCell">Hints</div>
                <div className="arcadeHeaderCell">Time</div>
                <div className="arcadeHeaderCell movie-title">Movie</div>
              </div>

              {/* Body rows */}
              {leaderboard.length === 0 ? (
                <div className="arcadeRow" style={{ justifyContent: 'center', padding: '40px 20px', gridColumn: '1 / -1' }}>
                  <div style={{ textAlign: 'center', opacity: 0.7 }}>
                    No games played yet. Be the first!
                  </div>
                </div>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div className="arcadeRow" key={`${entry.usernameOrTag}-${entry.timestamp}-${idx}`}>
                    <div className="arcadeCell">{idx + 1}</div>
                    <div className="arcadeCell player-name">{entry.usernameOrTag}</div>
                    <div className="arcadeCell">{entry.guesses}</div>
                    <div className="arcadeCell">{entry.hintsUsed}</div>
                    <div className="arcadeCell">{formatMilliseconds(entry.elapsedMs)}</div>
                    <div className="arcadeCell movie-title">{entry.title}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsScreen;
