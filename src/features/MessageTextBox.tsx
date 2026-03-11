import React from "react";
import { ScrollView } from "react95";
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
  const base64DecodeUnicode = (str: string): string => {
    // Decode Base64 to binary string
    const binary = atob(str);

    // Convert binary string to UTF-16, any \n become \r\n so the ANSI display can correctly interpret them
    const len = binary.length;
    const crCount = binary.match("\n")?.length ?? 0;
    const bytes = new Uint8Array(len + crCount);

    for (let i = 0, j = 0; i < len; i++) {
      if (bytes[j] === 0x0a) {
        bytes[j] = 0x0d;
        bytes[++j] = 0x0a;
      } else {
        bytes[j] = binary.charCodeAt(i);
      }
      j++;
    }

    // Step 3: Convert CP437 bytes to UTF-16 string using mapping
    let result = "";
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Map CP437 byte to Unicode code point
      const unicodeCodePoint = CP437_TO_UNICODE[byte] || byte; // Fallback to original byte if unmapped
      result += String.fromCharCode(unicodeCodePoint);
    }

    return result;
  };

  const ansiString = stripAnsi(
    message ? base64DecodeUnicode(message.text) : "",
  );

  const messageExtensions = extractMessageExtensions(ansiString);

  const lines = ansiString
    .split(/\r?\n/)
    .slice(messageExtensions.firstLineOfMessageText);

  const classNames = ["message-box-container"];
  !message && classNames.push("disabled");

  return (
    <div className={classNames.join(" ")}>
      <MessageDetailSlug message={message} />
      <ScrollView className="message-content-scroll">
        <pre className={"message-text"}>
          {lines.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </pre>
      </ScrollView>
    </div>
  );
};
