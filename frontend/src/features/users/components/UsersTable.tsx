import { useMemo, useState } from "react";
import type { User } from "../types";
import { formatDate } from "../../../shared/utils/date";
import { useSwipeAction } from "../../../shared/hooks/useSwipeActions";

function StatusPill({ status }: { status: User["status"] }) {
  const cls =
    status === "ACTIVE"
      ? "statusPill statusPillActive"
      : status === "INACTIVE"
        ? "statusPill statusPillInactive"
        : "statusPill statusPillSuspended";

  return <span className={cls}>{status}</span>;
}

type Props = {
  users: User[];
  loading: boolean;

  limit: number;
  onLimitChange: (n: number) => void;

  // controlled pagination
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;

  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

type WithCreatedAt = { createdAt?: string | null };

function TrashIcon(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM7 9h2v10H7V9z"
      />
    </svg>
  );
}

function PencilIcon(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75L20.7 7.04z"
      />
    </svg>
  );
}

function UsersTableRow(props: {
  user: User;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
}) {
  const { user, onEdit, onDelete } = props;

  const swipe = useSwipeAction({
    onSwipeRight: () => onEdit(user),
    onSwipeLeft: () => onDelete(user.id),
    thresholdPx: 90,
    maxRevealPx: 140,
  });

  const createdAt = (user as WithCreatedAt).createdAt;

  const dx = typeof swipe.dx === "number" ? swipe.dx : 0;
  const maxReveal = 140;

  const p =
    typeof swipe.progress === "number"
      ? swipe.progress
      : Math.min(1, Math.abs(dx) / maxReveal);

  const leftW = dx > 0 ? dx : 0;
  const rightW = dx < 0 ? -dx : 0;

  const swiping = Math.abs(dx) > 2;

  const editScale = 0.85 + (dx > 0 ? p : 0) * 0.35;
  const delScale = 0.85 + (dx < 0 ? p : 0) * 0.35;

  const editOpacity = dx > 0 ? 0.25 + 0.75 * p : 0;
  const delOpacity = dx < 0 ? 0.25 + 0.75 * p : 0;

  return (
    <div className="swipeWrap" data-swiping={String(swiping)}>
      {/* behind layer */}
      <div className="swipeBehind" aria-hidden="true">
        <div className="swipeLeft" style={{ width: leftW }}>
          <div
            className="swipeAction swipeActionEdit"
            style={{ transform: `scale(${editScale})`, opacity: editOpacity }}
          >
            <span className="swipeIcon">
              <PencilIcon size={20} />
            </span>
            <span className="swipeText">Edit</span>
          </div>
        </div>

        <div className="swipeRight" style={{ width: rightW }}>
          <div
            className="swipeAction swipeActionDelete"
            style={{ transform: `scale(${delScale})`, opacity: delOpacity }}
          >
            <span className="swipeIcon">
              <TrashIcon size={20} />
            </span>
            <span className="swipeText">Delete</span>
          </div>
        </div>
      </div>

      {/* front row */}
      <div
        className="trow swipeRow usersRow usersGrid"
        role="row"
        {...swipe.bind}
        style={{
          transform: `translateX(${dx}px)`,
          transition: swiping ? "none" : "transform 160ms ease",
          touchAction: "pan-y",
        }}
        aria-label={`User row ${user.name}`}
      >
        <div role="cell" className="usersCell usersCellName colName">
          <div className="usersName">{user.name}</div>
          <div className="small muted mono usersIdSub" title={user.id}>
            {user.id}
          </div>
        </div>

        <div
          role="cell"
          title={user.email}
          className="usersCell usersEmail colEmail"
        >
          {user.email}
        </div>

        <div role="cell" className="usersCell usersStatus colStatus">
          <StatusPill status={user.status} />
        </div>

        <div role="cell" className="usersCell usersRole colRole">
          {user.role ?? "—"}
        </div>

        <div
          role="cell"
          className="usersCell usersCreated colCreated small muted"
        >
          {formatDate(createdAt)}
        </div>
      </div>
    </div>
  );
}

export function UsersTable({
  users,
  loading,
  limit,
  onLimitChange,
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
  onEdit,
  onDelete,
}: Props) {
  const shownCount = users.length;

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>("");

  const inputValue = editingLimit ? limitDraft : String(limit);

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", className: "colName" },
      { key: "email", label: "Email", className: "colEmail" },
      { key: "status", label: "Status", className: "colStatus" },
      { key: "role", label: "Role", className: "colRole" },
      { key: "createdAt", label: "Created", className: "colCreated" },
    ],
    [],
  );

  function commitLimit(): void {
    const s = limitDraft.trim();
    const raw = Number(s);

    if (s === "" || !Number.isFinite(raw)) {
      setLimitDraft("");
      setEditingLimit(false);
      return;
    }

    const safe = clamp(Math.trunc(raw), 1, 100);
    if (safe !== limit) onLimitChange(safe);

    setLimitDraft("");
    setEditingLimit(false);
  }

  function cancelLimit(): void {
    setLimitDraft("");
    setEditingLimit(false);
  }

  return (
    <div className="usersTableWrap">
      <div className="row space-between usersTableMeta">
        <div className="muted small">
          Showing <strong>{shownCount}</strong>
          {loading ? <span> · loading…</span> : null}
        </div>

        <div className="row usersLimitRow">
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
            className="usersLimitInput"
            aria-label="Users per page limit"
            title="Users per page limit"
          />
        </div>
      </div>

      <div className="table usersTable" role="table" aria-label="Users table">
        <div className="thead usersThead usersGrid" role="row">
          {columns.map((c) => (
            <div
              key={c.key}
              role="columnheader"
              className={`usersTh ${c.className}`}
            >
              {c.label}
            </div>
          ))}
        </div>

        {users.length === 0 ? (
          <div className="empty">No users.</div>
        ) : (
          users.map((u) => (
            <UsersTableRow
              key={u.id}
              user={u}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* bottom pagination */}
      <div className="usersPager">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={!hasPrev || loading}
        >
          Prev
        </button>

        <div className="muted small">
          Page <strong>{page}</strong> / <strong>{totalPages}</strong>
        </div>

        <button
          type="button"
          onClick={onNextPage}
          disabled={!hasNext || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
