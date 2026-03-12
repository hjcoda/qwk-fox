import { useMemo } from "react";

export const useSortedData = <T>(
  data: T[],
  sortConfig: { key: keyof T; direction: "asc" | "desc" },
) => {
  const collator = useMemo(
    () => new Intl.Collator("en", { sensitivity: "base" }),
    [],
  );

  return useMemo(() => {
    return [...data].sort((a, b) => {
      const comparison = collator.compare(
        String(a[sortConfig.key]),
        String(b[sortConfig.key]),
      );
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig.key, sortConfig.direction, collator]);
};
