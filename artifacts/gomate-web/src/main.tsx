import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { I18nProvider } from "./i18n";
import { SoundProvider } from "./context/SoundContext";
import { NotificationCountsProvider } from "./context/NotificationCountsContext";
import "leaflet/dist/leaflet.css";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <I18nProvider>
          <SoundProvider>
            <NotificationCountsProvider>
              <App />
            </NotificationCountsProvider>
          </SoundProvider>
        </I18nProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
);