import React, { useEffect, useMemo, useRef } from "react";
import { Frame } from "react95";
import { Message } from "../../data/DTO";
import { extractMessageExtensions } from "../../data/MessageExtensionUtils";
import { MessageDetailSlug } from "./MessageDetailSlug";
import "./MessageDisplay.scss";
import { ANSIRenderer } from "../../ui/ANSIRenderer/ANSIRenderer";
import { decodeMessageBytes } from "../../ui/ANSIRenderer/MessageDecode";
import { FONT_SIZE_STORAGE_KEY, FONT_STORAGE_KEY } from "../../App";

type MessageTextBoxProps = {
  message: Message | null;
  messageBytes?: Uint8Array;
  encodingHint?: string;
  utf8Flag?: boolean;
  formatHint?: string;
  constrainColumns?: boolean;
};

const DEFAULT_FONT_SIZE = 14;
const ANSI_SEQUENCE = /\x1b\[[0-9;?]*[A-Za-z]/;

const wrapLineByWords = (line: string, width: number): string[] => {
  if (!width || line.length <= width) {
    return [line];
  }

  const wrapped: string[] = [];
  let remaining = line;

  while (remaining.length > width) {
    let splitIndex = remaining.lastIndexOf(" ", width);
    if (splitIndex <= 0) {
      splitIndex = width;
    }
    wrapped.push(remaining.slice(0, splitIndex).trimEnd());
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining.length) {
    wrapped.push(remaining);
  }

  return wrapped;
};

const wrapTextByWords = (text: string, width?: number): string => {
  if (!width || width <= 0) {
    return text;
  }

  const lines = text.split(/\r?\n/);
  const wrappedLines: string[] = [];

  for (const line of lines) {
    if (ANSI_SEQUENCE.test(line)) {
      wrappedLines.push(line);
      continue;
    }
    wrappedLines.push(...wrapLineByWords(line, width));
  }

  return wrappedLines.join("\r\n");
};

export const MessageDisplay = ({
  message,
  messageBytes,
  encodingHint,
  utf8Flag,
  formatHint,
  constrainColumns = true,
}: MessageTextBoxProps): React.ReactElement => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = React.useState(DEFAULT_FONT_SIZE);
  const [fontFamily, setFontFamily] = React.useState(
    localStorage.getItem(FONT_STORAGE_KEY) ?? "IBMVGA8, monospace",
  );

  const decodedMessage = useMemo(() => {
    if (!message && !messageBytes) {
      return { text: "", encoding: "utf-8" as const };
    }

    const bytes = messageBytes
      ? messageBytes
      : (() => {
          const binary = atob(message?.text ?? "");
          return Uint8Array.from(binary, (char) => char.charCodeAt(0));
        })();

    const normalizedBytes = (() => {
      const expanded: number[] = [];
      for (const byte of bytes) {
        if (!messageBytes && byte === 0x0a) {
          expanded.push(0x0d, 0x0a);
        } else {
          expanded.push(byte);
        }
      }
      return Uint8Array.from(expanded);
    })();

    return decodeMessageBytes(normalizedBytes, {
      encodingHint: encodingHint ?? message?.header?.x_ftn_chrs,
      utf8Flag: utf8Flag ?? message?.header?.utf8,
      formatHint: formatHint ?? message?.header?.format,
    });
  }, [message, messageBytes, encodingHint, utf8Flag, formatHint]);

  const ansiString = decodedMessage.text;

  const messageExtensions = useMemo(() => {
    return extractMessageExtensions(ansiString);
  }, [ansiString]);

  const messageText = useMemo(() => {
    const baseText = ansiString
      .split(/\r?\n/)
      .slice(messageExtensions.firstLineOfMessageText)
      .join("\n");

    return wrapTextByWords(baseText, constrainColumns ? 80 : undefined);
  }, [ansiString, messageExtensions.firstLineOfMessageText, constrainColumns]);

  const classNames = ["message-box-container"];
  if (!message && !messageBytes) {
    classNames.push("disabled");
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0 });
    }
  }, [message?.msg_id, messageText]);

  useEffect(() => {
    if (!contentScrollRef.current) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0 });
    });
    const timeout = window.setTimeout(() => {
      contentScrollRef.current?.scrollTo({ top: 0 });
    }, 0);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [fontSize]);

  useEffect(() => {
    const storedSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (storedSize) {
      const parsed = Number.parseInt(storedSize, 10);
      if (!Number.isNaN(parsed)) {
        setFontSize(parsed);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === FONT_SIZE_STORAGE_KEY && event.newValue) {
        const parsed = Number.parseInt(event.newValue, 10);
        if (!Number.isNaN(parsed)) {
          setFontSize(parsed);
        }
      }
      if (event.key === FONT_STORAGE_KEY && event.newValue) {
        setFontFamily(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div
      className={classNames.join(" ")}
      style={
        {
          "--messagebox-font-size": `${fontSize}px`,
          "--messagebox-font": fontFamily,
        } as React.CSSProperties
      }
    >
      {message && <MessageDetailSlug message={message} />}
      <Frame
        ref={scrollRef}
        className="message-box-frame"
        variant={message ? "field" : "status"}
      >
        <div className="message-content-scroll" ref={contentScrollRef}>
          <div className={"message-text"}>
            <ANSIRenderer
              text={messageText}
              columns={constrainColumns ? 80 : undefined}
              className="message-ansi-renderer"
            />
          </div>
        </div>
      </Frame>
    </div>
  );
};
