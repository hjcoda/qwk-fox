import { Message } from "../../data/DTO";
import { TreeNode } from "rsuite/esm/internals/Tree/types";
import { buildMessageTree, filterMessages } from "../../data/MessageUtils";
import "rsuite/dist/rsuite.css";
import { useMemo, useState } from "react";
import { SVARTable } from "../../ui/SVARTable/SVARTable";
import { formatDate } from "../../data/DateTimeFormat";
import { IColumnConfig, IRow } from "@svar-ui/react-grid";

export const MessageTree = ({
  hideRead,
  useThreads,
  messages,
  onSelectedMessageChanged,
  scrollToTopKey,
}: {
  hideRead: boolean;
  useThreads: boolean;
  messages: Message[] | null;
  onSelectedMessageChanged: (message_id: number) => void;
  scrollToTopKey?: string | number | null;
}) => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>();

  const data: TreeNode[] = useMemo(() => {
    if (!messages) return [];
    return useThreads
      ? buildMessageTree(messages)
      : filterMessages(messages, { hideRead });
  }, [messages, useThreads, hideRead]);

  const MessageCell = ({ row }: { row: IRow }) => {
    const dateStr = row?.dateToFormat ?? row?.date;
    if (!dateStr) return <div></div>;
    return (
      <div>
        <span>{formatDate(dateStr)}</span>
        <i className="wxi-check" />
      </div>
    );
  };

  const columns: IColumnConfig[] = useMemo(
    () => [
      {
        id: "subject",
        header: "Subject",
        flexgrow: 2,
        treetoggle: useThreads,
        sort: true,
      },
      { id: "from", header: "From", flexgrow: 1, sort: true },
      {
        id: "date",
        cell: MessageCell,
        header: "Date",
        flexgrow: 2,
        sort: true,
      },
    ],
    [],
  );

  function init(api: any) {
    api.on("update-cell", () => {
      const marks = api.getState().sortMarks;
      for (let key in marks) {
        api.exec("sort-rows", {
          key,
          order: marks[key].order,
          add: marks[key].index ?? true,
        });
      }
    });
  }

  return (
    <SVARTable
      init={init}
      columns={columns}
      tree={useThreads}
      virtualized
      expandedRowKeys={expandedRowKeys}
      defaultExpandAllRows={false}
      cellBordered
      rowKey="msg_id"
      data={data}
      selectedIndex={selectedIndex}
      isFocused={isFocused}
      fillHeight
      shouldUpdateScroll={false}
      scrollToTopKey={scrollToTopKey}
      onSelectedIndexChanged={(index) => {
        setSelectedIndex(index);
        setExpandedRowKeys((prevKeys) =>
          prevKeys.includes(index)
            ? prevKeys.filter((key) => key !== index)
            : [...prevKeys, index],
        );
        onSelectedMessageChanged(index);
      }}
      onFocusUpdate={(focus) => setIsFocused(focus)}
    />
  );
};
