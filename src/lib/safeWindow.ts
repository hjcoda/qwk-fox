import { getCurrentWindow as tauriGetCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow as TauriWebviewWindow } from "@tauri-apps/api/webviewWindow";

const noopWindow = {
  minimize: () => {},
  toggleMaximize: () => {},
  close: () => {},
  onCloseRequested: () => Promise.resolve({ preventDefault: () => {} }),
};

const getCurrentWindow = tauriGetCurrentWindow ?? (() => noopWindow);
const WebviewWindow = TauriWebviewWindow ?? (() => noopWindow);

export { getCurrentWindow, WebviewWindow };
