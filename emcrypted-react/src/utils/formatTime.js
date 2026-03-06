/**
 * Format milliseconds to a human-readable time string
 * Used across VictoryScreen, BetterLuckNextTimeScreen, Leaderboards, Profile
 */
export const formatMilliseconds = (ms) => {
  if (!ms || Number.isNaN(ms)) return '0s';
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
};

/**
 * Format timestamp to readable date/time
 * Used in Profile screen for game history
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 hour ago
  if (diffMins < 60) {
    return diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
  }

  // Less than 24 hours ago
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Less than 7 days ago
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
