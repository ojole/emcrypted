// localStorage-backed data store for users and leaderboard
// This simulates backend persistence for prototyping

const STORAGE_KEYS = {
  USERS: 'encrypted_users',
  LEADERBOARD: 'encrypted_leaderboard',
  SESSION: 'encrypted_session',
};

// ===== LOCALSTORAGE HELPERS =====

const loadFromStorage = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (err) {
    console.error(`Failed to load ${key} from localStorage:`, err);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
};

// ===== USERS =====

export const getUsers = () => {
  return loadFromStorage(STORAGE_KEYS.USERS, []);
};

export const saveUsers = (users) => {
  saveToStorage(STORAGE_KEYS.USERS, users);
};

/**
 * Generate a random 3-character arcade-style tag for anonymous players
 */
export const generateAnonTag = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude similar-looking chars
  return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Create a new user account
 */
export const createUser = (username, email, password) => {
  const users = getUsers();

  // Check if username already exists (case-insensitive)
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }

  const newUser = {
    username,
    email,
    password, // plaintext for now (prototype only!)
    verified: false,
    games: [],
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
};

/**
 * Validate user credentials
 */
export const validateUser = (username, password) => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

/**
 * Get user by username
 */
export const getUser = (username) => {
  const users = getUsers();
  return users.find(u => u.username === username) || null;
};

/**
 * Mark user's email as verified
 */
export const markEmailVerified = (username) => {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user) {
    user.verified = true;
    saveUsers(users);
  }
};

// ===== LEADERBOARD =====

export const getLeaderboard = () => {
  const leaderboard = loadFromStorage(STORAGE_KEYS.LEADERBOARD, []);
  const filtered = leaderboard.filter(row => row && row.isVictory !== false);
  return [...filtered].sort((a, b) => {
    if (a.guesses !== b.guesses) return a.guesses - b.guesses;
    if (a.hintsUsed !== b.hintsUsed) return a.hintsUsed - b.hintsUsed;
    return a.elapsedMs - b.elapsedMs;
  });
};

export const saveLeaderboard = (leaderboard) => {
  saveToStorage(STORAGE_KEYS.LEADERBOARD, leaderboard);
};

/**
 * Record a game result to leaderboard and optionally to user history
 */
export const recordGameResult = ({ usernameOrTag, title, guesses, hintsUsed, elapsedMs, isVictory }) => {
  if (!title || isVictory === false) {
    return null;
  }

  const timestamp = Date.now();

  const entry = {
    usernameOrTag,
    title,
    guesses,
    hintsUsed,
    elapsedMs,
    timestamp,
    isVictory: isVictory !== false,
  };

  // Add to global leaderboard
  const leaderboard = loadFromStorage(STORAGE_KEYS.LEADERBOARD, []);
  leaderboard.unshift(entry);
  saveLeaderboard(leaderboard.slice(0, 200));

  // If this is a registered user (not anon tag), add to their history
  const users = getUsers();
  const user = users.find(u => u.username === usernameOrTag);
  if (user) {
    user.games.push(entry);
    saveUsers(users);
  }

  return entry;
};

/**
 * Get user game history
 */
export const getUserHistory = (username) => {
  const user = getUser(username);
  return user ? [...user.games].reverse() : []; // most recent first
};

// ===== SESSION =====

export const getSession = () => {
  return loadFromStorage(STORAGE_KEYS.SESSION, null);
};

export const saveSession = (sessionObj) => {
  saveToStorage(STORAGE_KEYS.SESSION, sessionObj);
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

// Export for debugging (can remove in production)
export const getDb = () => ({
  users: getUsers(),
  leaderboard: getLeaderboard(),
  session: getSession(),
});
