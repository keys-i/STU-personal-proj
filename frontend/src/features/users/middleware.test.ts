import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import type { Paginated, User } from "./types";

type ErrorPayload = { message?: unknown };

type InterceptorPair = {
  onFulfilled?: (res: AxiosResponse) => AxiosResponse;
  onRejected?: (err: unknown) => Promise<never>;
};

function makeAxiosMock() {
  const pair: InterceptorPair = {};

  const interceptors: { response: { use: ReturnType<typeof vi.fn> } } = {
    response: {
      use: vi.fn(
        (
          onFulfilled?: (res: AxiosResponse) => AxiosResponse,
          onRejected?: (err: unknown) => Promise<never>,
        ) => {
          pair.onFulfilled = onFulfilled;
          pair.onRejected = onRejected;
          return 0;
        },
      ),
    },
  };

  const instance = {
    interceptors,
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    interceptors: typeof interceptors;
  };

  const axiosNs = {
    create: vi.fn<(config: unknown) => AxiosInstance>(() => instance),
    isAxiosError: vi.fn<(v: unknown) => boolean>(),
  };

  return { axiosNs, instance, pair };
}

// One shared mock object; we reset call history each test.
const mock = makeAxiosMock();

vi.mock("axios", () => {
  return {
    default: mock.axiosNs,
    isAxiosError: mock.axiosNs.isAxiosError,
    create: mock.axiosNs.create,
  };
});

function makeUser(id: string): User {
  return {
    id,
    name: `User ${id}`,
    email: `u${id}@x.com`,
    status: "ACTIVE",
    role: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null,
  };
}

function makePage(overrides?: Partial<Paginated<User>>): Paginated<User> {
  return {
    data: [makeUser("1")],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    ...overrides,
  };
}

