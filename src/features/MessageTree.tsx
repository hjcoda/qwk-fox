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
import "./MessageTree.css";
import { memo, useCallback, useMemo, useState } from "react";
import { useSortedData } from "../hooks/useSortedData";
import { StyledTable } from "../ui/StyledTable";

export const MessageTree = memo(
  ({
    hideRead,
    useThreads,
    messages,
    onSelectedMessageChanged,
  }: {
    hideRead: boolean;
    useThreads: boolean;
    messages: Message[] | null;
    onSelectedMessageChanged: (message_id: number) => void;
  }) => {
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
          const classNames = ["tree-row"];
          if (rowData.msg_id === selectedIndex) {
            classNames.push(
              isFocused
                ? "tree-row--highlighted"
                : "tree-row--highlighted--unfocussed",
            );
          }
          if (!MessageIsRead(rowData.type_id)) {
            classNames.push("unread-message-row");
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
        defaultExpandAllRows={false}
        cellBordered
        rowKey="msg_id"
        data={useSortedData<TreeNode>(data, {
          key: sortColumn,
          direction: sortType,
        })}
        fillHeight
        shouldUpdateScroll={false}
        onSelectedIndexChanged={(index) => {
          setSelectedIndex(index);
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
          <MessageCell dataKey="date" />
        </Column>
      </StyledTable>
    );
  },
);
