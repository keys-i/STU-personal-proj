import type {
  CreateUserInput,
  Paginated,
  UpdateUserInput,
  User,
  UserStatus,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as any).message)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

export type UserFilter = {
  name?: string;
  status?: UserStatus;
  fromDate?: string; // ISO
  toDate?: string; // ISO
};

export async function listUsers(args: {
  page: number;
  limit: number;
  filter?: UserFilter;
}): Promise<Paginated<User>> {
  const { page, limit, filter } = args;

  // Supports your backend style: filter[name], filter[status], etc
  return http<Paginated<User>>(
    `/users${qs({
      page,
      limit,
      "filter[name]": filter?.name,
      "filter[status]": filter?.status,
      "filter[fromDate]": filter?.fromDate,
      "filter[toDate]": filter?.toDate,
    })}`,
  );
}

export async function getUser(id: string): Promise<User> {
  return http<User>(`/users/${encodeURIComponent(id)}`);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return http<User>(`/users`, { method: "POST", body: JSON.stringify(input) });
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<User> {
  return http<User>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function softDeleteUser(id: string): Promise<void> {
  return http<void>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
