import { TreeNode } from "rsuite/esm/internals/Tree/types";
import { Message, MessageStatusEnum } from "./DTO";
import { formatDate } from "./DateTimeFormat";

const ReadMessageTypes = [
  MessageStatusEnum.PublicRead,

  MessageStatusEnum.PrivateRead,

  MessageStatusEnum.CommentToSysopRead,

  MessageStatusEnum.PasswordProtectedRead,

  MessageStatusEnum.GroupPasswordRead,
];

export const MessageIsRead = (messageStatus: MessageStatusEnum) =>
  ReadMessageTypes.includes(messageStatus);

export const getReadMessageStatus = (messageStatus: MessageStatusEnum) => {
  const readStatusLookup: Partial<
    Record<MessageStatusEnum, MessageStatusEnum>
  > = {
    [MessageStatusEnum.PublicUnread]: MessageStatusEnum.PublicRead,
    [MessageStatusEnum.PrivateUnread]: MessageStatusEnum.PrivateRead,
    [MessageStatusEnum.CommentToSysopUnread]:
      MessageStatusEnum.CommentToSysopRead,
    [MessageStatusEnum.PasswordProtectedUnread]:
      MessageStatusEnum.PasswordProtectedRead,
    [MessageStatusEnum.GroupPasswordUnread]:
      MessageStatusEnum.GroupPasswordRead,
  };

  return readStatusLookup[messageStatus] ?? messageStatus;
};

export const buildMessageTree = (messages: Message[]): TreeNode[] => {
  // Create a map to store nodes by their ID for quick lookup
  const nodeMap = new Map<string | number, TreeNode>();

  // First pass: Create TreeNode objects with empty children arrays
  messages.forEach((message) => {
    nodeMap.set(message.msg_id, {
      ...message,
    });
  });

  const roots: TreeNode[] = [];

  // Second pass: Build the tree structure
  messages.forEach((message) => {
    const currentNode = nodeMap.get(message.msg_id)!;

    if (
      message.in_reply_to === null ||
      message.in_reply_to === undefined ||
      message.in_reply_to === 0
    ) {
      // This is a root node
      roots.push(currentNode);
    } else {
      // This node has a parent
      const parentNode = nodeMap.get(message.in_reply_to);
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      } else {
        // Handle case where parent doesn't exist (orphaned node)
        // console.warn(
        //   `Parent with id ${node.parentId} not found for node ${node.id}`,
        // );
        roots.push(currentNode);
      }
    }
  });

  return roots;
};

export const filterMessages = (
  messages: Message[],
  options: { hideRead: boolean },
): Message[] => {
  const { hideRead } = options;
  if (hideRead) {
    return messages.filter((m) => !MessageIsRead(m.type_id));
  }

  return messages;
};

export const enhanceMessages = (messages: Message[]): Message[] => {
  return messages.map((m) => {
    const enhanced = { ...m, subject: m.header?.subject ?? m.subject };
    if (m.header) {
      enhanced.dateToFormat = m.header.when_written ?? m.date;
    } else {
      enhanced.dateToFormat = m.date;
    }
    enhanced.date = formatDate(enhanced.dateToFormat);

    return enhanced;
  });
};
