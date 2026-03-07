import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import "./ScrollTable.css";

import {
  Frame,
  Table,
  TableBody,
  TableDataCell,
  TableHeadCell,
  TableRow,
} from "react95";
import { DataRow, TableHeaders, TableRowData } from "./ScrollTable.types";

export const ScrollTable = ({
  headers,
  data,
  keyPrefix,
  rowItemRenderer,
  onSelectedIndexChange,
}: {
  headers: TableHeaders;
  data: DataRow[];
  keyPrefix?: string;
  rowItemRenderer?: (
    data: TableRowData,
    key: string,
  ) => React.ReactElement | string | number;
  onSelectedIndexChange: (index: number) => void;
}): React.ReactElement => {
  // The scrollable element for your list
  const parentRef = useRef(null);
  const scrollToRef = useRef<HTMLTableRowElement | null>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  const [scrollNeedsCheck, setScrollNeedsCheck] = useState<boolean>(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const tableContainerRef = useRef<HTMLTableRowElement | null>(null);

  const rowClicked = (index: number) => {
    setSelectedRowIndex(index);
    onSelectedIndexChange(index);
    // Focus the container when a row is clicked
    tableContainerRef.current?.focus();
  };

  const selectedTableIndex = (): number => {
    return data.findIndex((d) => d.index === selectedRowIndex);
  };

  const incrementTableIndexBy = (increment: number) => {
    const currentIndex = selectedTableIndex();
    const newTableIndex = currentIndex + increment;

    if (newTableIndex >= 0 && newTableIndex < data.length) {
      const newRowIndex = data[newTableIndex].index;
      setSelectedRowIndex(newRowIndex);
      onSelectedIndexChange(newRowIndex);
      setScrollNeedsCheck(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle keyboard events if this specific table instance has focus
    if (!isFocused) return;
    // Only handle keyboard navigation if a row is selected
    if (selectedRowIndex === null) return;

    if (event.key === "ArrowUp" && selectedTableIndex() > 0) {
      event.preventDefault();
      incrementTableIndexBy(-1);
    } else if (
      event.key === "ArrowDown" &&
      selectedTableIndex() < data.length - 1
    ) {
      event.preventDefault();
      incrementTableIndexBy(1);
    }
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

  useEffect(() => {
    // Add event listener to window
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [data.length, selectedRowIndex, isFocused]); // Add isFocused to dependencies

  useEffect(() => {
    // If `scrollToRef` points to an element, then scroll it into view.
    if (scrollNeedsCheck && scrollToRef.current) {
      scrollToRef.current.scrollIntoView(false);
      setScrollNeedsCheck(false);
    }
  }, [scrollNeedsCheck]);

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
    <div
      className={"scrolltable-container"}
      ref={tableContainerRef}
      style={{
        outline: "none",
      }}
    >
      <Table
        className={"scrolltable-header"}
        style={{
          display: "table",
          tableLayout: "fixed",
        }}
      >
        <TableRow className="table-row">
          {headers.map((h) => (
            <TableHeadCell
              key={h.accessorKey}
              style={{ width: `${h.width}%`, overflow: "hidden" }}
            >
              {h.title}
            </TableHeadCell>
          ))}
        </TableRow>
      </Table>
      <Frame
        variant="field"
        style={{
          marginTop: "2px",
          padding: "1px",
        }}
        ref={parentRef}
        className="tbody-scroll expand-contents"
      >
        <table className={"table-no-hover"}>
          <TableBody
            className="scrolly"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const rowData = data[virtualItem.index];
              const classNames = ["table-row"];
              const highlighted = rowData.index === selectedRowIndex;
              highlighted &&
                classNames.push(
                  isFocused
                    ? "table-row--highlighted"
                    : "table-row--highlighted--unfocussed",
                );
              if (rowData && rowData.disabled) {
                classNames.push("disabled");
              }
              return (
                <TableRow
                  ref={highlighted ? scrollToRef : null}
                  key={`${keyPrefix ?? ""}-${virtualItem.key}`}
                  onMouseDown={() => {
                    if (!rowData.disabled) {
                      rowClicked(rowData.index);
                    }
                  }}
                  className={classNames.join(" ")}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    display: "table",
                    tableLayout: "fixed",
                  }}
                >
                  {headers.map((h) => {
                    const { accessorKey, width } = h;
                    const value = rowData.data[accessorKey];
                    return (
                      <TableDataCell
                        key={accessorKey}
                        style={
                          width
                            ? { width: `${width}%`, overflow: "hidden" }
                            : {}
                        }
                      >
                        {rowItemRenderer
                          ? rowItemRenderer(rowData.data, accessorKey)
                          : value}
                      </TableDataCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </Frame>
    </div>
  );
};
