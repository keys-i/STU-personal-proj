import { useCallback, useEffect, useMemo, useState } from "react";
import { listUsers, type UserFilter } from "../api";
import type { Paginated, User } from "../types";

type Meta = Paginated<User>["meta"];

export function useUsers(args: {
  page: number;
  limit: number;
  filter: UserFilter;
}) {
  const { page, limit, filter } = args;

  const [items, setItems] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stable key for deep compare (includes page so switching pages fetches new slice)
  const requestKey = useMemo(
    () => JSON.stringify({ page, limit, filter }),
    [page, limit, filter],
  );

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);

      try {
        const res = await listUsers({ page: p, limit, filter });
        setMeta(res.meta);
        setItems(res.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Request failed");
        setItems([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [filter, limit],
  );

  // refresh current page (don’t hard reset to page 1; parent owns page)
  const refresh = useCallback(async () => {
    await loadPage(page);
  }, [loadPage, page]);

  useEffect(() => {
    void loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const hasNext = meta ? meta.page < meta.totalPages : false;
  const hasPrev = meta ? meta.page > 1 : false;

  return {
    items,
    meta,
    loading,
    error,
    refresh,
    hasNext,
    hasPrev,
  };
}
