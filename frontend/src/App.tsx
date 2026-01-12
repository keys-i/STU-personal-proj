import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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

import { UsersTable } from "./components/UsersTable";
import { UserDetails } from "./components/UserDetails";
import { UsersFilters, type FilterState } from "./components/UsersFilters";

import {
  PencilIcon,
  SearchIcon,
  SlidersIcon,
  ThemeIcon,
} from "./components/Icons";
import { CreateUserForm } from "./components/CreateUserForm";
import { CreateUserDrawer } from "./components/CreateUserDrawer";
import { EmptyUsersState } from "./components/EmptyUsersState";
import { ConfettiBurst } from "./components/ConfettiBurst";

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

  // centered top search draft (debounced into filterState.name)
  const [searchDraft, setSearchDraft] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setFilterState((prev) =>
        prev.name === searchDraft ? prev : { ...prev, name: searchDraft },
      );
    }, 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

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

  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateUserInput>({
    name: "",
    email: "",
    status: "ACTIVE",
    role: null,
  });

  // Confetti + first-user bubble
  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFirstUserBubble, setShowFirstUserBubble] = useState(false);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = users.length;

    if (prev === 0 && curr > 0) {
      setShowFirstUserBubble(true);
      const t = setTimeout(() => setShowFirstUserBubble(false), 2400);
      return () => clearTimeout(t);
    }
    prevCountRef.current = curr;
  }, [users.length]);

  // Edit modal
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

    setConfettiKey((k) => k + 1);
    setShowConfetti(true);
    setCreateOpen(false);

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
  useEffect(() => {
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

  const noUsers = !loading && users.length === 0;

  return (
    <div className="container">
      {showConfetti && (
        <ConfettiBurst
          key={confettiKey}
          onDone={() => setShowConfetti(false)}
        />
      )}

      <header className="topbar">
        <div className="topbarLeft">
          <div className="brand">
            <div className="brandTitle">Users</div>
            <div className="brandSub">Create, search, edit, soft-delete.</div>
          </div>
        </div>

        <div className="topbarCenter">
          <button
            type="button"
            className="themeBtn"
            onClick={toggle}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <ThemeIcon />
            <span className="themeBtnLabel">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          <div className="searchBar">
            <span className="searchBarIcon" aria-hidden="true">
              <SearchIcon />
            </span>

            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search by name…"
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setFilterState((prev) => ({ ...prev, name: searchDraft }));
              }}
            />

            <button
              type="button"
              className={`searchBarBtn ${filtersOpen ? "searchBarBtnActive" : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label="Filters"
              title="Filters"
            >
              <SlidersIcon />
            </button>
          </div>
        </div>

        <div className="topbarRight">
          <button
            type="button"
            className={`iconBtn ${noUsers ? "iconBtnPulse" : ""}`}
            onClick={() => setCreateOpen(true)}
            title="Create user"
            aria-label="Create user"
          >
            <PencilIcon />
            <span>New</span>
          </button>
        </div>
      </header>

      {filtersOpen && (
        <section className="card">
          <UsersFilters
            value={filterState}
            onChange={setFilterState}
            limit={limit}
            onLimitChange={setLimit}
            onApply={() => void refresh()}
          />
        </section>
      )}

      {error && <div className="error">Error: {error}</div>}

      <section className="card">
        <div className="row space-between">
          <div>
            <strong>{meta?.total ?? 0}</strong> users · page{" "}
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

        {showFirstUserBubble && (
          <div className="thoughtBubble">
            <div className="thoughtBubbleText">
              Yay. Someone actually showed up.
            </div>
          </div>
        )}

        {noUsers ? (
          <EmptyUsersState />
        ) : (
          <>
            <UsersTable
              users={users}
              onView={(id) => void onView(id)}
              onEdit={onEdit}
              onDelete={(id) => void onDelete(id)}
            />

            <div ref={sentinelRef} style={{ height: 1 }} />

            <div className="row" style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => void loadNext()}
                disabled={!hasNext || loading}
              >
                {hasNext ? "Load more" : "End"}
              </button>
              {loading && <span className="muted">Loading…</span>}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>User details</h2>
        <UserDetails user={selected} />
      </section>

      <CreateUserDrawer open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateUserForm
          value={createForm}
          onChange={setCreateForm}
          onSubmit={onCreate}
          disabled={loading}
        />
      </CreateUserDrawer>

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
