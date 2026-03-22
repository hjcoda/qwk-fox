import { convertFileSrc } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { Server } from "../data/DTO";
import { IconChain } from "../ui/IconChain/IconChain";

export const IconServerList = ({
  servers,
  server_id,
  onSelectedServerChanged,
}: {
  servers: Server[];
  server_id: string | null;
  onSelectedServerChanged: (server_id: string) => void;
}): React.ReactElement => {
  const serverData = useMemo(() => {
    return servers.map((s) => {
      const { bbs_name, user_name } = s;
      return {
        title: bbs_name,
        iconSrc: convertFileSrc("assets/server.png"),
        tooltip: `${bbs_name} - ${user_name}`,
        index: s.bbs_id,
        disabled: false,
        data: { bbs_id: s.bbs_id, bbs_name: s.bbs_name },
      };
    });
  }, [servers]);

  return (
    <div className="container sunken-panel">
      <IconChain
        selectedIndex={server_id}
        onSelectedIndexChanged={onSelectedServerChanged}
        data={serverData}
      />
    </div>
  );
};
