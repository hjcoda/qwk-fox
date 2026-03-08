const SynchronetKludges = ["@VIA", "@MSGID", "@REPLY", "@TZ"] as const;
type SynchronetKludge = (typeof SynchronetKludges)[number];

export type MessageExtensions = {
  firstLineOfMessageText: number;
  subject?: string;
  "@VIA"?: string;
  "@MSGID"?: string;
  "@REPLY"?: string;
  "@TZ"?: string;
  "Re:"?: string;
  "By:"?: string;
};

const processKludge = (
  line: string,
): { key: SynchronetKludge; value: string } | null => {
  for (const keyIndex in SynchronetKludges) {
    const key = SynchronetKludges[keyIndex];
    if (line.startsWith(key)) {
      const value = line.slice(key.length);
      return { key: key as SynchronetKludge, value };
    }
  }

  return null;
};

/** Extract Kludge lines and extensions from the message if present */
export const extractMessageExtensions = (
  ansiString: string,
): MessageExtensions => {
  let messageExtensions: MessageExtensions = { firstLineOfMessageText: 0 };
  const lines = ansiString.split(/\r?\n/);
  if (lines[0].startsWith("Subject")) {
    messageExtensions.subject = lines[0].slice("Subject".length).trim();
    messageExtensions.firstLineOfMessageText++;
  }

  while (
    processKludge(lines[messageExtensions.firstLineOfMessageText]) !== null
  ) {
    const kludge = processKludge(
      lines[messageExtensions.firstLineOfMessageText],
    );
    if (kludge) {
      const { key, value } = kludge;
      messageExtensions[key] = value;
      messageExtensions.firstLineOfMessageText++;
    }
  }

  return messageExtensions;
};
