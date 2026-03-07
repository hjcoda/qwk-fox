export type HeaderDescriptor = {
  title: string;
  accessorKey: string;
  width?: number;
};

export type TableRowData = Record<string, string | number>;
export type TableHeaders = HeaderDescriptor[];
export type DataRow = {
  index: number;
  disabled?: boolean;
  data: TableRowData;
};
