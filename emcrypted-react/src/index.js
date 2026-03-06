import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeContext";
import TopRightToggles from "./components/TopRightToggles";

const RootLayout = () => {
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
