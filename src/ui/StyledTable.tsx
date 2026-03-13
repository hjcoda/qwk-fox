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
  Row extends RowDataType<any>,
  Key extends RowKeyType,
>(
  props: TableProps<Row, Key> &
    React.RefAttributes<TableInstance<Row, Key>> & {
      onFocusUpdate(isFocused: boolean): void;
      onSelectedIndexChanged(index: number): void;
      rowKey: string;
    },
) => {
  const tableContainerRef = useRef<HTMLTableRowElement | null>(null);

  const handleFocus = () => {
    props.onFocusUpdate(true);
  };

  // Check if the related target (element gaining focus) is outside our table
  const handleBlur = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as Node;
    if (
      tableContainerRef.current &&
      !tableContainerRef.current.contains(relatedTarget)
    ) {
      props.onFocusUpdate(false);
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

  return (
    <Frame variant="field" ref={tableContainerRef} style={{ width: "100%" }}>
      <Table
        fillHeight
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
