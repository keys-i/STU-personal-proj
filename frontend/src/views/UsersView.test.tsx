import { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User } from "../features/users/types";
import type { UserFilter } from "../features/users/middleware";
import { UsersView } from "./UsersView";

const H = vi.hoisted(() => {
  const mockToggleTheme = vi.fn();

  const mockRefresh = vi.fn().mockResolvedValue(undefined);

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
  };

  const useUsers = vi.fn(
    (args: { page: number; limit: number; filter: UserFilter }) => ({
      _debug: args,
      items: useUsersState.items,
      meta: useUsersState.meta,
      loading: useUsersState.loading,
      error: useUsersState.error,
      refresh: mockRefresh,
    }),
  );

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

      page: number;
      totalPages: number;
      hasPrev: boolean;
      hasNext: boolean;
      onPrevPage: () => void;
      onNextPage: () => void;

      onEdit: (u: User) => void;
      onDelete: (id: string) => void;
    }) => (
      <div data-testid="table">
        <div data-testid="table-users">{props.users.length}</div>

        <div data-testid="pager">
          <span>Page</span>
          <span data-testid="pager-page">{props.page}</span>
          <span>/</span>
          <span data-testid="pager-total">{props.totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => props.onPrevPage()}
          disabled={!props.hasPrev}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => props.onNextPage()}
          disabled={!props.hasNext}
        >
          Next
        </button>

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

// IMPORTANT: UsersView imports from middleware (not api)
vi.mock("../features/users/middleware", () => ({
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

function lastArgs():
  | { page: number; limit: number; filter: UserFilter }
  | undefined {
  return H.useUsers.mock.calls.at(-1)?.[0] as
    | { page: number; limit: number; filter: UserFilter }
    | undefined;
}

function lastFilterName(): string | undefined {
  return lastArgs()?.filter?.name;
}

function lastPage(): number | undefined {
  return lastArgs()?.page;
}

describe("UsersView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    H.useUsersState.items = [];
    H.useUsersState.meta = { page: 1, totalPages: 1, total: 0 };
    H.useUsersState.loading = false;
    H.useUsersState.error = null;
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

  it("debounces search into filterState.name (useUsers receives updated filter)", async () => {
    render(<UsersView />);

    const input = screen.getByPlaceholderText("Search by name…");

    fireEvent.change(input, { target: { value: "ann" } });

    const namesBefore = H.useUsers.mock.calls.map(
      (c) => (c[0] as { filter: UserFilter }).filter.name,
    );
    expect(namesBefore).not.toContain("ann");

    act(() => {
      vi.advanceTimersByTime(260);
    });
    await flushPromises();

    expect(lastFilterName()).toBe("ann");
    expect(lastPage()).toBe(1); // still page 1
  });

  it("pressing Enter commits search immediately and refresh is called", async () => {
    render(<UsersView />);

    const input = screen.getByPlaceholderText("Search by name…");

    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await flushAll();

    expect(lastFilterName()).toBe("bob");
    expect(H.mockRefresh).toHaveBeenCalledTimes(1);

    // advancing time should not change it again
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

  it("renders table when users exist and passes pagination props", () => {
    H.useUsersState.items = [makeUser("1"), makeUser("2")];
    H.useUsersState.meta = { page: 1, totalPages: 5, total: 99 };

    render(<UsersView />);

    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.getByTestId("table-users")).toHaveTextContent("2");
    expect(screen.getByTestId("pager-page")).toHaveTextContent("1");
    expect(screen.getByTestId("pager-total")).toHaveTextContent("5");
  });

  it("pagination: clicking Next increments page (triggers useUsers with new page)", async () => {
    H.useUsersState.items = [makeUser("1")];
    H.useUsersState.meta = { page: 1, totalPages: 3, total: 30 };

    render(<UsersView />);

    expect(lastPage()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flushPromises();

    expect(lastPage()).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    await flushPromises();

    expect(lastPage()).toBe(1);
  });

  it("apply filters triggers refresh and resets page to 1", async () => {
    H.useUsersState.items = [makeUser("1")];
    H.useUsersState.meta = { page: 1, totalPages: 3, total: 30 };

    render(<UsersView />);

    // go to page 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flushPromises();
    expect(lastPage()).toBe(2);

    // open filters
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByTestId("filters")).toBeInTheDocument();

    fireEvent.click(screen.getByText("ApplyFilters"));
    await flushAll();

    expect(H.mockRefresh).toHaveBeenCalled();
    expect(lastPage()).toBe(1);
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
    await flushAll();

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

  it("ThemeToggle click calls toggle", () => {
    render(<UsersView />);
    fireEvent.click(screen.getByLabelText("ThemeToggle"));
    expect(H.mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
