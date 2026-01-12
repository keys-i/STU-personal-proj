import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import type {
  CreateUserInput,
  Paginated,
  UpdateUserInput,
  User,
  UserStatus,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

export type UserFilter = {
  name?: string;
  status?: UserStatus;
  fromDate?: string; // ISO
  toDate?: string; // ISO
};

type ErrorPayload = {
  message?: unknown;
};

function toErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : "Unknown error";
  }

  const e = err as AxiosError<ErrorPayload | string>;
  const data = e.response?.data;

  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object" && "message" in data) {
    const msg = (data as ErrorPayload).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  if (e.response) return `HTTP ${e.response.status}`;
  return e.message || "Network error";
}

function createApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    // withCredentials: true,
  });

  // Convert axios errors into normal Error with a nice message
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    (err: unknown) => Promise.reject(new Error(toErrorMessage(err))),
  );

  return instance;
}

const api = createApi();

function buildParams(args: {
  page: number;
  limit: number;
  filter?: UserFilter;
}): Record<string, string | number> {
  const { page, limit, filter } = args;

  const params: Record<string, string | number> = { page, limit };

  if (filter?.name) params["filter[name]"] = filter.name;
  if (filter?.status) params["filter[status]"] = filter.status;
  if (filter?.fromDate) params["filter[fromDate]"] = filter.fromDate;
  if (filter?.toDate) params["filter[toDate]"] = filter.toDate;

  return params;
}

export async function listUsers(args: {
  page: number;
  limit: number;
  filter?: UserFilter;
}): Promise<Paginated<User>> {
  const res = await api.get<Paginated<User>>("/users", {
    params: buildParams(args),
  });
  return res.data;
}

export async function getUser(id: string): Promise<User> {
  const res = await api.get<User>(`/users/${id}`);
  return res.data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const res = await api.post<User>("/users", input);
  return res.data;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<User> {
  const res = await api.patch<User>(`/users/${id}`, input);
  return res.data;
}

export async function softDeleteUser(id: string): Promise<void> {
  await api.delete<void>(`/users/${id}`);
}
