import type { UpdateUserInput, UserRole, UserStatus } from "../types";

const STATUSES: (UserStatus | "")[] = ["", "ACTIVE", "INACTIVE", "SUSPENDED"];
const ROLES: (UserRole | "")[] = [
  "",
  "USER",
  "ADMIN",
  "MODERATOR",
  "STAFF",
  "GUEST",
]; // adjust

export function EditUserModal(props: {
  open: boolean;
  value: UpdateUserInput;
  onChange: (v: UpdateUserInput) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  if (!props.open) return null;

  const v = props.value;

  return (
    <div className="modalBackdrop" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit user</h3>

        <div className="grid">
          <label>
            Name
            <input
              value={v.name ?? ""}
              onChange={(e) => props.onChange({ ...v, name: e.target.value })}
            />
          </label>

          <label>
            Email
            <input
              value={v.email ?? ""}
              onChange={(e) => props.onChange({ ...v, email: e.target.value })}
              type="email"
            />
          </label>

          <label>
            Status
            <select
              value={(v.status ?? "") as string}
              onChange={(e) =>
                props.onChange({ ...v, status: e.target.value as UserStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s || "none"} value={s}>
                  {s || "(unchanged)"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select
              value={(v.role ?? "") as string}
              onChange={(e) =>
                props.onChange({
                  ...v,
                  role: (e.target.value || null) as UserRole | null,
                })
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
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button type="button" onClick={() => void props.onSave()}>
            Save
          </button>
        </div>

        <div className="muted small">
          Tip: swipe right on a row to open this.
        </div>
      </div>
    </div>
  );
}
