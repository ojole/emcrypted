import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

const THEME_KEY = "emc_theme";

const getStoredTheme = () => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch (error) {
    return "light";
  }
};

const defaultValue = {
  theme: "light",
  setTheme: () => {},
};

export const ThemeContext = createContext(defaultValue);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("theme-dark", theme === "dark");
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        // ignore storage failures
      }
    }
  }, [theme]);

  const safeSetTheme = useCallback((value) => {
    setTheme(value === "dark" ? "dark" : "light");
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme: safeSetTheme,
    }),
    [theme, safeSetTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => React.useContext(ThemeContext);
