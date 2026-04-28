import { SortType } from "rsuite";
import { Message } from "../../data/DTO";
import { TreeNode } from "rsuite/esm/internals/Tree/types";
import {
  buildMessageTree,
  filterMessages,
  MessageIsRead,
} from "../../data/MessageUtils";
import "rsuite/dist/rsuite.css";
import { useMemo, useState } from "react";
import { useSortedData } from "../../hooks/useSortedData";
import { SVARTable } from "../../ui/SVARTable/SVARTable";
import { formatDate } from "../../data/DateTimeFormat";

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
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortType, setSortType] = useState<SortType | undefined>();

  const data: TreeNode[] = useMemo(() => {
    if (!messages) return [];
    return useThreads
      ? buildMessageTree(messages)
      : filterMessages(messages, { hideRead });
  }, [messages, useThreads, hideRead]);

  const sortedData = useSortedData<TreeNode>(data, {
    key: sortColumn,
    direction: sortType,
  });

  function MessageCell({ row }: { row: Message }) {
    const dateStr = row?.dateToFormat ?? row?.date;
    if (!dateStr) return <div></div>;
    return (
      <div>
        <span>{formatDate(dateStr)}</span>
        <i className="wxi-check" />
      </div>
    );
  }

  const columns = [
    { id: "subject", header: "Subject", flexgrow: 2, treetoggle: useThreads },
    { id: "from", header: "From", flexgrow: 1 },
    { id: "date", cell: MessageCell, header: "Date", flexgrow: 2 },
  ];

  return (
    <SVARTable
      columns={columns}
      sortColumn={sortColumn}
      sortType={sortType}
      onSortColumn={(column, type) => {
        setSortColumn(column);
        setSortType(type);
      }}
      tree={useThreads}
      virtualized
      expandedRowKeys={expandedRowKeys}
      defaultExpandAllRows={false}
      cellBordered
      rowKey="msg_id"
      data={sortedData}
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
    ></SVARTable>
  );
};
