import { useEffect, useMemo, useState } from "react";
import type { User } from "../types";

type Props = {
  users: User[];
  loading: boolean;

  limit: number;
  onLimitChange: (n: number) => void;

  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function UsersTable({
  users,
  loading,
  limit,
  onLimitChange,
  onEdit,
  onDelete,
}: Props) {
  // local draft so user can type without immediately firing refresh
  const [limitDraft, setLimitDraft] = useState(String(limit));
  useEffect(() => setLimitDraft(String(limit)), [limit]);

  const shownCount = users.length;

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "role", label: "Role" },
      { key: "createdAt", label: "Created" },
      { key: "actions", label: "Actions" },
    ],
    [],
  );

  function commitLimit() {
    const raw = Number(limitDraft);
    if (!Number.isFinite(raw)) {
      setLimitDraft(String(limit));
      return;
    }
    const safe = clamp(Math.trunc(raw), 1, 100);
    setLimitDraft(String(safe));
    if (safe !== limit) onLimitChange(safe);
  }

  return (
    <div>
      {/* Header row inside the table card */}
      <div className="row space-between" style={{ marginBottom: 12 }}>
        <div className="muted small">
          Showing <strong>{shownCount}</strong>
          {loading ? <span> · loading…</span> : null}
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <span className="muted small">Limit</span>
          <input
            inputMode="numeric"
            type="number"
            min={1}
            max={100}
            value={limitDraft}
            onChange={(e) => setLimitDraft(e.target.value)}
            onBlur={commitLimit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLimit();
              if (e.key === "Escape") setLimitDraft(String(limit));
            }}
            style={{ width: 92 }}
            aria-label="Users per page limit"
            title="Users per page limit"
          />
        </div>
      </div>

      <div className="table" role="table" aria-label="Users table">
        <div className="thead" role="row">
          {columns.map((c) => (
            <div key={c.key} role="columnheader">
              {c.label}
            </div>
          ))}
        </div>

        {users.length === 0 ? (
          <div className="empty">No users.</div>
        ) : (
          users.map((u) => (
            <div className="trow" role="row" key={u.id}>
              <div role="cell" className="mono small" title={u.id}>
                {u.id}
              </div>

              <div role="cell">{u.name}</div>

              <div role="cell" title={u.email}>
                {u.email}
              </div>

              <div role="cell">{u.status}</div>

              <div role="cell">{u.role ?? "—"}</div>

              <div role="cell" className="small muted">
                {formatDate((u as unknown as { createdAt?: string }).createdAt)}
              </div>

              <div role="cell">
                <div
                  className="row"
                  style={{ gap: 8, justifyContent: "flex-end" }}
                >
                  <button type="button" onClick={() => onEdit(u)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(u.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
