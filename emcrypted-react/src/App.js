import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

const App = () => {
  return (
    <AuthProvider>
      <div className="app-scroll-host" id="appScrollHost">
        <div className="App">
          <LogoutButtonFloating />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<GameFlow />} />
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
