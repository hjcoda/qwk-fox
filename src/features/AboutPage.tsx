import { Button, Frame, GroupBox } from "react95";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TitleBar } from "./TitleBar";
import { themeMap } from "../App";
import "./PreferencesWindow.scss";

const ABOUT_TEXT =
  'Dedicated to the memory of Mark "Sparky" Herring, the creator of the QWK packet format.';

export const AboutPage = (): React.ReactElement => {
  const currentTheme = themeMap[localStorage.getItem("qwk-fox.theme") ?? "original"];


  return (
    <div
      className="preferences-window preferences-window-standalone"
      style={{ background: currentTheme?.material }}
    >
      <div className="preferences-window-header">
        <TitleBar title="About QWK Fox" />
      </div>
      <div className="preferences-window-body">
        <GroupBox label="About" className="padded">
          <Frame variant="well" className="preferences-window-panel">
            <div className="preferences-window-placeholder about-window-text">
              {ABOUT_TEXT}
            </div>
          </Frame>
        </GroupBox>
        <div className="preferences-window-actions">
          <Button onClick={() => getCurrentWindow().close()}>Close</Button>
        </div>
      </div>
    </div>
  );
};
