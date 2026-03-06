import React, { useState } from 'react';
import { formatMilliseconds, formatTimestamp } from '../utils/formatTime';
import '../styles/ScoreTable.css';

const GameHistoryRow = ({ game, isDark }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <>
      <div
        className={`scoreTableBodyRow clickable ${isExpanded ? 'selected' : ''} ${isDark ? 'dark' : 'light'}`}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleExpand();
          }
        }}
        style={{ '--score-grid-columns': '1fr auto auto' }}
      >
        <div className="scoreTableBodyCell movie-title">{game.title}</div>
        <div className="scoreTableBodyCell">{game.guesses}G</div>
        <div className="scoreTableBodyCell">{formatTimestamp(game.timestamp)}</div>
      </div>

      {isExpanded && (
        <div className={`scoreTableExpandedRow historyExpanded historyStatsRow historyDetailRow ${isDark ? 'dark' : 'light'}`}>
          <div className="historyStatItem">
            <span>Guesses</span>
            <strong>{game.guesses}</strong>
          </div>
          <div className="historyStatItem">
            <span>Hints</span>
            <strong>{game.hintsUsed}</strong>
          </div>
          <div className="historyStatItem">
            <span>Time</span>
            <strong>{formatMilliseconds(game.elapsedMs)}</strong>
          </div>
        </div>
      )}
    </>
  );
};

export default GameHistoryRow;
