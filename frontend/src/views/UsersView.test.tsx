// src/views/UsersView.test.tsx
import { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User, UserFilter } from "../features/users/types";
import { UsersView } from "./UsersView";

const H = vi.hoisted(() => {
  const mockToggleTheme = vi.fn();

  const mockRefresh = vi.fn().mockResolvedValue(undefined);
  const mockLoadNext = vi.fn().mockResolvedValue(undefined);

  const api = {
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    softDeleteUser: vi.fn().mockResolvedValue(undefined),
  };

  const useUsersState = {
    items: [] as User[],
    meta: { page: 1, totalPages: 1, total: 0 } as {
      page: number;
      totalPages: number;
      total: number;
    } | null,
    loading: false,
    error: null as string | null,
    hasNext: false,
  };

  const useUsers = vi.fn((args: { limit: number; filter: UserFilter }) => ({
    _debug: args.limit,
    items: useUsersState.items,
    meta: useUsersState.meta,
    loading: useUsersState.loading,
    error: useUsersState.error,
    refresh: mockRefresh,
    loadNext: mockLoadNext,
    hasNext: useUsersState.hasNext,
  }));

  const ThemeToggle = vi.fn(
    (props: { checked: boolean; onChange: (v: boolean) => void }) => (
      <button
        type="button"
        aria-label="ThemeToggle"
        data-checked={String(props.checked)}
        onClick={() => props.onChange(!props.checked)}
      >
        ThemeToggle
      </button>
    ),
  );

  const UsersFilters = vi.fn(
    (props: {
      value: unknown;
      onChange: (v: unknown) => void;
      limit: number;
      onLimitChange: (n: number) => void;
      onApply: () => void;
    }) => (
      <div data-testid="filters">
        <button type="button" onClick={() => props.onApply()}>
          ApplyFilters
        </button>
        <button type="button" onClick={() => props.onLimitChange(20)}>
          SetLimit20
        </button>
      </div>
    ),
  );

  const UsersTable = vi.fn(
    (props: {
      users: User[];
      loading: boolean;
      limit: number;
      onLimitChange: (n: number) => void;
      onEdit: (u: User) => void;
      onDelete: (id: string) => void;
    }) => (
      <div data-testid="table">
        <div data-testid="table-users">{props.users.length}</div>
        <button type="button" onClick={() => props.onLimitChange(50)}>
          TableSetLimit50
        </button>
        <button
          type="button"
          onClick={() => {
            const u =
              props.users[0] ??
              ({
                id: "u1",
                name: "U1",
                email: "u1@x.com",
                status: "ACTIVE",
                role: null,
                createdAt: "2025-01-01T00:00:00.000Z",
                updatedAt: "2025-01-01T00:00:00.000Z",
                deletedAt: null,
              } as User);
            props.onEdit(u);
          }}
        >
          TableEditFirst
        </button>
        <button type="button" onClick={() => props.onDelete("u1")}>
          TableDeleteU1
        </button>
      </div>
    ),
  );

  const CreateUserForm = vi.fn(
    (props: {
      value: unknown;
      onChange: (v: unknown) => void;
      onSubmit: () => Promise<void>;
      disabled?: boolean;
    }) => (
      <div data-testid="create-form" data-disabled={String(!!props.disabled)}>
        <button type="button" onClick={() => void props.onSubmit()}>
          SubmitCreate
        </button>
      </div>
    ),
  );

  const CreateUserMorph = vi.fn(
    (props: {
      open: boolean;
      onClose: () => void;
      title: string;
      subtitle?: string;
      collapsedContent: React.ReactNode;
      children: React.ReactNode;
      anchorRef: React.RefObject<HTMLElement | null>;
    }) => (
      <div data-testid="morph" data-open={String(props.open)}>
        {props.open ? (
          <button type="button" onClick={props.onClose}>
            CloseMorph
          </button>
        ) : null}
        {props.children}
      </div>
    ),
  );

  const EmptyUsersState = vi.fn(() => <div data-testid="empty">Empty</div>);

  const ConfettiBurst = vi.fn((props: { onDone: () => void }) => (
    <button type="button" data-testid="confetti" onClick={props.onDone}>
      Confetti
    </button>
  ));

  const EditUserModal = vi.fn(
    (props: {
      open: boolean;
      value: unknown;
      onChange: (v: unknown) => void;
      onClose: () => void;
      onSave: () => Promise<void>;
    }) => {
      if (!props.open) return null;
      return (
        <div data-testid="edit-modal">
          <button type="button" onClick={() => void props.onSave()}>
            Save Modal
          </button>
          <button type="button" onClick={props.onClose}>
            Close Modal
          </button>
        </div>
      );
    },
  );

  return {
    mockToggleTheme,
    mockRefresh,
    mockLoadNext,
    api,
    useUsers,
    useUsersState,
    ThemeToggle,
    UsersFilters,
    UsersTable,
    CreateUserForm,
    CreateUserMorph,
    EmptyUsersState,
    ConfettiBurst,
    EditUserModal,
  };
});

vi.mock("../shared/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: H.mockToggleTheme }),
}));

vi.mock("../features/users/hooks/useUsers", () => ({
  useUsers: H.useUsers,
}));

vi.mock("../features/users/api", () => ({
  createUser: (input: unknown) => H.api.createUser(input),
  updateUser: (id: string, input: unknown) => H.api.updateUser(id, input),
  softDeleteUser: (id: string) => H.api.softDeleteUser(id),
}));

vi.mock("../features/users/components/EditUserModal", () => ({
  EditUserModal: H.EditUserModal,
}));

