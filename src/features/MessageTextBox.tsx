import React, { useEffect, useMemo, useRef } from "react";
import { Frame } from "react95";
import { Message } from "../data/DTO";
import { CP437_TO_UNICODE } from "../ui/CP437/Mapping";
import { extractMessageExtensions } from "../ui/CP437/MessageUtils";
import { MessageDetailSlug } from "./MessageDetailSlug";
import "./MessageTextBox.css";

const stripAnsi = (text: string): string => {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
};

export const MessageTextBox = ({
  message,
}: {
  message: Message | null;
}): React.ReactElement => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const base64DecodeUnicode = (str: string): string => {
    // Decode Base64 to binary string
    const binary = atob(str);

    // Convert binary string to UTF-16, any \n become \r\n so the ANSI display can correctly interpret them
    const len = binary.length;
    const bytes: number[] = [];
    bytes.length = 0;

    for (let i = 0; i < len; i++) {
      const byte = binary.charCodeAt(i);
      if (byte === 0x0a) {
        bytes.push(0x0d, 0x0a);
      } else {
        bytes.push(byte);
      }
    }

    let result = "";
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const unicodeCodePoint = CP437_TO_UNICODE[byte] || byte;
      result += String.fromCharCode(unicodeCodePoint);
    }

    return result;
  };

  const ansiString = useMemo(() => {
    return stripAnsi(message ? base64DecodeUnicode(message.text) : "");
  }, [message]);

  const messageExtensions = useMemo(() => {
    return extractMessageExtensions(ansiString);
  }, [ansiString]);

  const messageText = useMemo(() => {
    return ansiString
      .split(/\r?\n/)
      .slice(messageExtensions.firstLineOfMessageText)
      .join("\n");
  }, [ansiString, messageExtensions.firstLineOfMessageText]);

  const classNames = ["message-box-container"];
  !message && classNames.push("disabled");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
  }, [messageText]);

  return (
    <div className={classNames.join(" ")}>
      <MessageDetailSlug message={message} />
      <Frame
        ref={scrollRef}
        className="message-box-frame"
        variant={message ? "field" : "status"}
      >
        <div className="message-content-scroll">
          <pre className={"message-text"}>{messageText}</pre>
        </div>
      </Frame>
    </div>
  );
};