describe("users api (axios)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // ensures ./middleware module init runs fresh per test
  });

  it("creates axios instance with baseURL, paramsSerializer, and installs response interceptor", async () => {
    await import("./middleware");

    expect(mock.axiosNs.create).toHaveBeenCalledTimes(1);

    const cfg = mock.axiosNs.create.mock.lastCall?.[0] as
      | {
          baseURL?: unknown;
          headers?: unknown;
          paramsSerializer?: unknown;
        }
      | undefined;

    expect(cfg).toBeTruthy();
    expect(cfg?.baseURL).toEqual(expect.any(String));
    expect(cfg?.headers).toEqual({ "Content-Type": "application/json" });

    // NEW: paramsSerializer added for qs
    expect(cfg?.paramsSerializer).toEqual(expect.any(Function));

    expect(mock.instance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(typeof mock.pair.onRejected).toBe("function");
    expect(typeof mock.pair.onFulfilled).toBe("function");
  });

  it("listUsers calls GET /users with nested params.filter and returns data", async () => {
    const { listUsers } = await import("./middleware");

    const payload = makePage({
      data: [makeUser("1"), makeUser("2")],
      meta: {
        page: 3,
        limit: 20,
        total: 99,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      },
    });

    mock.instance.get.mockResolvedValueOnce({ data: payload });

    const res = await listUsers({
      page: 3,
      limit: 20,
      filter: {
        name: "gina",
        status: "INACTIVE",
        fromDate: "2025-01-01T00:00:00.000Z",
        toDate: "2025-01-31T00:00:00.000Z",
      },
    });

    expect(mock.instance.get).toHaveBeenCalledTimes(1);
    expect(mock.instance.get).toHaveBeenCalledWith("/users", {
      params: {
        page: 3,
        limit: 20,
        filter: {
          name: "gina",
          status: "INACTIVE",
          fromDate: "2025-01-01T00:00:00.000Z",
          toDate: "2025-01-31T00:00:00.000Z",
        },
      },
    });

    expect(res).toEqual(payload);
  });

  it("listUsers omits empty/undefined filters (nested filter becomes empty object)", async () => {
    const { listUsers } = await import("./middleware");
    mock.instance.get.mockResolvedValueOnce({ data: makePage() });

    await listUsers({
      page: 1,
      limit: 10,
      filter: {
        name: "",
        status: undefined,
        fromDate: undefined,
        toDate: undefined,
      },
    });

    // With your current buildParams(), filter is always present but can be {}
    expect(mock.instance.get).toHaveBeenCalledWith("/users", {
      params: { page: 1, limit: 10, filter: {} },
    });
  });

  it("getUser calls GET /users/:id with encodeURIComponent", async () => {
    const { getUser } = await import("./middleware");
    const u = makeUser("x");
    mock.instance.get.mockResolvedValueOnce({ data: u });

    const id = "a/b?c=d";
    const res = await getUser(id);

    expect(mock.instance.get).toHaveBeenCalledWith(
      `/users/${encodeURIComponent(id)}`,
    );
    expect(res).toEqual(u);
  });

  it("createUser calls POST /users with body and returns user", async () => {
    const { createUser } = await import("./middleware");
    const u = makeUser("9");
    mock.instance.post.mockResolvedValueOnce({ data: u });

    const res = await createUser({
      name: "N",
      email: "n@x.com",
      status: "ACTIVE",
      role: null,
    });

    expect(mock.instance.post).toHaveBeenCalledWith("/users", {
      name: "N",
      email: "n@x.com",
      status: "ACTIVE",
      role: null,
    });
    expect(res).toEqual(u);
  });

  it("updateUser calls PATCH /users/:id with encodeURIComponent + input", async () => {
    const { updateUser } = await import("./middleware");
    const u = makeUser("10");
    mock.instance.patch.mockResolvedValueOnce({ data: u });

    const id = "id with spaces";
    const res = await updateUser(id, { status: "SUSPENDED" });

    expect(mock.instance.patch).toHaveBeenCalledWith(
      `/users/${encodeURIComponent(id)}`,
      { status: "SUSPENDED" },
    );
    expect(res).toEqual(u);
  });

  it("softDeleteUser calls DELETE /users/:id with encodeURIComponent", async () => {
    const { softDeleteUser } = await import("./middleware");
    mock.instance.delete.mockResolvedValueOnce({ data: undefined });

    const id = "x/y";
    await softDeleteUser(id);

    expect(mock.instance.delete).toHaveBeenCalledWith(
      `/users/${encodeURIComponent(id)}`,
    );
  });

  describe("error interceptor -> nice Error message", () => {
    it.each([
      {
        title: "string response body",
        axiosErr: {
          response: { status: 400, data: "Bad request" },
          message: "ignored",
        },
        expected: "Bad request",
      },
      {
        title: "object {message: string}",
        axiosErr: {
          response: { status: 422, data: { message: "Validation failed" } },
          message: "ignored",
        },
        expected: "Validation failed",
      },
      {
        title: "object {message: non-string} falls back to HTTP status",
        axiosErr: {
          response: { status: 500, data: { message: { nope: true } } },
          message: "ignored",
        },
        expected: "HTTP 500",
      },
      {
        title: "response without useful body falls back to HTTP status",
        axiosErr: {
          response: { status: 404, data: "" },
          message: "ignored",
        },
        expected: "HTTP 404",
      },
      {
        title: "no response falls back to axios message",
        axiosErr: {
          response: undefined,
          message: "Network down",
        },
        expected: "Network down",
      },
    ])("$title", async ({ axiosErr, expected }) => {
      await import("./middleware");

      mock.axiosNs.isAxiosError.mockReturnValue(true);

      const handler = mock.pair.onRejected;
      expect(handler).toBeTypeOf("function");

      await expect(
        handler?.(axiosErr as AxiosError<ErrorPayload | string>),
      ).rejects.toMatchObject({ message: expected });
    });

    it("non-axios error is passed through as Error(message)", async () => {
      await import("./middleware");

      mock.axiosNs.isAxiosError.mockReturnValue(false);

      const handler = mock.pair.onRejected;
      expect(handler).toBeTypeOf("function");

      await expect(handler?.(new Error("boom"))).rejects.toMatchObject({
        message: "boom",
      });
    });
  });
});
