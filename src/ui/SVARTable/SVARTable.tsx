import { Grid, IApi, IColumnConfig } from "@svar-ui/react-grid";
import "@svar-ui/react-grid/all.css";
import "./SVARTable.css";
import { useEffect, useRef, useState } from "react";
import { Frame } from "react95";

export const SVARTable = (props: {
  onFocusUpdate(isFocused: boolean): void;
  onSelectedIndexChanged(index: number): void;
  rowKey: string;
  scrollToTopKey?: string | number | null;
  columns: IColumnConfig[];
  tree: boolean;
}) => {
  const { tree, data, columns, onSelectedIndexChanged } = props;

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<any | null>(null);
  const api = useRef<IApi | null>(null);

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
      className="table-container"
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
      <Grid
        sizes={{ rowHeight: 37 }}
        select={true}
        onSelectRow={(ev) => {
          onSelectedIndexChanged(Number(ev.id));
          console.log(`selecting row '${JSON.stringify(ev)}'`);
          // Focus the container when a row is clicked
          tableContainerRef.current?.focus();
        }}
        ref={api}
        data={data}
        tree={tree}
        columns={columns}
        filterValues={undefined}
      />
    </Frame>
  );
};
