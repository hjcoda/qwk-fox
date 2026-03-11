export type Server = {
  bbs_id: string;
  bbs_name: string;
  city_and_state: string;
  phone_number: string;
  sysop_name: string;
  creation_time: string;
  user_name: string;
};

export type Conference = {
  id: number;
  title: string;
  message_count: number;
  unread_count: number;
};

export interface Message {
  type_id: MessageStatusEnum;
  msg_id: number;
  subject: string;
  text: string;
  date: string;
  time: string;
  to: string;
  from: string;
  in_reply_to: number;
  conference_id: number;
}

export enum MessageStatusEnum {
  PublicUnread = " ",
  PublicRead = "-",
  PrivateUnread = "+",
  PrivateRead = "*",
  CommentToSysopUnread = "~",
  CommentToSysopRead = "`",
  PasswordProtectedUnread = "%",
  PasswordProtectedRead = "^",
  GroupPasswordUnread = "!",
  GroupPasswordRead = "#",
  GroupPasswordToAll = "$",
}
