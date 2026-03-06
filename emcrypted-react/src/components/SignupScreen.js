import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';
import PrimaryButton from './PrimaryButton';
import '../styles/Auth.css';

const SignupScreen = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { theme } = useThemeContext();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const signupAsciiSrc = theme === 'dark'
    ? `${publicUrl}/data/SIGNUP_ascii_white.gif`
    : `${publicUrl}/data/SIGNUP_ascii_black.gif`;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    try {
      signup(username, email, password, confirmPassword);
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    }
  };

  const handleCancel = () => navigate('/');

  return (
    <div className="phoneCard">
      <div className="panelHeader">
        <img
          className="authHeaderGif"
          src={signupAsciiSrc}
          alt="SIGNUP"
        />
      </div>

      <form className="authForm" onSubmit={handleSubmit}>
        <label className="authField">
          <span>Email</span>
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            autoFocus
          />
        </label>

        <label className="authField">
          <span>Username</span>
          <input
            className="text-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose username"
            required
          />
        </label>

        <label className="authField">
          <span>Password</span>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose password"
            required
          />
        </label>

        <label className="authField">
          <span>Confirm Password</span>
          <input
            className="text-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
          />
        </label>

        {error && <div className="authError">{error}</div>}

        <div className="authActions">
          <PrimaryButton label="Create Account" onClick={handleSubmit} iconEmoji="✨" />
          <PrimaryButton label="Cancel" onClick={handleCancel} iconEmoji="↩️" />
        </div>
      </form>
    </div>
  );
};

export default SignupScreen;
