import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUser,
  validateUser,
  getUserHistory,
  recordGameResult,
  generateAnonTag,
  getSession,
  saveSession,
  clearSession,
  getUser,
} from '../data/fakeDb';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [history, setHistory] = useState([]);
  const [anonTag, setAnonTag] = useState(null);

  // Auto-restore session from localStorage on mount
  useEffect(() => {
    const session = getSession();
    if (session && session.username) {
      // Verify user still exists in storage
      const user = getUser(session.username);
      if (user) {
        setIsAuthenticated(true);
        setUsername(user.username);
        setHistory(getUserHistory(user.username));
      } else {
        // Session is stale, clear it
        clearSession();
      }
    }

    // Generate or retrieve anon tag from session storage
    const storedTag = sessionStorage.getItem('anonTag');
    if (storedTag) {
      setAnonTag(storedTag);
    } else {
      const newTag = generateAnonTag();
      sessionStorage.setItem('anonTag', newTag);
      setAnonTag(newTag);
    }
  }, []);

  /**
   * Log in an existing user
   */
  const login = (usernameInput, password) => {
    const user = validateUser(usernameInput, password);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Update state
    setIsAuthenticated(true);
    setUsername(user.username);
    setHistory(getUserHistory(user.username));

    // Save session to localStorage
    saveSession({ username: user.username });

    return true;
  };

  /**
   * Create a new user account
   */
  const signup = (usernameInput, email, password, confirmPassword) => {
    // Validation
    if (!usernameInput || !email || !password || !confirmPassword) {
      throw new Error('All fields are required');
    }

    if (!email.includes('@')) {
      throw new Error('Please enter a valid email');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (usernameInput.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    try {
      const user = createUser(usernameInput, email, password);

      // Update state
      setIsAuthenticated(true);
      setUsername(user.username);
      setHistory([]);

      // Save session to localStorage
      saveSession({ username: user.username });

      return true;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Log out the current user
   */
  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    setHistory([]);

    // Clear session from localStorage
    clearSession();
  };

  /**
   * Add a completed game round to history and leaderboard
   */
  const addRoundToHistory = (roundSummary) => {
    if (!roundSummary || roundSummary.isVictory === false) {
      return null;
    }

    const { title, guesses, hintsUsed, elapsedMs, isVictory } = roundSummary;

    // Determine who to attribute this to
    const usernameOrTag = isAuthenticated ? username : anonTag;

    // Record in fakeDb (now persists to localStorage)
    const entry = recordGameResult({
      usernameOrTag,
      title,
      guesses,
      hintsUsed,
      elapsedMs,
      isVictory,
    });

    // If logged in, update local history state
    if (entry && isAuthenticated) {
      setHistory(prev => [entry, ...prev]); // prepend (most recent first)
    }

    return entry;
  };

  const value = {
    isAuthenticated,
    username,
    anonTag,
    history,
    login,
    signup,
    logout,
    addRoundToHistory,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
