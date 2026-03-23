import { getCurrentWindow as tauriGetCurrentWindow } from "@tauri-apps/api/window";
import "./TitleBar.css";

const getCurrentWindow = tauriGetCurrentWindow ?? (() => {
  return {
    minimize: () => console.log("minimize not available"),
    toggleMaximize: () => console.log("toggleMaximize not available"),
    close: () => console.log("close not available"),
  };
});

export const TitleBar = ({ title = "QWK Fox" }: { title?: string }) => {
  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="titlebar-text">{title}</div>
      <div className="titlebar-buttons">
        <div
          className="titlebar-button"
          id="titlebar-minimize"
          onClick={() => getCurrentWindow().minimize()}
        >
          ─
        </div>
        <div
          className="titlebar-button"
          id="titlebar-maximize"
          onClick={() => getCurrentWindow().toggleMaximize()}
        >
          □
        </div>
        <div
          className="titlebar-button"
          id="titlebar-close"
          onClick={() => getCurrentWindow().close()}
        >
          ✕
        </div>
      </div>
    </div>
  );
};
