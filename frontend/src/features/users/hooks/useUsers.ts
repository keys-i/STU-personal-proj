import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listUsers, type UserFilter } from "../api";
import type { Paginated, User } from "../types";

type Meta = Paginated<User>["meta"];

export function useUsers(args: { limit: number; filter: UserFilter }) {
  const { limit, filter } = args;

  const [items, setItems] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // track current page without causing re-renders
  const pageRef = useRef(1);

  // stable key for deep compare
  const filterKey = useMemo(
    () => JSON.stringify({ limit, filter }),
    [limit, filter],
  );

  const loadPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      setLoading(true);
      setError(null);

      try {
        const res = await listUsers({ page, limit, filter });

        pageRef.current = res.meta.page;
        setMeta(res.meta);

        setItems((prev) =>
          mode === "replace" ? res.data : [...prev, ...res.data],
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [filter, limit],
  );

  const refresh = useCallback(async () => {
    pageRef.current = 1;
    await loadPage(1, "replace");
  }, [loadPage]);

  const loadNext = useCallback(async () => {
    if (loading) return;
    if (!meta) return;

    const hasNext = meta.page < meta.totalPages;
    if (!hasNext) return;

    const next = pageRef.current + 1;
    if (next > meta.totalPages) return;

    await loadPage(next, "append");
  }, [loadPage, loading, meta]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return {
    items,
    meta,
    loading,
    error,
    refresh,
    loadNext,
    hasNext: meta ? meta.page < meta.totalPages : false,
  };
}
