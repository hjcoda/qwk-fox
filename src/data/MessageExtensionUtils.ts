const MessageExtensions = [
  "@VIA",
  "@MSGID",
  "@REPLY",
  "@TZ",
  "Subject",
  "From",
  "To",
] as const;
type MessageExtension = (typeof MessageExtensions)[number];

export type MessageExtensionResults = {
  firstLineOfMessageText: number;
  subject?: string;
  "@VIA"?: string;
  "@MSGID"?: string;
  "@REPLY"?: string;
  "@TZ"?: string;
  "Re:"?: string;
  "By:"?: string;
  Subject?: string;
  From?: string;
  To?: string;
};

const processExtension = (
  line: string,
): { key: MessageExtension; value: string } | null => {
  for (const keyIndex in MessageExtensions) {
    const key = MessageExtensions[keyIndex];
    if (line.startsWith(key)) {
      const value = line.slice(key.length);
      return { key: key as MessageExtension, value };
    }
  }

  return null;
};

/** Extract Kludge lines and extensions from the message if present */
export const extractMessageExtensions = (
  ansiString: string,
): MessageExtensionResults => {
  let messageExtensionResults: MessageExtensionResults = {
    firstLineOfMessageText: 0,
  };
  const lines = ansiString.split(/\r?\n/);

  // if (lines.find((line) => line.startsWith("Subject:")))
  //   if (lines[0].startsWith("Subject")) {
  //     messageExtensionResults.subject = lines[0].slice("Subject".length).trim();
  //     messageExtensionResults.firstLineOfMessageText++;
  //   }

  let currentLine = lines[messageExtensionResults.firstLineOfMessageText];
  let kludge = currentLine ? processExtension(currentLine) : null;
  while (kludge !== null) {
    if (kludge) {
      const { key, value } = kludge;
      messageExtensionResults[key] = value;
      messageExtensionResults.firstLineOfMessageText++;
    }
    currentLine = lines[messageExtensionResults.firstLineOfMessageText];
    kludge = currentLine ? processExtension(currentLine) : null;
  }

  return messageExtensionResults;
};
