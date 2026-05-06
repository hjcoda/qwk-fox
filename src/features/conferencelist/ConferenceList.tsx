import { memo, useEffect, useMemo, useState } from "react";
import { Conference } from "../../data/DTO";
import { SVARTable } from "../../ui/SVARTable/SVARTable";
import { IColumnConfig } from "@svar-ui/react-grid";

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
    const [_isFocused, setIsFocused] = useState(false);
    const [_selectedIndex, setSelectedIndex] = useState<number>();

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

    const columns: IColumnConfig[] = useMemo(
      () => [
        {
          id: "id",
          header: "ID",
          flexgrow: 1,
          sort: true,
          hidden: true,
        },
        {
          id: "title",
          header: "Title",
          flexgrow: 2,
          sort: true,
        },
        {
          id: "message_count",
          header: "Message Count",
          flexgrow: 1,
          sort: true,
          hidden: true,
        },
        {
          id: "unread_count",
          header: "Unread Count",
          flexgrow: 1,
          sort: true,
          hidden: true,
        },
      ],
      [],
    );

    return (
      <SVARTable
        columns={columns}
        showHeader={columns.length > 1}
        rowKey="index"
        fillHeight
        data={data}
        onSelectedIndexChanged={(index) => {
          setSelectedIndex(index);
          onSelectedConferenceChanged(index);
        }}
        onFocusUpdate={(focus) => setIsFocused(focus)}
      />
    );
  },
);
