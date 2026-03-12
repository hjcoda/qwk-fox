import { SortType, Table } from "rsuite";
import { Message } from "../data/DTO";
import { TreeNode } from "rsuite/esm/internals/Tree/types";
import { buildMessageTree, MessageIsRead } from "../data/MessageUtils";
import Column from "rsuite/esm/Table/TableColumn";
import HeaderCell from "rsuite/esm/Table/TableHeaderCell";
import Cell from "rsuite/esm/Table/TableCell";
import "rsuite/dist/rsuite.css";
import "./MessageTree.css";
import { useEffect, useRef, useState } from "react";
import { Frame } from "react95";
import { useSortedData } from "../hooks/useSortedData";

export const MessageTree = ({
  messages,
  onSelectedMessageChanged,
}: {
  messages: Message[] | null;
  onSelectedMessageChanged: (message_id: number) => void;
}) => {
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortType, setSortType] = useState<SortType | undefined>();
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );
  const data: TreeNode[] = messages ? buildMessageTree(messages) : [];

  const [isFocused, setIsFocused] = useState(false);
  const tableContainerRef = useRef<HTMLTableRowElement | null>(null);

  const handleSortColumn = (
    sortColumn: string | undefined,
    sortType: SortType | undefined,
  ) => {
    setSortColumn(sortColumn);
    setSortType(sortType);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Check if the related target (element gaining focus) is outside our table
  const handleBlur = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as Node;
    if (
      tableContainerRef.current &&
      !tableContainerRef.current.contains(relatedTarget)
    ) {
      setIsFocused(false);
    }
  };

  // Focus management effect
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener("focus", handleFocus);
      container.addEventListener("blur", handleBlur);

      // Make the container focusable
      container.tabIndex = -1;

      return () => {
        container.removeEventListener("focus", handleFocus);
        container.removeEventListener("blur", handleBlur);
      };
    }
  }, []);

  const MessageCell = ({
    rowData,
    dataKey,
    ...rest
  }: {
    rowData?: Message & { value: number };
    dataKey: keyof Message;
  }) => {
    if (rowData) {
      const classNames = [];
      if (rowData.value === selectedMessageId) {
        classNames.push(
          isFocused
            ? "tree-row--highlighted"
            : "tree-row--highlighted--unfocussed",
        );
      }
      return (
        <Cell className={classNames.join(" ")} rowData={rowData} {...rest}>
          {MessageIsRead(rowData.type_id) ? (
            rowData[dataKey]
          ) : (
            <strong>{rowData[dataKey]}</strong>
          )}
        </Cell>
      );
    }
  };

  return (
    <Frame variant="field" ref={tableContainerRef} style={{ width: "100%" }}>
      <Table
        sortColumn={sortColumn}
        sortType={sortType}
        onSortColumn={handleSortColumn}
        isTree
        virtualized
        defaultExpandAllRows={false}
        cellBordered
        rowKey="value"
        data={
          sortColumn && sortType
            ? useSortedData<TreeNode>(data, {
                key: sortColumn,
                direction: sortType,
              })
            : data
        }
        fillHeight
        shouldUpdateScroll={false}
        onRowClick={({ value }) => {
          setSelectedMessageId(Number(value));
          onSelectedMessageChanged(Number(value));
          // Focus the container when a row is clicked
          tableContainerRef.current?.focus();
        }}
      >
        <Column flexGrow={1} sortable>
          <HeaderCell>Subject</HeaderCell>
          <MessageCell dataKey="subject" />
        </Column>
        <Column flexGrow={1} sortable>
          <HeaderCell>From</HeaderCell>
          <MessageCell dataKey="from" />
        </Column>
        <Column flexGrow={1} sortable>
          <HeaderCell>Date</HeaderCell>
          <MessageCell dataKey="date" />
        </Column>
      </Table>
    </Frame>
  );
};
