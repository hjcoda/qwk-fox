import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Conference } from "../data/DTO";
import Column from "rsuite/esm/Table/TableColumn";
import HeaderCell from "rsuite/esm/Table/TableHeaderCell";
import { StyledTable } from "../ui/StyledTable/StyledTable";
import Cell from "rsuite/esm/Table/TableCell";

type ConferenceDisplay = {
  id: number;
  title: string;
  message_count: number;
  unread_count: number;
};

const ID_Column = {
  key: "id",
  dataKey: "id" as keyof ConferenceDisplay,
  label: "Id",
  fixed: true,
  width: 80,
};

const Title_Column = {
  key: "title",
  label: "Title",
  dataKey: "title" as keyof ConferenceDisplay,
  fixed: true,
  flexGrow: 1,
};

const defaultColumns = [ID_Column, Title_Column];

export const ConferenceList = memo(
  ({
    bbsId,
    conferences,
    hideEmptyConferences,
    onSelectedConferenceChanged,
  }: {
    bbsId: string | null;
    conferences: Conference[] | null;
    hideEmptyConferences: boolean;
    onSelectedConferenceChanged: (index: number) => void;
  }): React.ReactElement => {
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>();
    const [columnKeys] = useState(["title"]);

    const columns = defaultColumns.filter((column) =>
      columnKeys.some((key) => key === column.key),
    );

    useEffect(() => {
      setSelectedIndex(undefined);
    }, [bbsId]);
    const data = useMemo(() => {
      return (
        conferences
          ?.filter((c) => !hideEmptyConferences || c.message_count > 0)
          .map((c) => {
            return {
              index: c.id,
              disabled: c.message_count === 0,
              id: c.id,
              title: c.title,
              message_count: c.message_count,
              unread_count: c.unread_count,
            };
          }) ?? []
      );
    }, [conferences, hideEmptyConferences]);

    const StyledCell = useCallback(
      ({
        rowData,
        dataKey,
        ...rest
      }: {
        rowData?: ConferenceDisplay;
        dataKey: keyof ConferenceDisplay;
      }) => {
        if (rowData) {
          const classNames = ["row"];
          if (rowData.id === selectedIndex) {
            classNames.push(
              isFocused ? "row--highlighted" : "row--highlighted--unfocussed",
            );
          }
          if (rowData.unread_count > 0) {
            classNames.push("bold");
          }
          return (
            <Cell className={classNames.join(" ")} rowData={rowData} {...rest}>
              {rowData[dataKey]}
            </Cell>
          );
        }
      },
      [selectedIndex, isFocused],
    );

    return (
      <StyledTable
        showHeader={columns.length > 1}
        rowKey="index"
        fillHeight
        data={data}
        onSelectedIndexChanged={(index) => {
          setSelectedIndex(index);
          onSelectedConferenceChanged(index);
        }}
        onFocusUpdate={(focus) => setIsFocused(focus)}
      >
        {columns.map((col) => {
          const { label, dataKey, ...rest } = col;
          return (
            <Column {...rest}>
              <HeaderCell>{label}</HeaderCell>
              <StyledCell dataKey={dataKey} />
            </Column>
          );
        })}
      </StyledTable>
    );
  },
);
