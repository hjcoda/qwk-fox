import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Conference } from "../data/DTO";
import Column from "rsuite/esm/Table/TableColumn";
import HeaderCell from "rsuite/esm/Table/TableHeaderCell";
import { StyledTable } from "../ui/StyledTable";
import Cell from "rsuite/esm/Table/TableCell";

type ConferenceDisplay = {
  id: number;
  title: string;
  message_count: number;
  unread_count: number;
};

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
          const classNames = ["tree-row"];
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
        rowKey="index"
        fillHeight
        data={data}
        onSelectedIndexChanged={(index) => {
          setSelectedIndex(index);
          onSelectedConferenceChanged(index);
        }}
        onFocusUpdate={(focus) => setIsFocused(focus)}
      >
        <Column width={80} key="id">
          <HeaderCell>{"Id"}</HeaderCell>
          <StyledCell dataKey="id" />
        </Column>
        <Column flexGrow={1} key="title">
          <HeaderCell>{"Title"}</HeaderCell>
          <StyledCell dataKey="title" />
        </Column>
        <Column width={80} key="count">
          <HeaderCell>{"Count"}</HeaderCell>
          <StyledCell dataKey="message_count" />
        </Column>
        <Column width={80} key="unread">
          <HeaderCell>{"Unread"}</HeaderCell>
          <StyledCell dataKey="unread_count" />
        </Column>
      </StyledTable>
    );
  },
);
