import type { User } from "../types";

export function UserDetails({ user }: { user: User | null }) {
  if (!user) return <div className="muted">Select a user from the list.</div>;

  return (
    <div className="details">
      <div>
        <strong>ID:</strong> <span className="mono">{user.id}</span>
      </div>
      <div>
        <strong>Name:</strong> {user.name}
      </div>
      <div>
        <strong>Email:</strong> {user.email}
      </div>
      <div>
        <strong>Status:</strong> {user.status}
      </div>
      <div>
        <strong>Role:</strong> {user.role ?? "-"}
      </div>
      <div>
        <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
      </div>
      <div>
        <strong>Updated:</strong> {new Date(user.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
