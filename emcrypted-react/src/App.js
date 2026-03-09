import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './components/Home';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import HighScoresScreen from './components/HighScoresScreen';
import ProfileScreen from './components/ProfileScreen';
import GameFlow from './components/GameFlow';
import LogoutButtonFloating from './components/LogoutButtonFloating';
import AppOwnedScrollbar from './components/ui/AppOwnedScrollbar';
import './App.css';

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const StartRoute = () => {
  const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
  if (navEntry?.type === 'reload') {
    return <Navigate to="/" replace />;
  }
  return <GameFlow />;
};

const App = () => {
  const location = useLocation();

  useEffect(() => {
    const iconHref = `${process.env.PUBLIC_URL || ''}/favicon.png`;
    const ensureIcon = (rel, href, type) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      if (type) {
        link.setAttribute('type', type);
      } else {
        link.removeAttribute('type');
      }
    };

    ensureIcon('icon', iconHref, 'image/png');
    ensureIcon('shortcut icon', iconHref, 'image/png');
    ensureIcon('apple-touch-icon', iconHref);
  }, [location.pathname]);

  return (
    <AuthProvider>
      <div className="app-scroll-host" id="appScrollHost">
        <div className="App">
          <LogoutButtonFloating />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<StartRoute />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/high-scores" element={<HighScoresScreen />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfileScreen />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <AppOwnedScrollbar targetId="appScrollHost" />
    </AuthProvider>
  );
};

export default App;
