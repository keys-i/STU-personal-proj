import { Suspense, lazy, useMemo, useRef, useState } from "react";
import "./App.css";

import {
  createUser,
  getUser,
  softDeleteUser,
  updateUser,
  type UserFilter,
} from "./api";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserStatus,
} from "./types";

import { useTheme } from "./hooks/useTheme";
import { useUsers } from "./hooks/useUsers";

import { CreateUserForm } from "./components/CreateUserForm";
import { UsersFilters, type FilterState } from "./components/UsersFilters";
import { UsersTable } from "./components/UsersTable";
import { UserDetails } from "./components/UserDetails";

const EditUserModal = lazy(async () =>
  import("./components/EditUserModal").then((m) => ({
    default: m.EditUserModal,
  })),
);

function isoFromDateInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function App() {
  const { theme, toggle } = useTheme();

  const [limit, setLimit] = useState(10);

  const [filterState, setFilterState] = useState<FilterState>({
    name: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const filter: UserFilter = useMemo(
    () => ({
      name: filterState.name || undefined,
      status: (filterState.status || undefined) as UserStatus | undefined,
      fromDate: isoFromDateInput(filterState.fromDate),
      toDate: isoFromDateInput(filterState.toDate),
    }),
    [filterState],
  );

  const {
    items: users,
    meta,
    loading,
    error,
    refresh,
    loadNext,
    hasNext,
  } = useUsers({ limit, filter });

  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserInput>({
    name: "",
    email: "",
    status: "ACTIVE",
    role: null,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserInput>({});
  const editingUserRef = useRef<User | null>(null);

  async function onView(id: string) {
    setSelectedId(id);
    setSelected(null);
    const u = await getUser(id);
    setSelected(u);
  }

  async function onCreate() {
    await createUser(createForm);
    setCreateForm({ name: "", email: "", status: "ACTIVE", role: null });
    await refresh();
  }

  function onEdit(u: User) {
    editingUserRef.current = u;
    setSelectedId(u.id);
    setEditForm({
      name: u.name,
      email: u.email,
      status: u.status,
      role: u.role,
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    const u = editingUserRef.current;
    if (!u) return;

    await updateUser(u.id, editForm);
    setEditOpen(false);
    await refresh();

    if (selectedId === u.id) {
      const updated = await getUser(u.id);
      setSelected(updated);
    }
  }

  async function onDelete(id: string) {
    await softDeleteUser(id);
    if (selectedId === id) {
      setSelectedId("");
      setSelected(null);
    }
    await refresh();
  }

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Attach observer once
  useMemo(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) void loadNext();
      },
      { root: null, rootMargin: "400px", threshold: 0.0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loadNext]);

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>STU Users</h1>
          <div className="sub">
            Swipe right (or double-click) a row to edit · Infinite scroll
            enabled
          </div>
        </div>

        <button type="button" onClick={toggle} className="chip">
          Theme: {theme}
        </button>
      </header>

      {error && <div className="error">Error: {error}</div>}

      <section className="card">
        <h2>Create user</h2>
        <CreateUserForm
          value={createForm}
          onChange={setCreateForm}
          onSubmit={onCreate}
          disabled={loading}
        />
      </section>

      <section className="card">
        <h2>Users</h2>

        <UsersFilters
          value={filterState}
          onChange={setFilterState}
          limit={limit}
          onLimitChange={(n) => setLimit(n)}
          onApply={() => void refresh()}
        />

        <div className="row space-between">
          <div>
            Total <strong>{meta?.total ?? 0}</strong> · Page{" "}
            <strong>{meta?.page ?? 1}</strong> / {meta?.totalPages ?? 1}
          </div>
          <div className="row">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <UsersTable
          users={users}
          onView={(id) => void onView(id)}
          onEdit={onEdit}
          onDelete={(id) => void onDelete(id)}
        />

        {/* Infinite scroll trigger */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => void loadNext()}
            disabled={!hasNext || loading}
          >
            {hasNext ? "Load more" : "No more pages"}
          </button>
          {loading && <span className="muted">Loading…</span>}
        </div>
      </section>

      <section className="card">
        <h2>User details</h2>
        <UserDetails user={selected} />
      </section>

      <Suspense fallback={null}>
        <EditUserModal
          open={editOpen}
          value={editForm}
          onChange={setEditForm}
          onClose={() => setEditOpen(false)}
          onSave={onSaveEdit}
        />
      </Suspense>
    </div>
  );
}
