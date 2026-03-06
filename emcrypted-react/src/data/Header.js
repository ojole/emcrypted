import React, { useState } from "react";
import { useThemeContext } from "../theme/ThemeContext";

const LOGOS = {
  light: "/data/EMCRYPTED_ascii_anim_black.gif",
  dark: "/data/EMCRYPTED_ascii_anim_white.gif",
};

const Header = () => {
  const { theme } = useThemeContext();
  const [logoAvailable, setLogoAvailable] = useState({ light: true, dark: true });

  const mode = theme === "dark" ? "dark" : "light";
  const canUseLogo = logoAvailable[mode];
  const logoSrc = LOGOS[mode];

  const handleLogoError = () => {
    setLogoAvailable((prev) => ({
      ...prev,
      [mode]: false,
    }));
  };

  return (
    <header className="app-header">
      {canUseLogo ? (
        <img
          src={logoSrc}
          alt="EMCRYPTED"
          className="brandLogo"
          height={72}
          onError={handleLogoError}
        />
      ) : (
        <h1 className="emcrypted-title">EMCRYPTED</h1>
      )}
    </header>
  );
};

export default Header;
