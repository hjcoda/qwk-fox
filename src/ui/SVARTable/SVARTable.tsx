import { Grid, IApi, IColumnConfig } from "@svar-ui/react-grid";
import "@svar-ui/react-grid/all.css";
import "./SVARTable.css";
import { useEffect, useRef } from "react";
import { Frame } from "react95";

type SVARTableRow = Record<string, unknown> & {
  id?: string | number;
  [key: string]: unknown;
};

type SVARTableProps = {
  onFocusUpdate(isFocused: boolean): void;
  onSelectedIndexChanged(index: number): void;
  rowKey: string;
  scrollToTopKey?: string | number | null;
  columns: IColumnConfig[];
  tree?: boolean;
  data: SVARTableRow[];
  selectedIndex?: number;
  isFocused?: boolean;
} & Record<string, unknown>;

export const SVARTable = (props: SVARTableProps) => {
  const {
    tree,
    data,
    columns,
    onSelectedIndexChanged,
    onFocusUpdate,
    rowKey,
    scrollToTopKey,
    selectedIndex,
    isFocused,
    ...gridProps
  } = props;

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const api = useRef<IApi | null>(null);

  useEffect(() => {
    if (scrollToTopKey === undefined) {
      return;
    }
    if (tableRef.current?.scrollTop) {
      tableRef.current.scrollTop = 0;
    }
  }, [scrollToTopKey]);

  useEffect(() => {
    if (!api.current || selectedIndex === undefined) {
      return;
    }
    (
      api.current as { setSelectedRow?: (id: string) => void }
    )?.setSelectedRow?.(String(selectedIndex));
  }, [selectedIndex]);

  return (
    <Frame
      className="table-container"
      variant="field"
      ref={tableContainerRef}
      style={{ width: "100%", padding: "1.5px" }}
      tabIndex={-1}
      onFocus={() => onFocusUpdate(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (
          tableContainerRef.current &&
          nextTarget &&
          tableContainerRef.current.contains(nextTarget)
        ) {
          return;
        }
        onFocusUpdate(false);
      }}
    >
      <Grid
        {...gridProps}
        sizes={{ rowHeight: 37 }}
        select={true}
        onSelectRow={(ev) => {
          onSelectedIndexChanged(Number(ev.id));
          // Focus the container when a row is clicked
          tableContainerRef.current?.focus();
        }}
        ref={api}
        data={data}
        tree={tree}
        columns={columns}
        filterValues={{}}
      />
    </Frame>
  );
};
