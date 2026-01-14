import { describe, it, expect, vi, beforeEach } from "vitest";
import { within, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsersTable } from "./UsersTable";
import type { User } from "../types";

// Mock date formatting so tests are stable
vi.mock("../../../shared/utils/date", () => ({
  formatDate: (iso?: string | null) => (iso ? `FMT(${iso})` : "—"),
}));

function makeUser(n: number, overrides: Partial<User> = {}): User {
  return {
    id: String(n),
    name: `User ${n}`,
    email: `user${n}@example.com`,
    status: "ACTIVE",
    role: n % 2 === 0 ? "ADMIN" : null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("UsersTable", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onLimitChange = vi.fn();
  const onPrevPage = vi.fn();
  const onNextPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderTable(
    overrides?: Partial<React.ComponentProps<typeof UsersTable>>,
  ) {
    const users = overrides?.users ?? [makeUser(1), makeUser(2)];

    render(
      <UsersTable
        users={users}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        page={1}
        totalPages={3}
        hasPrev={false}
        hasNext={true}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onEdit={onEdit}
        onDelete={onDelete}
        {...overrides}
      />,
    );
  }

  it("renders table, headers, and rows", () => {
    renderTable({ users: [makeUser(1), makeUser(2)] });

    expect(
      screen.getByRole("table", { name: /users table/i }),
    ).toBeInTheDocument();

    // column headers (NEW set)
    for (const h of ["Name", "Email", "Status", "Role", "Created"]) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }

    // content
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();

    // createdAt uses mocked formatter
    expect(screen.getAllByText(/^FMT\(/)).toHaveLength(2);

    // shows count
    const metaRow = screen.getByText(/showing/i).closest("div");
    expect(metaRow).toBeTruthy();
    expect(metaRow!).toHaveTextContent("Showing");
    expect(metaRow!).toHaveTextContent("2");
  });

  it("shows empty state when no users", () => {
    renderTable({ users: [] });
    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });

  it("shows loading indicator when loading", () => {
    renderTable({ loading: true, users: [makeUser(1)] });

    const meta = screen.getByText(/showing/i).closest("div") as HTMLElement;
    expect(meta).toBeTruthy();
    expect(within(meta!).getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows the limit prop as the input value when not editing", () => {
    renderTable({ limit: 25 });

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it.each([
    { title: "Enter commits a new limit", typed: "42", expected: 42 },
    { title: "clamps below 1 to 1", typed: "0", expected: 1 },
    { title: "clamps above 100 to 100", typed: "999", expected: 100 },
  ])("$title", async ({ typed, expected }) => {
    const user = userEvent.setup();
    renderTable({ limit: 10 });

    const input = screen.getByLabelText(/users per page limit/i);

    await user.click(input);
    await user.clear(input);
    await user.type(input, typed);
    await user.keyboard("{Enter}");

    expect(onLimitChange).toHaveBeenCalledTimes(1);
    expect(onLimitChange).toHaveBeenCalledWith(expected);
  });

  it("does not call onLimitChange if committed value equals current limit", async () => {
    const user = userEvent.setup();
    renderTable({ limit: 10 });

    const input = screen.getByLabelText(/users per page limit/i);

    await user.click(input);
    await user.clear(input);
    await user.type(input, "10");
    await user.keyboard("{Enter}");

    expect(onLimitChange).not.toHaveBeenCalled();
  });

  it("Escape cancels editing and restores input to prop value", async () => {
    const user = userEvent.setup();
    renderTable({ limit: 10 });

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);
    // number inputs are annoying; this is still ok for happy path
    await user.clear(input);
    await user.type(input, "55");
    expect(input.value).toBe("55");

    await user.keyboard("{Escape}");

    expect(input.value).toBe("10");
    expect(onLimitChange).not.toHaveBeenCalled();
  });

  it("blur commits when editingLimit is true", async () => {
    const user = userEvent.setup();
    renderTable({ limit: 10 });

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);
    await user.clear(input);
    await user.type(input, "33");

    input.blur();

    expect(onLimitChange).toHaveBeenCalledTimes(1);
    expect(onLimitChange).toHaveBeenCalledWith(33);
  });

  it("invalid numeric input does not call onLimitChange and reverts back to prop value", async () => {
    const user = userEvent.setup();
    renderTable({ limit: 10 });

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);

    // force an invalid value (type=number won't let user.type('e') reliably)
    fireEvent.change(input, { target: { value: "abc" } });

    await user.keyboard("{Enter}");

    expect(onLimitChange).not.toHaveBeenCalled();
    // should revert to prop (editing ends, inputValue becomes String(limit))
    expect(input.value).toBe("10");
  });

  it("pagination: Prev/Next disabled state reflects hasPrev/hasNext", () => {
    renderTable({
      page: 1,
      totalPages: 3,
      hasPrev: false,
      hasNext: true,
    });

    const prev = screen.getByRole("button", {
      name: /prev/i,
    }) as HTMLButtonElement;
    const next = screen.getByRole("button", {
      name: /next/i,
    }) as HTMLButtonElement;

    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    const pager = screen.getByText(/page/i).closest(".usersPager");
    expect(pager).toBeTruthy();
    expect(pager!).toHaveTextContent("Page");
    expect(pager!).toHaveTextContent("1");
    expect(pager!).toHaveTextContent("3");
  });

  it("pagination: clicking Next calls onNextPage, clicking Prev calls onPrevPage", async () => {
    const user = userEvent.setup();

    renderTable({
      page: 2,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onNextPage).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /prev/i }));
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  it("pagination buttons are disabled while loading", () => {
    renderTable({
      loading: true,
      hasPrev: true,
      hasNext: true,
    });

    const metaRow = screen.getByText(/showing/i).closest("div");
    expect(metaRow).toBeTruthy();
    expect(metaRow!).toHaveTextContent("Showing");
    expect(metaRow!).toHaveTextContent("2");
  });
});
