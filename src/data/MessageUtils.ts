import { MessageStatusEnum } from "./DTO";

const ReadMessageTypes = [
  MessageStatusEnum.PublicRead,

  MessageStatusEnum.PrivateRead,

  MessageStatusEnum.CommentToSysopRead,

  MessageStatusEnum.PasswordProtectedRead,

  MessageStatusEnum.GroupPasswordRead,
];

export const MessageIsRead = (messageStatus: MessageStatusEnum) =>
  ReadMessageTypes.includes(messageStatus);
