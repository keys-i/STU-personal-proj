import { useRef } from "react";
import type { User } from "../types";

type Props = {
  users: User[];
  onView: (id: string) => void;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
};

type Point = { x: number; y: number };

function useSwipeRightToEdit(opts: { onSwipeRight: () => void }) {
  const startRef = useRef<Point | null>(null);
  const activeRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    activeRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!activeRef.current || !startRef.current) return;
    activeRef.current = false;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    // swipe right threshold
    if (dx > 90 && Math.abs(dy) < 60) {
      opts.onSwipeRight();
    }

    startRef.current = null;
  };

  const onPointerCancel = () => {
    activeRef.current = false;
    startRef.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
}

export function UsersTable({ users, onView, onEdit, onDelete }: Props) {
  return (
    <div className="table">
      <div className="thead">
        <div>ID</div>
        <div>Name</div>
        <div>Email</div>
        <div>Status</div>
        <div>Role</div>
        <div>Actions</div>
      </div>

      {users.map((u) => {
        const swipe = useSwipeRightToEdit({ onSwipeRight: () => onEdit(u) });

        return (
          <div
            className="trow"
            key={u.id}
            role="button"
            tabIndex={0}
            onDoubleClick={() => onEdit(u)}
            onClick={() => onView(u.id)}
            {...swipe}
            title="Swipe right (or double-click) to edit"
          >
            <div className="mono">{u.id.slice(0, 8)}…</div>
            <div>{u.name}</div>
            <div>{u.email}</div>
            <div>{u.status}</div>
            <div>{u.role ?? "-"}</div>
            <div className="row">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(u);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(u.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {users.length === 0 && <div className="empty">No users found.</div>}
    </div>
  );
}
