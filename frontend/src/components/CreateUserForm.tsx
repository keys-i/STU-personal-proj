import type { CreateUserInput, UserRole, UserStatus } from "../types";

const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const ROLES: (UserRole | "")[] = [
  "",
  "USER",
  "ADMIN",
  "MODERATOR",
  "STAFF",
  "GUEST",
]; // adjust

export function CreateUserForm(props: {
  value: CreateUserInput;
  onChange: (v: CreateUserInput) => void;
  onSubmit: () => Promise<void>;
  disabled?: boolean;
}) {
  const v = props.value;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void props.onSubmit();
      }}
      className="grid"
    >
      <label>
        Name
        <input
          value={v.name}
          onChange={(e) => props.onChange({ ...v, name: e.target.value })}
          required
          minLength={2}
          maxLength={100}
        />
      </label>

      <label>
        Email
        <input
          value={v.email}
          onChange={(e) => props.onChange({ ...v, email: e.target.value })}
          type="email"
          required
        />
      </label>

      <label>
        Status
        <select
          value={v.status}
          onChange={(e) =>
            props.onChange({ ...v, status: e.target.value as UserStatus })
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

      <div className="row">
        <button type="submit" disabled={props.disabled}>
          Create
        </button>
      </div>
    </form>
  );
}
