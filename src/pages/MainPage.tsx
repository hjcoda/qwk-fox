import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { Pane, SplitPane } from "react-split-pane";
import { GroupBox } from "react95";
import { AppSettings } from "../AppSettings";
import { Conference, Message, MessageStatusEnum, Server } from "../data/DTO";
import { ConferenceList } from "../features/ConferenceList";
import { IconServerList } from "../features/IconServerList";
import { MessageTextBox } from "../features/MessageTextBox";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { StatusBar } from "../features/StatusBar";
import { getReadMessageStatus } from "../data/MessageUtils";
import { MessageTree } from "../features/MessageTree";

type UpdateMessagesPayload = {
  bbs_id: string;
  conference_id: string;
  message_ids: number[];
  status: MessageStatusEnum;
};

export const MainPage = ({
  appSettings,
  servers,
  importProgress,
}: {
  appSettings: AppSettings;
  servers: Server[];
  importProgress: {
    stage: string;
    current: number;
    total: number;
    percent: number;
  } | null;
}) => {
  const [bbsId, setBBSId] = useState<string | null>(null);
  const [lastUpdateTimeMessages, setLastUpdateTimeMessages] =
    useState<number>();
  const [conferences, setConferences] = useState<Conference[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conferenceId, setConferenceId] = useState<number | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useTauriEvent("messages-dirty", () => {
    setLastUpdateTimeMessages(Date.now());
  });

  async function getMessages() {
    if (bbsId !== null && conferenceId !== null) {
      try {
        setMessages(
          await invoke<Message[]>("get_messages", { bbsId, conferenceId }),
        );
      } catch (err) {
        console.error("Error getting messages from DB:", err);
        alert("Error getting messages from DB: " + err);
      }
    } else {
      setMessages([]);
    }
  }

  async function getConferences() {
    if (bbsId !== null) {
      try {
        setConferences(
          await invoke<Conference[]>("get_conferences", { bbsId }),
        );
      } catch (err) {
        console.error("Error getting conferences from DB:", err);
        alert("Error getting conferences from DB: " + err);
      }
    }
  }

  useEffect(() => {
    getConferences();
  }, [servers, lastUpdateTimeMessages, bbsId]);

  useEffect(() => {
    getMessages();
  }, [lastUpdateTimeMessages, servers, bbsId, conferenceId]);

  async function updateMessagesStatus(payload: UpdateMessagesPayload) {
    try {
      console.log(`Updating message status`);
      if (bbsId !== null) {
        await invoke<Conference[]>("update_messages_read_status", {
          payload,
        });
      }
    } catch (err) {
      console.error("Error marking messages status:", err);
      alert("Error marking messages status: " + err);
    }
  }

  const onSelectedServerChanged = (id: string) => {
    setBBSId(id);
  };

  const onSelectedConferenceChanged = (index: number) => {
    setConferenceId(index);
    setMessage(null);
  };

  const messageById = useMemo(() => {
    const lookup = new Map<number, Message>();
    for (const item of messages) {
      lookup.set(item.msg_id, item);
    }
    return lookup;
  }, [messages]);

  const onSelectedMessageChanged = (message_id: number) => {
    let message = null;
    if (bbsId && conferenceId) {
      message = messageById.get(message_id) ?? null;
      if (message) {
        const status = message.type_id;
        const newStatus = getReadMessageStatus(status);
        updateMessagesStatus({
          bbs_id: bbsId,
          conference_id: conferenceId.toString(),
          message_ids: [message_id],
          status: newStatus,
        });
      }
    }
    setMessage(message);
  };

  return (
    <div className="main-page">
      <GroupBox className={"padded"} label={"Servers"}>
        <IconServerList
          servers={servers}
          onSelectedServerChanged={onSelectedServerChanged}
          server_id={bbsId}
        />
      </GroupBox>
      <SplitPane
        direction="vertical"
        dividerSize={5}
        dividerClassName={"v-divider"}
        resizable={true}
      >
        <Pane defaultSize={"30%"}>
          <SplitPane
            direction="horizontal"
            dividerSize={5}
            dividerClassName={"h-divider"}
            resizable={true}
          >
            <Pane className="expand-contents" defaultSize="45%">
              <GroupBox
                className={"padded expand-contents"}
                label={"Conferences"}
              >
                <ConferenceList
                  bbsId={bbsId}
                  hideRead={appSettings.hideRead}
                  conferences={conferences}
                  onSelectedConferenceChanged={onSelectedConferenceChanged}
                />
              </GroupBox>
            </Pane>
            <Pane className="expand-contents">
              <GroupBox className={"padded expand-contents"} label={"Messages"}>
                <MessageTree
                  hideRead={appSettings.hideRead}
                  messages={messages}
                  onSelectedMessageChanged={onSelectedMessageChanged}
                  useThreads={appSettings.showThreads}
                />
              </GroupBox>
            </Pane>
          </SplitPane>
        </Pane>
        <Pane className="expand-contents">
          <GroupBox label={"Message"} className={"padded expand-contents"}>
            <MessageTextBox message={message} />
          </GroupBox>
        </Pane>
      </SplitPane>
      <StatusBar
        servers={servers}
        bbsId={bbsId}
        importProgress={importProgress}
      />
    </div>
  );
};
