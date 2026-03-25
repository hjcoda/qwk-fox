import { SortType } from "rsuite";
import { Message } from "../data/DTO";
import { TreeNode } from "rsuite/esm/internals/Tree/types";
import {
  buildMessageTree,
  filterMessages,
  MessageIsRead,
} from "../data/MessageUtils";
import Column from "rsuite/esm/Table/TableColumn";
import HeaderCell from "rsuite/esm/Table/TableHeaderCell";
import Cell from "rsuite/esm/Table/TableCell";
import "rsuite/dist/rsuite.css";
import { useCallback, useMemo, useState } from "react";
import { useSortedData } from "../hooks/useSortedData";
import { StyledTable } from "../ui/StyledTable/StyledTable";
import { formatDate } from "../data/DateTimeFormat";

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

    const handleSortColumn = (
      sortColumn: string | undefined,
      sortType: SortType | undefined,
    ) => {
      setSortColumn(sortColumn);
      setSortType(sortType);
    };

    const MessageCell = useCallback(
      ({
        rowData,
        dataKey,
        ...rest
      }: {
        rowData?: Message;
        dataKey: keyof Message;
      }) => {
        if (rowData) {
          const classNames = ["row"];
          if (rowData.msg_id === selectedIndex) {
            classNames.push(
              isFocused ? "row--highlighted" : "row--highlighted--unfocussed",
            );
          }
          if (!MessageIsRead(rowData.type_id)) {
            classNames.push("bold");
          }
          return (
            <Cell className={classNames.join(" ")} rowData={rowData} {...rest}>
              {String(rowData[dataKey] ?? "")}
            </Cell>
          );
        }
      },
      [selectedIndex, isFocused],
    );

    return (
      <StyledTable
        sortColumn={sortColumn}
        sortType={sortType}
        onSortColumn={handleSortColumn}
        isTree={useThreads}
        virtualized
        expandedRowKeys={expandedRowKeys}
        defaultExpandAllRows={false}
        cellBordered
        rowKey="msg_id"
        data={useSortedData<TreeNode>(data, {
          key: sortColumn,
          direction: sortType,
        })}
        fillHeight
        shouldUpdateScroll={false}
        scrollToTopKey={scrollToTopKey}
        onSelectedIndexChanged={(index) => {
          setSelectedIndex(index);
          setExpandedRowKeys((prevKeys) => {
            if (prevKeys.includes(index)) {
              return prevKeys.filter((key) => key !== index);
            } else {
              return [...prevKeys, index];
            }
          });
          onSelectedMessageChanged(index);
        }}
        onFocusUpdate={(focus) => setIsFocused(focus)}
      >
        <Column flexGrow={1} sortable>
          <HeaderCell>Subject</HeaderCell>
          <MessageCell dataKey="subject" />
        </Column>
        <Column width={150} sortable>
          <HeaderCell>From</HeaderCell>
          <MessageCell dataKey="from" />
        </Column>
        <Column flexGrow={1} sortable>
          <HeaderCell>Date</HeaderCell>
          <Cell>
            {(rowData) => {
              const msg = rowData as Message;
              const dateStr = msg.dateToFormat ?? msg.date;
              return formatDate(dateStr);
            }}
          </Cell>
        </Column>
      </StyledTable>
    );
};
