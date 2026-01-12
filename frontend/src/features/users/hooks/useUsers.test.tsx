// src/features/users/hooks/useUsers.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useUsers } from "./useUsers";
import type { Paginated, User } from "../types";
import type { UserFilter } from "../api";

vi.mock("../api", () => ({
  listUsers: vi.fn(),
}));

import { listUsers } from "../api";

function makeUser(i: number): User {
  return {
    id: String(i),
    name: `User ${i}`,
    email: `u${i}@x.com`,
    status: "ACTIVE",
    role: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deletedAt: null,
  };
}

function makePage(args: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: User[];
}): Paginated<User> {
  const { page, limit, total, totalPages, items } = args;
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

function mockListUsersOnce(value: Paginated<User>) {
  (listUsers as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    value,
  );
}

function mockListUsersRejectOnce(err: unknown) {
  (listUsers as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUsers", () => {
  it("loads page 1 on mount (refresh) and sets items/meta", async () => {
    const limit = 10;
    const filter: UserFilter = { name: "a" };

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 2,
        totalPages: 1,
        items: [makeUser(1), makeUser(2)],
      }),
    );

    const { result } = renderHook(() => useUsers({ limit, filter }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledWith({ page: 1, limit, filter });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.meta?.page).toBe(1);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.each([
    {
      title: "hasNext true when page < totalPages",
      page: 1,
      totalPages: 3,
      expected: true,
    },
    {
      title: "hasNext false when page === totalPages",
      page: 3,
      totalPages: 3,
      expected: false,
    },
    {
      title: "hasNext false when only one page",
      page: 1,
      totalPages: 1,
      expected: false,
    },
  ])("$title", async ({ page, totalPages, expected }) => {
    mockListUsersOnce(
      makePage({
        page,
        limit: 10,
        total: 30,
        totalPages,
        items: [makeUser(1)],
      }),
    );

    const { result } = renderHook(() => useUsers({ limit: 10, filter: {} }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasNext).toBe(expected);
  });

  it("refresh() reloads page 1 and replaces items", async () => {
    const limit = 10;

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 2,
        totalPages: 1,
        items: [makeUser(1)],
      }),
    );

    const { result } = renderHook(() => useUsers({ limit, filter: {} }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((u) => u.id)).toEqual(["1"]);

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 1,
        totalPages: 1,
        items: [makeUser(99)],
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(listUsers).toHaveBeenCalledWith({ page: 1, limit, filter: {} });
    expect(result.current.items.map((u) => u.id)).toEqual(["99"]);
  });

  it("loadNext() appends next page when there are more pages", async () => {
    const limit = 2;

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 4,
        totalPages: 2,
        items: [makeUser(1), makeUser(2)],
      }),
    );

    const { result } = renderHook(() => useUsers({ limit, filter: {} }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasNext).toBe(true);

    mockListUsersOnce(
      makePage({
        page: 2,
        limit,
        total: 4,
        totalPages: 2,
        items: [makeUser(3), makeUser(4)],
      }),
    );

    await act(async () => {
      await result.current.loadNext();
    });

    expect(listUsers).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit,
      filter: {},
    });
    expect(listUsers).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit,
      filter: {},
    });

    expect(result.current.items.map((u) => u.id)).toEqual(["1", "2", "3", "4"]);
    expect(result.current.hasNext).toBe(false);
  });

  it.each([
    {
      title: "does nothing when meta is null",
      setup: () => {
        (
          listUsers as unknown as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() => new Promise(() => {}));
      },
      actLoadNext: true,
      expectedCalls: 1,
      expectHasNext: false,
    },
    {
      title: "does nothing when already loading",
      setup: () => {
        (
          listUsers as unknown as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() => new Promise(() => {}));
      },
      actLoadNext: true,
      expectedCalls: 1,
      expectHasNext: false,
    },
    {
      title: "does nothing when there is no next page",
      setup: () => {
        mockListUsersOnce(
          makePage({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            items: [makeUser(1)],
          }),
        );
      },
      actLoadNext: true,
      expectedCalls: 1,
      expectHasNext: false,
      waitInitial: true,
    },
  ])("$title", async ({ setup, actLoadNext, expectedCalls, waitInitial }) => {
    setup();

    const { result } = renderHook(() => useUsers({ limit: 10, filter: {} }));

    if (waitInitial) {
      await waitFor(() => expect(result.current.loading).toBe(false));
    }

    if (actLoadNext) {
      await act(async () => {
        await result.current.loadNext();
      });
    }

    expect(listUsers).toHaveBeenCalledTimes(expectedCalls);
  });

  it("sets error when listUsers throws, and keeps items/meta stable", async () => {
    mockListUsersRejectOnce(new Error("boom"));

    const { result } = renderHook(() => useUsers({ limit: 10, filter: {} }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
    expect(result.current.items).toEqual([]);
    expect(result.current.meta).toBeNull();
  });

  it.each([
    {
      title: "re-fetches when filter.name changes",
      initial: { name: "a" } satisfies UserFilter,
      next: { name: "ab" } satisfies UserFilter,
    },
    {
      title: "re-fetches when filter.status changes",
      initial: { status: "ACTIVE" } satisfies UserFilter,
      next: { status: "INACTIVE" } satisfies UserFilter,
    },
    {
      title: "re-fetches when adding from/to dates",
      initial: {} satisfies UserFilter,
      next: {
        fromDate: "2025-01-01",
        toDate: "2025-01-31",
      } satisfies UserFilter,
    },
  ])("$title", async ({ initial, next }) => {
    const limit = 10;

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 1,
        totalPages: 1,
        items: [makeUser(1)],
      }),
    );

    const { result, rerender } = renderHook(
      ({ f }: { f: UserFilter }) => useUsers({ limit, filter: f }),
      { initialProps: { f: initial } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(result.current.items.map((u) => u.id)).toEqual(["1"]);

    mockListUsersOnce(
      makePage({
        page: 1,
        limit,
        total: 1,
        totalPages: 1,
        items: [makeUser(2)],
      }),
    );

    rerender({ f: next });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(result.current.items.map((u) => u.id)).toEqual(["2"]);
  });
});
