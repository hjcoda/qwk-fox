import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (new URLSearchParams(window.location.search).has("window")) {
  const reveal = () => {
    document.documentElement.classList.remove("window-pending");
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(reveal));
  } else {
    requestAnimationFrame(reveal);
  }
}
