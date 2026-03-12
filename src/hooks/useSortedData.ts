import { useMemo } from "react";

export const useSortedData = <T>(
  data: readonly T[] | undefined,
  sortConfig: {
    key: keyof T | undefined;
    direction: "asc" | "desc" | undefined;
  },
) => {
  const { key, direction } = sortConfig;
  const collator = useMemo(
    () => new Intl.Collator("en", { sensitivity: "base" }),
    [],
  );

  return useMemo(() => {
    if (key && direction && data) {
      return [...data].sort((a, b) => {
        const comparison = collator.compare(String(a[key]), String(b[key]));
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }
    return data;
  }, [data, sortConfig.key, sortConfig.direction, collator]);
};
