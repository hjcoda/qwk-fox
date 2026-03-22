import { CP437_TO_UNICODE } from "./Mapping";

export type MessageEncoding = "utf-8" | "cp437";

type DecodeOptions = {
  encodingHint?: string;
  utf8Flag?: boolean;
  formatHint?: string;
};

const UTF8_HINT = /utf[-_ ]?8|unicode/i;
const CP437_HINT = /cp[-_ ]?437|ibm[-_ ]?pc|ibm[-_ ]?437|dos|ansi/i;

const normalizeHint = (
  hint?: string,
  utf8Flag?: boolean,
  formatHint?: string,
): MessageEncoding | null => {
  if (utf8Flag) {
    return "utf-8";
  }

  const combined = [hint, formatHint].filter(Boolean).join(" ");
  if (!combined) {
    return null;
  }

  if (UTF8_HINT.test(combined)) {
    return "utf-8";
  }

  if (CP437_HINT.test(combined)) {
    return "cp437";
  }

  return null;
};

const decodeUtf8 = (bytes: Uint8Array): string | null => {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(bytes);
  } catch (err) {
    return null;
  }
};

const isAnsiStart = (byte: number) => byte === 0x1b;

const decodeCp437WithAnsi = (bytes: Uint8Array): string => {
  let output = "";
  let index = 0;

  while (index < bytes.length) {
    const byte = bytes[index];

    if (isAnsiStart(byte)) {
      output += "\x1b";
      index += 1;
      while (index < bytes.length) {
        const ansiByte = bytes[index];
        output += String.fromCharCode(ansiByte);
        index += 1;
        if (ansiByte >= 0x40 && ansiByte <= 0x7e) {
          break;
        }
      }
      continue;
    }

    if (byte === 0x0d) {
      output += "\r";
    } else if (byte === 0x0a) {
      output += "\n";
    } else {
      const unicodeCodePoint = CP437_TO_UNICODE[byte] ?? byte;
      output += String.fromCharCode(unicodeCodePoint);
    }

    index += 1;
  }

  return output;
};

export const decodeMessageBytes = (
  bytes: Uint8Array,
  options: DecodeOptions = {},
): { text: string; encoding: MessageEncoding } => {
  const hintedEncoding = normalizeHint(
    options.encodingHint,
    options.utf8Flag,
    options.formatHint,
  );

  if (hintedEncoding === "utf-8") {
    const decoded = decodeUtf8(bytes);
    return {
      text: decoded ?? decodeCp437WithAnsi(bytes),
      encoding: decoded ? "utf-8" : "cp437",
    };
  }

  if (hintedEncoding === "cp437") {
    return {
      text: decodeCp437WithAnsi(bytes),
      encoding: "cp437",
    };
  }

  const utf8Decoded = decodeUtf8(bytes);
  if (utf8Decoded !== null) {
    return { text: utf8Decoded, encoding: "utf-8" };
  }

  return { text: decodeCp437WithAnsi(bytes), encoding: "cp437" };
};
