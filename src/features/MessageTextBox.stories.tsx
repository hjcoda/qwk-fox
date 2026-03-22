import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { MessageTextBox } from "./MessageTextBox";
import { Message, MessageStatusEnum } from "../data/DTO";

const baseHeader = {
  section: 1,
  message_ids: [],
  other_fields: {},
};

const baseMessage: Message = {
  type_id: MessageStatusEnum.PublicUnread,
  msg_id: 1,
  section: 1,
  subject: "Retro Demo",
  text: "",
  date: "2026-03-17",
  time: "12:34",
  to: "All",
  from: "Sysop",
  in_reply_to: 0,
  conference_id: 1,
  header: baseHeader,
};

const asciiBytes = (input: string) =>
  Uint8Array.from(input, (char) => char.charCodeAt(0));

const utf8Bytes = (input: string) => new TextEncoder().encode(input);

const cp437BoxBytes = Uint8Array.from([
  0xda, 0xc4, 0xc4, 0xc4, 0xbf, 0x0d, 0x0a, 0xb3, 0x20, 0xfe, 0x20, 0xb3,
  0x0d, 0x0a, 0xc0, 0xc4, 0xc4, 0xc4, 0xd9,
]);

const ansiColorBytes = asciiBytes(
  "Normal \x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[1mBold\x1b[0m\r\n",
);

const ansiCursorBytes = asciiBytes(
  "Cursor demo: Hello\x1b[2D!!\r\nLine 2\x1b[1A\x1b[12G(edited)\r\n",
);

const spinnerFrames = ["-", "\\", "|", "/"];

const meta: Meta<typeof MessageTextBox> = {
  title: "Features/MessageTextBox",
  component: MessageTextBox,
  args: {
    message: baseMessage,
  },
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof MessageTextBox>;

export const AnsiColorsAndCursor: Story = {
  args: {
    message: {
      ...baseMessage,
      subject: "ANSI Colors + Cursor",
    },
    messageBytes: Uint8Array.from([
      ...ansiColorBytes,
      ...ansiCursorBytes,
    ]),
  },
};

export const Cp437WithHint: Story = {
  args: {
    message: {
      ...baseMessage,
      subject: "CP-437 (x_ftn_chrs)",
      header: {
        ...baseHeader,
        x_ftn_chrs: "CP437",
      },
    },
    messageBytes: Uint8Array.from([
      ...cp437BoxBytes,
      0x0d,
      0x0a,
      0xb3,
      0x20,
      0xdb,
      0xdb,
      0x20,
      0xb3,
    ]),
    encodingHint: "CP437",
  },
};

export const Utf8AutoDetected: Story = {
  args: {
    message: {
      ...baseMessage,
      subject: "UTF-8 Auto Detect",
    },
    messageBytes: utf8Bytes("Привет мир! Καλημέρα κόσμε!\r\n"),
  },
};

export const AnimatedAnsiSpinner: Story = {
  render: (args) => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
      const handle = window.setInterval(() => {
        setFrame((current) => (current + 1) % spinnerFrames.length);
      }, 300);

      return () => window.clearInterval(handle);
    }, []);

    const output =
      "\x1b[2J\x1b[H" +
      `\x1b[36mLoading\x1b[0m ${spinnerFrames[frame]}\r\n` +
      "\x1b[33mPress any key to continue...\x1b[0m\r\n";

    return (
      <MessageTextBox
        {...args}
        messageBytes={asciiBytes(output)}
      />
    );
  },
  args: {
    message: {
      ...baseMessage,
      subject: "Animated ANSI Spinner",
    },
  },
};
