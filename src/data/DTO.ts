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
  section?: number;
  section_bytes?: number;
  section_blocks?: number;
  subject: string;
  text: string;
  date: string;
  time: string;
  to: string;
  from: string;
  in_reply_to: number;
  conference_id: number;
  header?: MessageHeader;
  dateToFormat?: string;
}

export interface MessageHeader {
  section: number;
  section_bytes?: number;
  section_blocks?: number;
  utf8?: boolean;
  format?: string;
  message_ids: string[];
  in_reply_to?: string;
  when_written?: string;
  when_imported?: string;
  when_exported?: string;
  exported_from?: string;
  sender?: string;
  sender_net_addr?: string;
  sender_ip_addr?: string;
  sender_host_name?: string;
  sender_protocol?: string;
  organization?: string;
  reply_to?: string;
  subject?: string;
  to?: string;
  to_net_addr?: string;
  x_ftn_area?: string;
  x_ftn_seen_by?: string;
  x_ftn_path?: string;
  x_ftn_msgid?: string;
  x_ftn_reply?: string;
  x_ftn_pid?: string;
  x_ftn_flags?: string;
  x_ftn_tid?: string;
  x_ftn_chrs?: string;
  x_ftn_kludge?: string;
  editor?: string;
  columns?: number;
  tags?: string;
  path?: string;
  newsgroups?: string;
  conference?: number;
  other_fields: Record<string, string[]>;
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
