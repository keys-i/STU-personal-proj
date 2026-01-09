import { useEffect, useMemo, useState } from "react";
import {
  createUser,
  getUser,
  listUsers,
  softDeleteUser,
  updateUser,
  type UserFilter,
} from "./api";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserRole,
  UserStatus,
} from "./types";
import "./App.css";

const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const ROLES: (UserRole | "")[] = ["", "USER", "ADMIN", "MODERATOR"];

function isoFromDateInput(v: string): string | undefined {
  // v is 'YYYY-MM-DD' from <input type="date">
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function dateInputFromIso(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<User | null>(null);

  // create form
  const [createForm, setCreateForm] = useState<CreateUserInput>({
    name: "",
    email: "",
    status: "ACTIVE",
    role: null,
  });

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserInput>({});

  const filter: UserFilter = useMemo(
    () => ({
      name: filterName || undefined,
      status: filterStatus || undefined,
      fromDate: isoFromDateInput(fromDate),
      toDate: isoFromDateInput(toDate),
    }),
    [filterName, filterStatus, fromDate, toDate],
  );

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await listUsers({ page, limit, filter });
      setUsers(res.data);
      setMeta({
        total: res.meta.total,
        totalPages: res.meta.totalPages,
        hasNext: res.meta.hasNext,
        hasPrev: res.meta.hasPrev,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filterName, filterStatus, fromDate, toDate]);

  async function loadDetails(id: string) {
    setSelectedId(id);
    setSelected(null);
    setErr(null);
    try {
      const u = await getUser(id);
      setSelected(u);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load user");
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await createUser({
        ...createForm,
        role: createForm.role ?? null,
      });
      setCreateForm({ name: "", email: "", status: "ACTIVE", role: null });
      setPage(1);
      await refresh();
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Create failed");
    }
  }

  function openEdit(u: User) {
    setEditForm({
      name: u.name,
      email: u.email,
      status: u.status,
      role: u.role,
    });
    setEditOpen(true);
  }

  async function onEditSave() {
    if (!selectedId) return;
    setErr(null);
    try {
      await updateUser(selectedId, editForm);
      setEditOpen(false);
      await refresh();
      await loadDetails(selectedId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function onDelete(id: string) {
    setErr(null);
    try {
      await softDeleteUser(id);
      if (selectedId === id) {
        setSelectedId("");
        setSelected(null);
      }
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function applyFiltersNow() {
    setPage(1);
    void refresh();
  }

  return (
    <div className="container">
      <header className="header">
        <h1>STU Users</h1>
        <div className="sub">
          Basic CRUD UI for your NestJS + Prisma backend
        </div>
      </header>

      {err && <div className="error">Error: {err}</div>}

      <section className="card">
        <h2>Create user</h2>
        <form onSubmit={onCreate} className="grid">
          <label>
            Name
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="2–100 chars"
              required
              minLength={2}
              maxLength={100}
            />
          </label>

          <label>
            Email
            <input
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="unique email"
              required
              type="email"
            />
          </label>

          <label>
            Status
            <select
              value={createForm.status}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  status: e.target.value as UserStatus,
                }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role (optional)
            <select
              value={createForm.role ?? ""}
              onChange={(e) =>
                setCreateForm((p) => ({
                  ...p,
                  role: (e.target.value || null) as UserRole | null,
                }))
              }
            >
              {ROLES.map((r) => (
                <option key={r || "none"} value={r}>
                  {r || "(none)"}
                </option>
              ))}
            </select>
          </label>

          <div className="row">
            <button type="submit">Create</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Users</h2>

        <div className="filters">
          <label>
            Name
            <input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="search name"
            />
          </label>

          <label>
            Status
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as UserStatus | "")
              }
            >
              <option value="">(any)</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            From date
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>

          <button type="button" onClick={applyFiltersNow}>
            Apply
          </button>

          <label>
            Limit
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row space-between">
          <div>
            Page <strong>{page}</strong> / {meta.totalPages} · Total{" "}
            <strong>{meta.total}</strong>
          </div>
          <div className="row">
            <button
              disabled={!meta.hasPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              disabled={!meta.hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div className="table">
          <div className="thead">
            <div>ID</div>
            <div>Name</div>
            <div>Email</div>
            <div>Status</div>
            <div>Role</div>
            <div>Actions</div>
          </div>

          {users.map((u) => (
            <div className="trow" key={u.id}>
              <div className="mono">{u.id.slice(0, 8)}…</div>
              <div>{u.name}</div>
              <div>{u.email}</div>
              <div>{u.status}</div>
              <div>{u.role ?? "-"}</div>
              <div className="row">
                <button onClick={() => void loadDetails(u.id)}>View</button>
                <button
                  onClick={() => {
                    setSelectedId(u.id);
                    openEdit(u);
                  }}
                >
                  Edit
                </button>
                <button className="danger" onClick={() => void onDelete(u.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && <div className="empty">No users found.</div>}
        </div>
      </section>

      <section className="card">
        <h2>User details</h2>

        {!selectedId && (
          <div className="muted">Select a user from the list.</div>
        )}

        {selectedId && !selected && <div className="muted">Loading…</div>}

        {selected && (
          <div className="details">
            <div>
              <strong>ID:</strong> <span className="mono">{selected.id}</span>
            </div>
            <div>
              <strong>Name:</strong> {selected.name}
            </div>
            <div>
              <strong>Email:</strong> {selected.email}
            </div>
            <div>
              <strong>Status:</strong> {selected.status}
            </div>
            <div>
              <strong>Role:</strong> {selected.role ?? "-"}
            </div>
            <div>
              <strong>Created:</strong>{" "}
              {new Date(selected.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>Updated:</strong>{" "}
              {new Date(selected.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </section>

      {editOpen && (
        <div className="modalBackdrop" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit user</h3>

            <div className="grid">
              <label>
                Name
                <input
                  value={editForm.name ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </label>

              <label>
                Email
                <input
                  value={editForm.email ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                  type="email"
                />
              </label>

              <label>
                Status
                <select
                  value={(editForm.status ?? "") as string}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      status: e.target.value as UserStatus,
                    }))
                  }
                >
                  <option value="">(unchanged)</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Role
                <select
                  value={(editForm.role ?? "") as string}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      role: (e.target.value || null) as UserRole | null,
                    }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r || "none"} value={r}>
                      {r || "(none)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="row space-between">
              <button onClick={() => setEditOpen(false)}>Cancel</button>
              <button onClick={() => void onEditSave()}>Save</button>
            </div>

            <div className="muted small">
              Note: backend requires at least one field; leaving everything
              unchanged may error.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
