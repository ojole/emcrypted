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
    let keyboardLikelyOpen = false

    const snapViewport = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    const scheduleSnap = (delays) => {
      delays.forEach((delay) => window.setTimeout(snapViewport, delay))
    }

    const handleFocusIn = (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const isInputTarget =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      if (!isInputTarget) return
      keyboardLikelyOpen = true
    }

    const handleFocusOut = () => {
      const vv = window.visualViewport
      const viewportDelta = vv ? window.innerHeight - vv.height : 0
      if (viewportDelta < 80) {
        keyboardLikelyOpen = false
        scheduleSnap([120, 260, 480])
      }
    }

    const handleViewportShift = () => {
      const vv = window.visualViewport
      if (!vv) {
        return
      }
      const viewportDelta = window.innerHeight - vv.height
      const keyboardOpenNow = viewportDelta > 130
      if (keyboardOpenNow) {
        keyboardLikelyOpen = true
        return
      }
      if (keyboardLikelyOpen) {
        keyboardLikelyOpen = false
        scheduleSnap([120, 260, 460])
      }
    }

    const handleOrientationChange = () => {
      scheduleSnap([120, 360])
    }

    const handleSubmitIntent = (event) => {
      if (event.key !== "Enter") return
      scheduleSnap([160, 320, 540])
    }

    window.addEventListener("focusin", handleFocusIn, true)
    window.addEventListener("focusout", handleFocusOut, true)
    window.addEventListener("keydown", handleSubmitIntent, true)
    window.addEventListener("orientationchange", handleOrientationChange)
    window.visualViewport?.addEventListener("resize", handleViewportShift, { passive: true })
    window.visualViewport?.addEventListener("scroll", handleViewportShift, { passive: true })

    return () => {
      window.removeEventListener("focusin", handleFocusIn, true)
      window.removeEventListener("focusout", handleFocusOut, true)
      window.removeEventListener("keydown", handleSubmitIntent, true)
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.visualViewport?.removeEventListener("resize", handleViewportShift)
      window.visualViewport?.removeEventListener("scroll", handleViewportShift)
    }
  }, [])

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
