import { useEffect, useRef } from "react";
import { Frame } from "react95";
import {
  RowDataType,
  RowKeyType,
  Table,
  TableInstance,
  TableProps,
} from "rsuite";

export const StyledTable = <
  Row extends RowDataType<unknown>,
  Key extends RowKeyType,
>(
  props: TableProps<Row, Key> &
    React.RefAttributes<TableInstance<Row, Key>> & {
      onFocusUpdate(isFocused: boolean): void;
      onSelectedIndexChanged(index: number): void;
      rowKey: string;
      scrollToTopKey?: string | number | null;
    },
) => {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<TableInstance<Row, Key> | null>(null);


  useEffect(() => {
    if (props.scrollToTopKey === undefined) {
      return;
    }
    if (tableRef.current?.scrollTop) {
      tableRef.current.scrollTop(0);
    }
  }, [props.scrollToTopKey]);

  return (
    <Frame
      variant="field"
      ref={tableContainerRef}
      style={{ width: "100%", padding: "1.5px" }}
      tabIndex={-1}
      onFocus={() => props.onFocusUpdate(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (
          tableContainerRef.current &&
          nextTarget &&
          tableContainerRef.current.contains(nextTarget)
        ) {
          return;
        }
        props.onFocusUpdate(false);
      }}
    >
      <Table
        ref={tableRef}
        locale={{ emptyMessage: "" }}
        style={{ width: "100%" }}
        fillHeight
        rowHeight={30}
        onRowClick={(row) => {
          const value = row[props.rowKey];
          props.onSelectedIndexChanged(Number(value));
          // Focus the container when a row is clicked
          tableContainerRef.current?.focus();
        }}
        {...props}
      />
    </Frame>
  );
};
