import { useMemo, useState } from "react";
import type { User } from "../types";
import { formatDate } from "../../../shared/utils/date";

type Props = {
  users: User[];
  loading: boolean;

  limit: number;
  onLimitChange: (n: number) => void;

  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

type WithCreatedAt = { createdAt?: string | null };

export function UsersTable({
  users,
  loading,
  limit,
  onLimitChange,
  onEdit,
  onDelete,
}: Props) {
  const shownCount = users.length;

  // Draft is only “active” while the input is focused/being edited
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>("");

  const inputValue = editingLimit ? limitDraft : String(limit);

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

  function commitLimit(): void {
    const raw = Number(limitDraft);

    if (!Number.isFinite(raw)) {
      // revert
      setLimitDraft(String(limit));
      return;
    }

    const safe = clamp(Math.trunc(raw), 1, 100);
    if (safe !== limit) onLimitChange(safe);
    setLimitDraft(""); // clear draft; render goes back to prop
    setEditingLimit(false);
  }

  function cancelLimit(): void {
    setLimitDraft("");
    setEditingLimit(false);
  }

  return (
    <div>
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
            value={inputValue}
            onFocus={() => {
              setEditingLimit(true);
              setLimitDraft(String(limit));
            }}
            onChange={(e) => {
              setEditingLimit(true);
              setLimitDraft(e.target.value);
            }}
            onBlur={() => {
              if (editingLimit) commitLimit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLimit();
              if (e.key === "Escape") cancelLimit();
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
          users.map((u) => {
            const createdAt = (u as WithCreatedAt).createdAt;

            return (
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
                  {formatDate(createdAt)}
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
            );
          })
        )}
      </div>
    </div>
  );
}
