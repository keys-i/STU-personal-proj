import { Suspense, lazy, useMemo, useRef, useState } from "react";
import "../App.css";
import "../features/users/users.css";

import {
  createUser,
  softDeleteUser,
  updateUser,
  type UserFilter,
} from "../features/users/api";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserStatus,
} from "../features/users/types";

import { useTheme } from "../shared/hooks/useTheme";
import { useUsers } from "../features/users/hooks/useUsers";

import { UsersTable } from "../features/users/components/UsersTable";
import {
  UsersFilters,
  type FilterState,
} from "../features/users/components/UsersFilters";

import {
  PencilIcon,
  SearchIcon,
  SlidersIcon,
} from "../shared/components/Icons";
import { ThemeToggle } from "../shared/components/ThemeToggle";

import { CreateUserForm } from "../features/users/components/CreateUserForm";
import { EmptyUsersState } from "../features/users/components/EmptyUsersState";
import { ConfettiBurst } from "../shared/components/ConfettiBurst";
import { CreateUserMorph } from "../features/users/components/CreateUserMorph";
import { isoFromDateInput } from "../shared/utils/date";

const EditUserModal = lazy(async () =>
  import("../features/users/components/EditUserModal").then((m) => ({
    default: m.EditUserModal,
  })),
);

export function UsersView() {
  const { theme, toggle } = useTheme();

  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [filterState, setFilterState] = useState<FilterState>({
    name: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const [searchDraft, setSearchDraft] = useState("");
  const searchDebounceRef = useRef<number | null>(null);

  const filter: UserFilter = useMemo(
    () => ({
      name: filterState.name || undefined,
      status: (filterState.status || undefined) as UserStatus | undefined,
      fromDate: isoFromDateInput(filterState.fromDate),
      toDate: isoFromDateInput(filterState.toDate),
    }),
    [filterState],
  );

  // IMPORTANT: pass page into the hook so it fetches the correct slice
  const {
    items: users,
    meta,
    loading,
    error,
    refresh,
  } = useUsers({
    page,
    limit,
    filter,
  });

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const newBtnRef = useRef<HTMLButtonElement | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserInput>({
    name: "",
    email: "",
    status: "ACTIVE",
    role: null,
  });

  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserInput>({});
  const editingUserRef = useRef<User | null>(null);

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
    // if deleting the last item on the page, you might want to clamp page after refresh
    await refresh();
  }

  async function onCreate() {
    await createUser(createForm);

    setConfettiKey((k) => k + 1);
    setShowConfetti(true);

    setCreateOpen(false);
    setCreateForm({ name: "", email: "", status: "ACTIVE", role: null });

    // usually reset to first page so the new record is visible (optional)
    setPage(1);
    await refresh();
  }

  const noUsers = !loading && users.length === 0;

  async function onLimitChange(next: number) {
    const safe = Math.min(100, Math.max(1, next));
    setLimit(safe);
    setPage(1); // IMPORTANT: changing limit should reset pagination
    await refresh();
  }

  // controlled pagination handlers
  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }

  function goNext() {
    const tp = meta?.totalPages ?? 1;
    setPage((p) => Math.min(tp, p + 1));
  }

  // if filters change and you want to reset to page 1, do it where you apply filters
  function applyFilters() {
    setPage(1);
    void refresh();
  }

  return (
    <div className="container usersView">
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

        <div className="topbarCenter topbarCenterWide">
          <div className="searchRow">
            <div className="searchBar searchBarWide">
              <span className="searchBarIcon" aria-hidden="true">
                <SearchIcon />
              </span>

              <input
                value={searchDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchDraft(v);

                  if (searchDebounceRef.current != null) {
                    window.clearTimeout(searchDebounceRef.current);
                  }
                  searchDebounceRef.current = window.setTimeout(() => {
                    setFilterState((prev) =>
                      prev.name === v ? prev : { ...prev, name: v },
                    );
                  }, 250);
                }}
                placeholder="Search by name…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (searchDebounceRef.current != null) {
                      window.clearTimeout(searchDebounceRef.current);
                      searchDebounceRef.current = null;
                    }
                    setFilterState((prev) =>
                      prev.name === searchDraft
                        ? prev
                        : { ...prev, name: searchDraft },
                    );
                    setPage(1);
                    void refresh();
                  }
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

            <button
              ref={newBtnRef}
              type="button"
              className={`iconBtn parallaxBtn ${noUsers ? "iconBtnPulse" : ""}`}
              onClick={() => setCreateOpen(true)}
              title="Create user"
              aria-label="Create user"
              style={{ visibility: createOpen ? "hidden" : "visible" }}
            >
              <PencilIcon />
              <span>New</span>
            </button>
          </div>
        </div>

        <div className="topbarRight">
          <ThemeToggle
            checked={theme === "dark"}
            onChange={(checked) => {
              const want = checked ? "dark" : "light";
              if (theme !== want) toggle();
            }}
          />
        </div>
      </header>

      <CreateUserMorph
        open={createOpen}
        anchorRef={newBtnRef}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        subtitle="Quick add. Validates inputs."
        collapsedContent={undefined}
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
            onChange={(next) => setFilterState(next)}
            limit={limit}
            onLimitChange={(n) => void onLimitChange(n)}
            onApply={applyFilters}
          />
        </section>
      )}

      {error && <div className="error">Error: {error}</div>}

      <section className="card">
        {noUsers ? (
          <EmptyUsersState targetRef={newBtnRef} />
        ) : (
          <UsersTable
            users={users}
            loading={loading}
            limit={limit}
            onLimitChange={(n) => void onLimitChange(n)}
            page={page}
            totalPages={meta?.totalPages ?? 1}
            hasPrev={page > 1}
            hasNext={page < (meta?.totalPages ?? 1)}
            onPrevPage={goPrev}
            onNextPage={goNext}
            onEdit={onEdit}
            onDelete={(id) => void onDelete(id)}
          />
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
