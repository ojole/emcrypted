import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeContext";
import TopRightToggles from "./components/TopRightToggles";

const RootLayout = () => {
  React.useEffect(() => {
    const snapViewport = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const scheduleSnap = (delays) => {
      delays.forEach((delay) => window.setTimeout(snapViewport, delay));
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const isInputTarget =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (!isInputTarget) return;
      scheduleSnap([0, 90, 200]);
    };

    const handleFocusOut = () => {
      scheduleSnap([60, 180, 360, 620]);
    };

    const handleViewportShift = () => {
      const vv = window.visualViewport;
      if (!vv) {
        snapViewport();
        return;
      }
      if (vv.offsetTop !== 0 || vv.pageTop !== 0) {
        scheduleSnap([0, 120]);
      }
    };

    const handleOrientationChange = () => {
      scheduleSnap([120, 360]);
    };

    window.addEventListener("focusin", handleFocusIn, true);
    window.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleViewportShift, { passive: true });
    window.visualViewport?.addEventListener("resize", handleViewportShift, { passive: true });
    window.visualViewport?.addEventListener("scroll", handleViewportShift, { passive: true });

    return () => {
      window.removeEventListener("focusin", handleFocusIn, true);
      window.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleViewportShift);
      window.visualViewport?.removeEventListener("resize", handleViewportShift);
      window.visualViewport?.removeEventListener("scroll", handleViewportShift);
    };
  }, []);

  return (
    <>
      <TopRightToggles />
      <div id="appFrame">
        <div id="appShell">
          <App />
        </div>
      </div>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <RootLayout />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
