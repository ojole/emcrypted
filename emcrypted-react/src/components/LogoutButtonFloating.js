import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmojiIcon from '../utils/EmojiIcon';
import '../App.css';

const ICONS = {
  back: {
    cluster: '⬅️',
    hex: '2b05-fe0f',
    asset: '/vendor/fluent-emoji/2b05-fe0f.svg',
    hasTone: false,
  },
  logout: {
    cluster: '🔓',
    hex: '1f513',
    asset: '/vendor/fluent-emoji/1f513.svg',
    hasTone: false,
  },
  profile: {
    cluster: '🥸',
    hex: '1f978',
    asset: '/vendor/fluent-emoji/1f978.svg',
    hasTone: false,
  },
  home: {
    cluster: '🏠',
    hex: '1f3e0',
    asset: '/vendor/fluent-emoji/1f3e0.svg',
    hasTone: false,
  },
};

const LogoutButtonFloating = () => {
  const { isAuthenticated, username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { pathname } = location;
  const isStart = pathname === '/start';
  const isHighScores = pathname === '/high-scores';

  if (isStart) return null;
  if (!isAuthenticated && !isHighScores) return null;
  if (typeof document === 'undefined') return null;

  const onProfile = pathname === '/profile';
  // Always show a way back to home from the high-scores screen, even if logged out.
  const showBack = isHighScores || !['/', '/profile', '/start'].includes(pathname);

  const handleBack = () => navigate('/');
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const handleProfileHome = () => {
    if (onProfile) {
      navigate('/');
    } else {
      navigate('/profile');
    }
  };

  return createPortal(
    <div className="top-left-overlay" aria-label="User navigation">
      {showBack ? (
        <button
          type="button"
          className="toggle-btn"
          onClick={handleBack}
          aria-label="Back to home"
          title="Back to home"
        >
          <div className="floating-left-button__icon">
            <EmojiIcon
              asset={ICONS.back.asset}
              cluster={ICONS.back.cluster}
              hex={ICONS.back.hex}
              hasTone={ICONS.back.hasTone}
              size={28}
            />
          </div>
        </button>
      ) : null}

      {isAuthenticated ? (
        <>
          <button
            type="button"
            className="toggle-btn"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <div className="floating-left-button__icon">
              <EmojiIcon
                asset={ICONS.logout.asset}
                cluster={ICONS.logout.cluster}
                hex={ICONS.logout.hex}
                hasTone={ICONS.logout.hasTone}
                size={28}
              />
            </div>
          </button>

          <button
            type="button"
            className="toggle-btn"
            onClick={handleProfileHome}
            aria-label={onProfile ? 'Go home' : 'Go to profile'}
            title={onProfile ? 'Go home' : 'Go to profile'}
          >
            <div className="floating-left-button__icon">
              <EmojiIcon
                asset={(onProfile ? ICONS.home : ICONS.profile).asset}
                cluster={(onProfile ? ICONS.home : ICONS.profile).cluster}
                hex={(onProfile ? ICONS.home : ICONS.profile).hex}
                hasTone={false}
                size={28}
              />
            </div>
          </button>

          {username ? <span className="top-left-username">{username}</span> : null}
        </>
      ) : null}
    </div>,
    document.body
  );
};

export default LogoutButtonFloating;
