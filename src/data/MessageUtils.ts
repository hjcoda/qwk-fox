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

export const getReadMessageStatus = (messageStatus: MessageStatusEnum) => {
  if (messageStatus === MessageStatusEnum.PublicUnread)
    return MessageStatusEnum.PublicRead;
  if (messageStatus === MessageStatusEnum.PrivateUnread)
    return MessageStatusEnum.PrivateRead;
  if (messageStatus === MessageStatusEnum.CommentToSysopUnread)
    return MessageStatusEnum.CommentToSysopRead;
  if (messageStatus === MessageStatusEnum.PasswordProtectedUnread)
    return MessageStatusEnum.PasswordProtectedRead;
  if (messageStatus === MessageStatusEnum.GroupPasswordUnread)
    return MessageStatusEnum.GroupPasswordRead;

  return messageStatus;
};
