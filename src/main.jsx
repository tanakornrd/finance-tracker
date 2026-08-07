import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ReferenceDataProvider } from "./context/ReferenceDataContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ReferenceDataProvider>
            <App />
          </ReferenceDataProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// PWA installability (see public/sw.js — deliberately a no-op passthrough, no offline caching).
// Guarded by the feature check so unsupported browsers just skip this silently; registration
// itself can't throw synchronously, but .catch covers the promise (e.g. running over plain http
// in local dev, where service workers are refused outside localhost).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a nice-to-have, not core functionality — never worth surfacing an
      // error over (e.g. Safari private browsing, or any other environment that refuses SW
      // registration for its own reasons).
    });
  });
}
