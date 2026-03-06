import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';
import PrimaryButton from './PrimaryButton';
import '../styles/Auth.css';

const LoginScreen = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useThemeContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const loginAsciiSrc = theme === 'dark'
    ? `${publicUrl}/data/LOGIN_ascii_white.gif`
    : `${publicUrl}/data/LOGIN_ascii_black.gif`;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    try {
      login(username, password);
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    }
  };

  const handleCancel = () => navigate('/');

  const handleForgotPassword = () => {
    if (!username.trim()) {
      setForgotPasswordMessage('Please enter your username first.');
      setTimeout(() => setForgotPasswordMessage(''), 4000);
      return;
    }

    setForgotPasswordMessage('If that account exists and the email is verified, a reset link was sent.');
    setTimeout(() => setForgotPasswordMessage(''), 6000);
  };

  return (
    <div className="phoneCard">
      <div className="panelHeader">
        <img
          className="authHeaderGif"
          src={loginAsciiSrc}
          alt="LOGIN"
        />
      </div>

      <form className="authForm" onSubmit={handleSubmit}>
        <label className="authField">
          <span>Username</span>
          <input
            className="text-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            autoFocus
          />
        </label>

        <label className="authField">
          <span>Password</span>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </label>

        {error && <div className="authError">{error}</div>}

        <div className="authActions">
          <PrimaryButton label="Log In" onClick={handleSubmit} iconEmoji="🔐" />
          <PrimaryButton label="Cancel" onClick={handleCancel} iconEmoji="↩️" />
        </div>

        <button type="button" className="forgotPasswordLink" onClick={handleForgotPassword}>
          Forgot password?
        </button>

        {forgotPasswordMessage && <div className="authError">{forgotPasswordMessage}</div>}
      </form>
    </div>
  );
};

export default LoginScreen;