vi.mock("../shared/components/ThemeToggle", () => ({
  ThemeToggle: H.ThemeToggle,
}));
vi.mock("../features/users/components/UsersFilters", () => ({
  UsersFilters: H.UsersFilters,
}));
vi.mock("../features/users/components/UsersTable", () => ({
  UsersTable: H.UsersTable,
}));
vi.mock("../features/users/components/CreateUserForm", () => ({
  CreateUserForm: H.CreateUserForm,
}));
vi.mock("../features/users/components/CreateUserMorph", () => ({
  CreateUserMorph: H.CreateUserMorph,
}));
vi.mock("../features/users/components/EmptyUsersState", () => ({
  EmptyUsersState: H.EmptyUsersState,
}));
vi.mock("../shared/components/ConfettiBurst", () => ({
  ConfettiBurst: H.ConfettiBurst,
}));

vi.mock("../shared/components/Icons", () => ({
  PencilIcon: () => <span aria-hidden="true">P</span>,
  SearchIcon: () => <span aria-hidden="true">S</span>,
  SlidersIcon: () => <span aria-hidden="true">F</span>,
}));

function makeUser(id: string): User {
  return {
    id,
    name: `User ${id}`,
    email: `u${id}@x.com`,
    status: "ACTIVE",
    role: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
  };
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function flushAll(): Promise<void> {
  await flushPromises();
  await flushPromises();
}

function lastFilterName(): string | undefined {
  const last = H.useUsers.mock.calls.at(-1)?.[0] as
    | { limit: number; filter: UserFilter }
    | undefined;
  return last?.filter?.name;
}

describe("UsersView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    H.useUsersState.items = [];
    H.useUsersState.meta = { page: 1, totalPages: 1, total: 0 };
    H.useUsersState.loading = false;
    H.useUsersState.error = null;
    H.useUsersState.hasNext = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders header + theme toggle + search input", () => {
    render(<UsersView />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByLabelText("ThemeToggle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by name…")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create user/i }),
    ).toBeInTheDocument();
  });

  it("toggles filters panel when Filters button clicked", () => {
    render(<UsersView />);

    expect(screen.queryByTestId("filters")).not.toBeInTheDocument();

    const filtersBtn = screen.getByRole("button", { name: "Filters" });

    fireEvent.click(filtersBtn);
    expect(screen.getByTestId("filters")).toBeInTheDocument();

    fireEvent.click(filtersBtn);
    expect(screen.queryByTestId("filters")).not.toBeInTheDocument();
  });

  it("debounces search into filterState.name (causes useUsers to receive updated filter)", async () => {
    render(<UsersView />);

    const input = screen.getByPlaceholderText("Search by name…");

    fireEvent.change(input, { target: { value: "ann" } });

    // before debounce fires, we should NOT have committed filter.name="ann"
    const namesBefore = H.useUsers.mock.calls.map(
      (c) => (c[0] as { filter: UserFilter }).filter.name,
    );
    expect(namesBefore).not.toContain("ann");

    act(() => {
      vi.advanceTimersByTime(260);
    });
    await flushPromises();

    // after debounce, latest call should have filter.name="ann"
    expect(lastFilterName()).toBe("ann");
  });

  it("pressing Enter commits search immediately and cancels debounce", async () => {
    render(<UsersView />);

    const input = screen.getByPlaceholderText("Search by name…");

    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await flushPromises();

    expect(lastFilterName()).toBe("bob");

    // advancing time should NOT change committed name away from "bob"
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await flushPromises();

    expect(lastFilterName()).toBe("bob");
  });

  it("shows EmptyUsersState when no users and not loading", () => {
    H.useUsersState.items = [];
    H.useUsersState.loading = false;

    render(<UsersView />);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("renders table + meta when users exist", () => {
    H.useUsersState.items = [makeUser("1"), makeUser("2")];
    H.useUsersState.meta = { page: 2, totalPages: 5, total: 99 };

    render(<UsersView />);

    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.getByText(/Page/i)).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("create flow: clicking New then submit calls createUser + refresh + shows confetti", async () => {
    render(<UsersView />);

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.click(screen.getByText("SubmitCreate"));

    await flushAll();

    expect(H.api.createUser).toHaveBeenCalledTimes(1);
    expect(H.mockRefresh).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("confetti")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("confetti"));
    expect(screen.queryByTestId("confetti")).not.toBeInTheDocument();
  });

  it("edit flow: table edit opens modal; save calls updateUser + refresh", async () => {
    H.useUsersState.items = [makeUser("u1")];

    render(<UsersView />);

    fireEvent.click(screen.getByText("TableEditFirst"));
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Save Modal"));
    await flushAll();

    expect(H.api.updateUser).toHaveBeenCalledTimes(1);
    expect(H.api.updateUser).toHaveBeenCalledWith("u1", expect.any(Object));
    expect(H.mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("delete flow: table delete calls softDeleteUser + refresh", async () => {
    H.useUsersState.items = [makeUser("u1")];

    render(<UsersView />);

    fireEvent.click(screen.getByText("TableDeleteU1"));
    await flushAll();

    expect(H.api.softDeleteUser).toHaveBeenCalledTimes(1);
    expect(H.api.softDeleteUser).toHaveBeenCalledWith("u1");
    expect(H.mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("refresh button calls refresh; load more calls loadNext when hasNext", () => {
    H.useUsersState.items = [makeUser("1")];
    H.useUsersState.meta = { page: 1, totalPages: 2, total: 2 };
    H.useUsersState.hasNext = true;

    render(<UsersView />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(H.mockRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(H.mockLoadNext).toHaveBeenCalledTimes(1);
  });

  it("ThemeToggle click calls toggle", () => {
    render(<UsersView />);
    fireEvent.click(screen.getByLabelText("ThemeToggle"));
    expect(H.mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
