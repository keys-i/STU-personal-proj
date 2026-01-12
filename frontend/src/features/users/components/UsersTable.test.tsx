import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders headers and rows", () => {
    const users = [makeUser(1), makeUser(2)];

    render(
      <UsersTable
        users={users}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // table label
    expect(
      screen.getByRole("table", { name: /users table/i }),
    ).toBeInTheDocument();

    // column headers
    for (const h of [
      "ID",
      "Name",
      "Email",
      "Status",
      "Role",
      "Created",
      "Actions",
    ]) {
      expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    }

    // content
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();

    // createdAt uses mocked formatter
    expect(screen.getAllByText(/^FMT\(/)).toHaveLength(2);
  });

  it("shows empty state when no users", () => {
    render(
      <UsersTable
        users={[]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });

  it("shows loading indicator when loading", () => {
    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={true}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("calls onEdit and onDelete for row actions", async () => {
    const user = userEvent.setup();
    const users = [makeUser(1)];

    render(
      <UsersTable
        users={users}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(users[0]);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(users[0].id);
  });

  it("shows the limit prop as the input value when not editing", () => {
    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={25}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

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

    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

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

    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const input = screen.getByLabelText(/users per page limit/i);
    await user.click(input);
    await user.clear(input);
    await user.type(input, "10");
    await user.keyboard("{Enter}");

    expect(onLimitChange).not.toHaveBeenCalled();
  });

  it("Escape cancels editing and restores input to prop value", async () => {
    const user = userEvent.setup();

    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);
    await user.clear(input);
    await user.type(input, "55");
    expect(input.value).toBe("55");

    await user.keyboard("{Escape}");

    // back to prop value since editing cancelled
    expect(input.value).toBe("10");
    expect(onLimitChange).not.toHaveBeenCalled();
  });

  it("blur commits when editingLimit is true", async () => {
    const user = userEvent.setup();

    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);
    await user.clear(input);
    await user.type(input, "33");

    // blur commits
    input.blur();

    expect(onLimitChange).toHaveBeenCalledTimes(1);
    expect(onLimitChange).toHaveBeenCalledWith(33);
  });

  it("invalid numeric input does not call onLimitChange and reverts draft", async () => {
    const user = userEvent.setup();

    render(
      <UsersTable
        users={[makeUser(1)]}
        loading={false}
        limit={10}
        onLimitChange={onLimitChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const input = screen.getByLabelText(
      /users per page limit/i,
    ) as HTMLInputElement;

    await user.click(input);
    await user.clear(input);
    // type something that results in NaN for Number(...)
    await user.type(input, "e");
    await user.keyboard("{Enter}");

    expect(onLimitChange).not.toHaveBeenCalled();
    // should revert back to prop value after commit/cancel logic settles
    expect(input.value).toBe("10");
  });
});
