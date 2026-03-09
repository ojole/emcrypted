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
    let rafId = null
    let scheduledTimers = []
    let stableViewportHeight = window.visualViewport?.height || window.innerHeight || 0

    const snapViewport = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    const scheduleSnap = (delays) => {
      scheduledTimers.forEach((timerId) => window.clearTimeout(timerId))
      scheduledTimers = []
      delays.forEach((delay) => {
        const timerId = window.setTimeout(() => {
          if (!keyboardLikelyOpen) {
            snapViewport()
          }
        }, delay)
        scheduledTimers.push(timerId)
      })
    }

    const isEditableElement = (node) =>
      node instanceof HTMLElement &&
      (node.tagName === "INPUT" ||
        node.tagName === "TEXTAREA" ||
        node.tagName === "SELECT" ||
        node.isContentEditable)

    const readKeyboardState = () => {
      const vv = window.visualViewport
      if (!vv) {
        return { open: keyboardLikelyOpen, justClosed: false }
      }
      if (vv.height > stableViewportHeight) {
        stableViewportHeight = vv.height
      }
      const heightDelta = stableViewportHeight - vv.height
      const open = heightDelta > 110 || vv.offsetTop > 40
      const justClosed = keyboardLikelyOpen && !open
      keyboardLikelyOpen = open
      return { open, justClosed }
    }

    const handleViewportShift = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        const { justClosed } = readKeyboardState()
        if (justClosed) {
          scheduleSnap([90, 200, 360, 560])
        }
      })
    }

    const handleFocusIn = (event) => {
      if (!isEditableElement(event.target)) return
      keyboardLikelyOpen = true
    }

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (isEditableElement(document.activeElement)) {
          return
        }
        const { open } = readKeyboardState()
        if (!open) {
          scheduleSnap([90, 190, 340, 540])
        }
      }, 120)
    }

    const handleSubmitIntent = (event) => {
      if (event.key !== "Enter") return
      if (!isEditableElement(event.target)) return
      scheduleSnap([120, 220, 380, 580])
    }

    const handleFormSubmit = () => {
      scheduleSnap([120, 220, 380, 580])
    }

    const handleOrientationChange = () => {
      stableViewportHeight = window.visualViewport?.height || window.innerHeight || stableViewportHeight
      keyboardLikelyOpen = false
      scheduleSnap([140, 320, 540])
    }

    const isEmbedded = (() => {
      try {
        return window.self !== window.top
      } catch {
        return true
      }
    })()
    document.body.classList.toggle("is-embedded", isEmbedded)

    window.addEventListener("focusin", handleFocusIn, true)
    window.addEventListener("focusout", handleFocusOut, true)
    window.addEventListener("keydown", handleSubmitIntent, true)
    window.addEventListener("submit", handleFormSubmit, true)
    window.addEventListener("resize", handleViewportShift, { passive: true })
    window.addEventListener("orientationchange", handleOrientationChange)
    window.visualViewport?.addEventListener("resize", handleViewportShift, { passive: true })
    window.visualViewport?.addEventListener("scroll", handleViewportShift, { passive: true })
    handleViewportShift()

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      scheduledTimers.forEach((timerId) => window.clearTimeout(timerId))
      window.removeEventListener("focusin", handleFocusIn, true)
      window.removeEventListener("focusout", handleFocusOut, true)
      window.removeEventListener("keydown", handleSubmitIntent, true)
      window.removeEventListener("submit", handleFormSubmit, true)
      window.removeEventListener("resize", handleViewportShift)
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.visualViewport?.removeEventListener("resize", handleViewportShift)
      window.visualViewport?.removeEventListener("scroll", handleViewportShift)
      document.body.classList.remove("is-embedded")
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
