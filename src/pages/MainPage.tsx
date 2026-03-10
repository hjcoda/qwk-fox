import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Pane, SplitPane } from "react-split-pane";
import { Frame, GroupBox } from "react95";
import { AppSettings } from "../AppSettings";
import { Conference, Message, MessageStatus, Server } from "../data/DTO";
import { ConferenceList } from "../features/ConferenceList";
import { IconServerList } from "../features/IconServerList";
import { MessageList } from "../features/MessageList";
import { MessageTextBox } from "../features/MessageTextBox";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { StatusBar } from "../features/StatusBar";

type UpdateMessagesPayload = {
  bbs_id: string;
  conference_id: string;
  message_ids: number[];
  status: MessageStatus;
};

export const MainPage = ({
  appSettings,
  servers,
}: {
  appSettings: AppSettings;
  servers: Server[];
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
        // Call backend to parse the file
        await invoke<Conference[]>("update_messages_read_status", {
          payload,
        });
      }
    } catch (err) {
      console.error("Error marking messages status:", err);
      alert("Error marking messages status: " + err);
    }
  }

  async function getMessages() {
    try {
      if (bbsId !== null && conferenceId !== null) {
        // Call backend to parse the file
        setMessages(
          await invoke<Message[]>("get_messages", { bbsId, conferenceId }),
        );
      }
    } catch (err) {
      console.error("Error getting messages from DB:", err);
      alert("Error getting messages from DB: " + err);
    }
  }

  async function getConferences() {
    try {
      if (bbsId !== null) {
        // Call backend to parse the file
        setConferences(
          await invoke<Conference[]>("get_conferences", { bbsId }),
        );
      }
    } catch (err) {
      console.error("Error getting conferences from DB:", err);
      alert("Error getting conferences from DB: " + err);
    }
  }

  const onSelectedServerChanged = (id: string) => {
    setBBSId(id);
  };

  const onSelectedConferenceChanged = (index: number) => {
    setConferenceId(index);
    setMessage(null);
  };

  const onSelectedMessageChanged = (message_id: number) => {
    if (bbsId && conferenceId) {
      updateMessagesStatus({
        bbs_id: bbsId,
        conference_id: conferenceId.toString(),
        message_ids: [message_id],
        status: "-",
      });
    }
    setMessage(messages.find((m) => m.msg_id === message_id) ?? null);
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
        <Pane>
          <SplitPane
            direction="horizontal"
            dividerSize={5}
            dividerClassName={"h-divider"}
            resizable={true}
          >
            <Pane
              className="expand-contents"
              defaultSize="35%"
            >
              <GroupBox className={"padded"} label={"Conferences"}>
                <ConferenceList
                  bbsId={bbsId ?? ""}
                  hideRead={appSettings.hideRead}
                  conferences={conferences}
                  onSelectedConferenceChanged={onSelectedConferenceChanged}
                />
              </GroupBox>
            </Pane>
            <Pane className="expand-contents">
              <GroupBox className={"padded"} label={"Messages"}>
                <MessageList
                  conference_id={conferenceId ? conferenceId : null}
                  hideRead={appSettings.hideRead}
                  messages={messages}
                  onSelectedMessageChanged={onSelectedMessageChanged}
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
      <StatusBar servers={servers} bbsId={bbsId} />
    </div>
  );
};
