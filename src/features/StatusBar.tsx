import { Frame, ProgressBar } from "react95";
import { Server } from "../data/DTO";

export const StatusBar = ({
  servers,
  bbsId,
  importProgress,
}: {
  servers: Server[];
  bbsId: string | null;
  importProgress: {
    stage: string;
    current: number;
    total: number;
    percent: number;
  } | null;
}) => {
  const activeUserName =
    servers.find((s) => s.bbs_id === bbsId)?.user_name ?? "";
  const classNames = ["status-bar-field"];
  if (!activeUserName) {
    classNames.push("disabled");
  }
  return (
    <Frame variant="status">
      <p className={classNames.join(" ")}>{`User name : ${activeUserName}`}</p>
      {importProgress && (
        <ProgressBar
          variant="tile"
          value={Math.floor(importProgress.percent)}
        />
      )}
    </Frame>
  );
};
