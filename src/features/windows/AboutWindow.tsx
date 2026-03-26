import { Button, Frame, GroupBox } from "react95";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { StyledWindow } from "../../ui/StyledWindow/StyledWindow";
import "./PreferencesWindow.scss";

export const AboutWindow = (): React.ReactElement => {
  return (
    <StyledWindow title="About QWK Fox">
      <GroupBox label="About" className="padded expand-contents">
        <Frame variant="well" className="preferences-window-panel">
          <div className="preferences-window-placeholder about-window-text">
            {
              'Dedicated to the memory of Mark "Sparky" Herring, the creator of the QWK packet format.'
            }
          </div>
        </Frame>
      </GroupBox>
      <Button onClick={() => getCurrentWindow().close()}>Close</Button>
    </StyledWindow>
  );
};
