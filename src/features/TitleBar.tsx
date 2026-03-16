import { getCurrentWindow } from "@tauri-apps/api/window";
import "./TitleBar.css";

export const TitleBar = () => {
  document.getElementById("titlebar-minimize").onclick = () =>
    getCurrentWindow().minimize();
  document.getElementById("titlebar-maximize").onclick = () =>
    getCurrentWindow().toggleMaximize();
  document.getElementById("titlebar-close").onclick = () =>
    getCurrentWindow().close();

  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="titlebar-button" id="titlebar-minimize">
        🗕
      </div>
      <div className="titlebar-button" id="titlebar-maximize">
        🗖
      </div>
      <div className="titlebar-button" id="titlebar-close">
        ✕
      </div>
    </div>
  );
};
