import { Button, Frame, GroupBox } from "react95";
import { TitleBar } from "./TitleBar";
import "./PreferencesWindow.scss";

type PreferencesWindowProps = {
  onClose: () => void;
};

export const PreferencesWindow = ({
  onClose,
}: PreferencesWindowProps): React.ReactElement => {
  return (
    <div className="preferences-window">
      <div className="preferences-window-header">
        <TitleBar title="Preferences" />
      </div>
      <div className="preferences-window-body">
        <GroupBox label="Preferences" className="padded">
          <Frame variant="well" className="preferences-window-panel">
            <div className="preferences-window-placeholder">
              Preferences will appear here.
            </div>
          </Frame>
        </GroupBox>
        <div className="preferences-window-actions">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
