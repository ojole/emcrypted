import React, { useMemo } from 'react';
import { useThemeContext } from '../theme/ThemeContext';
import { getLeaderboard } from '../data/fakeDb';
import { formatMilliseconds } from '../utils/formatTime';
import '../styles/ArcadeFont.css';
import '../styles/ScoreTable.css';
import '../styles/Auth.css';

const HighScoresScreen = () => {
  const { theme } = useThemeContext();
  const gamesSorted = useMemo(() => getLeaderboard(), []);
  const themeVariant = theme === 'dark' ? 'dark' : '';
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const highScoresAsciiSrc = theme === 'dark'
    ? `${publicUrl}/data/HIGH_SCORES_ascii_white.gif`
    : `${publicUrl}/data/HIGH_SCORES_ascii_black.gif`;

  return (
    <div className="phoneCard">
      <div className="panelHeader">
        <img
          className="authHeaderGif"
          src={highScoresAsciiSrc}
          alt="HIGH SCORES"
        />
      </div>

      <div className="highScoresSection">
        <div className="scoreTableWrapper highScoresTableBlock">
          <div className={`scoreTableHeaderRow ${themeVariant}`}>
            <div>#</div>
            <div>Player</div>
            <div>Guesses</div>
            <div>Hints</div>
            <div>Time</div>
            <div>Movie</div>
          </div>

          {gamesSorted.length === 0 ? (
            <div className={`scoreTableNoData ${themeVariant}`}>
              NO GAMES RECORDED. BE THE FIRST!
            </div>
          ) : (
            <div className="scoreTableBodyScroll">
              {gamesSorted.map((entry, idx) => (
                <div
                  key={`${entry.usernameOrTag || entry.username || entry.guestTag}-${entry.timestamp}-${idx}`}
                  className={`scoreTableBodyRow ${themeVariant}`}
                >
                  <div>{idx + 1}</div>
                  <div>{entry.usernameOrTag || entry.username || entry.guestTag || '---'}</div>
                  <div>{entry.guesses}</div>
                  <div>{entry.hintsUsed}</div>
                  <div>{formatMilliseconds(entry.elapsedMs)}</div>
                  <div>{entry.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighScoresScreen;
