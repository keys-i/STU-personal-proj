import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import {
  createUser,
  softDeleteUser,
  updateUser,
  type UserFilter,
} from "./features/users/api";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserStatus,
} from "./features/users/types";

import { useTheme } from "./shared/hooks/useTheme";
import { useUsers } from "./features/users/hooks/useUsers";

import { UsersTable } from "./features/users/components/UsersTable";
import {
  UsersFilters,
  type FilterState,
} from "./features/users/components/UsersFilters";

import {
  PencilIcon,
  SearchIcon,
  SlidersIcon,
  ThemeIcon,
} from "./shared/components/Icons";

import { CreateUserForm } from "./features/users/components/CreateUserForm";
import { EmptyUsersState } from "./features/users/components/EmptyUsersState";
import { ConfettiBurst } from "./shared/components/ConfettiBurst";
import { CreateUserMorph } from "./features/users/components/CreateUserMorph";

const EditUserModal = lazy(async () =>
  import("./features/users/components/EditUserModal").then((m) => ({
    default: m.EditUserModal,
  })),
);

function isoFromDateInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function randomSeedInt(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]!;
  } catch {
    return Math.floor(Math.random() * 1_000_000_000);
  }
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

  // centered top search (debounced into filterState.name)
  const [searchDraft, setSearchDraft] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilterState((prev) =>
        prev.name === searchDraft ? prev : { ...prev, name: searchDraft },
      );
    }, 250);
    return () => window.clearTimeout(t);
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

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Create user morph state
  const [createOpen, setCreateOpen] = useState(false);
  const newBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // Empty-state exit animation when first user arrives (arrow pops)
  const [emptyExit, setEmptyExit] = useState(false);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = users.length;

    if (prev === 0 && curr > 0) {
      setShowFirstUserBubble(true);
      setEmptyExit(true);

      const tExit = window.setTimeout(() => setEmptyExit(false), 420);
      const tBubble = window.setTimeout(
        () => setShowFirstUserBubble(false),
        2400,
      );

      prevCountRef.current = curr;
      return () => {
        window.clearTimeout(tExit);
        window.clearTimeout(tBubble);
      };
    }

    prevCountRef.current = curr;
  }, [users.length]);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserInput>({});
  const editingUserRef = useRef<User | null>(null);

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
  }

  async function onDelete(id: string) {
    await softDeleteUser(id);
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

  async function onLimitChange(next: number) {
    const safe = Math.min(100, Math.max(1, next));
    setLimit(safe);
    await refresh();
  }

  // NEW: random seed every time the empty-state becomes visible
  const [emptySeed, setEmptySeed] = useState<number>(() => randomSeedInt());
  useEffect(() => {
    if (noUsers) setEmptySeed(randomSeedInt());
  }, [noUsers]);

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
            ref={newBtnRef}
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

      {/* Button morphs into the create window and back */}
      <CreateUserMorph
        open={createOpen}
        anchorRef={newBtnRef}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        subtitle="Quick add. Validates inputs."
        collapsedContent={
          <div className="morphButtonFace">
            <PencilIcon />
            <span>New</span>
          </div>
        }
      >
        <CreateUserForm
          value={createForm}
          onChange={setCreateForm}
          onSubmit={onCreate}
          disabled={loading}
        />
      </CreateUserMorph>

      {filtersOpen && (
        <section className="card">
          <UsersFilters
            value={filterState}
            onChange={setFilterState}
            onApply={() => void refresh()}
          />
        </section>
      )}

      {error && <div className="error">Error: {error}</div>}

      <section className="card">
        {showFirstUserBubble && (
          <div className="thoughtBubble">
            <div className="thoughtBubbleText">
              Yay. Someone actually showed up.
            </div>
          </div>
        )}

        {noUsers || emptyExit ? (
          <EmptyUsersState
            key={emptySeed}
            seed={emptySeed}
            targetRef={newBtnRef}
            popping={emptyExit && !noUsers}
          />
        ) : (
          <>
            <UsersTable
              users={users}
              loading={loading}
              limit={limit}
              onLimitChange={(n) => void onLimitChange(n)}
              onEdit={onEdit}
              onDelete={(id) => void onDelete(id)}
            />

            <div ref={sentinelRef} style={{ height: 1 }} />

            {/* Bottom: paging + actions */}
            <div className="row space-between" style={{ marginTop: 14 }}>
              <div className="muted small">
                Page <strong>{meta?.page ?? 1}</strong> /{" "}
                <strong>{meta?.totalPages ?? 1}</strong> ·{" "}
                <strong>{meta?.total ?? 0}</strong> users
              </div>

              <div className="row" style={{ gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void loadNext()}
                  disabled={!hasNext || loading}
                >
                  {hasNext ? "Load more" : "End"}
                </button>
              </div>
            </div>
          </>
        )}
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
