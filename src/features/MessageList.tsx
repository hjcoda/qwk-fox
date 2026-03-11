import { useState } from "react";
import { Message } from "../data/DTO";
import { MessageIsRead } from "../data/MessageUtils";
import { ScrollTable } from "../ui";
import { TableRowData } from "../ui/ScrollTable.types";

export const MessageList = ({
  messages,
  hideRead,
  onSelectedMessageChanged,
}: {
  messages: Message[] | null;
  hideRead: boolean;
  onSelectedMessageChanged: (message_id: number) => void;
}): React.ReactElement => {
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );
  const data = messages
    ? messages
        .filter(
          (m) =>
            !hideRead ||
            !MessageIsRead(m.type_id) ||
            m.msg_id === selectedMessageId,
        )
        .map((m) => {
          return {
            index: m.msg_id,
            disabled: false,
            data: {
              id: m.msg_id,
              subject: m.subject,
              date: m.date,
              from: m.from,
              to: m.to,
              type: m.type_id,
            },
          };
        })
    : [];

  return (
    <ScrollTable
      headers={[
        { title: "Id", accessorKey: "id", width: 10 },
        { title: "From", accessorKey: "from", width: 20 },
        { title: "To", accessorKey: "to", width: 20 },
        { title: "Subject", accessorKey: "subject", width: 30 },
        { title: "Date", accessorKey: "date", width: 20 },
      ]}
      data={data}
      onSelectedIndexChange={(index) => {
        setSelectedMessageId(index);
        onSelectedMessageChanged(index);
      }}
      rowItemRenderer={(data: TableRowData, accessorKey: string) => {
        if (data["type"] === " ") {
          return (
            <div style={{ fontWeight: "bold" }}>{`${data[accessorKey]}`}</div>
          );
        }

        return data[accessorKey];
      }}
    />
  );
};
