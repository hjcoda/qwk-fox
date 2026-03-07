import { ScrollTable } from "../ui";
import { Conference } from "../data/DTO";

export const ConferenceList = ({
  bbsId,
  conferences,
  hideRead,
  onSelectedConferenceChanged,
}: {
  bbsId: string;
  conferences: Conference[] | null;
  hideRead: boolean;
  onSelectedConferenceChanged: (index: number) => void;
}): React.ReactElement => {
  const data = conferences
    ?.filter((c) => !hideRead || c.unread_count > 0)
    .map((c) => {
      return {
        index: c.id,
        disabled: c.message_count === 0,
        data: {
          id: c.id,
          title: c.title,
          message_count: c.message_count,
          unread_count: c.unread_count,
        },
      };
    });

  return (
    <ScrollTable
      keyPrefix={bbsId}
      headers={[
        { title: "Id", accessorKey: "id", width: 20 },
        { title: "Title", accessorKey: "title", width: 40 },
        { title: "Count", accessorKey: "message_count", width: 20 },
        { title: "Unread", accessorKey: "unread_count", width: 20 },
      ]}
      data={data ?? []}
      onSelectedIndexChange={(index) => {
        onSelectedConferenceChanged(index);
      }}
    />
  );
};
