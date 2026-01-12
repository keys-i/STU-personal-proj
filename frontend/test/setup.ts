import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

afterEach(() => {
  cleanup();
});

const orignalError = console.error;
beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );

  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (
      msg.includes("Warning: An update to ") &&
      msg.includes("inside a test")
    ) {
      return;
    }
    orignalError(...args);
  };
});

type MatchMediaOpts = { matches?: boolean };

export function mockMatchMedia(opts: MatchMediaOpts = {}) {
  const { matches = false } = opts;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

type Store = Record<string, string>;

function createLocalStorageMock() {
  let store: Store = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

export function ensureLocalStorage() {
  const ls = createLocalStorageMock();

  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "localStorage", {
    value: ls,
    writable: true,
    configurable: true,
  });
}

// run once for all tests
ensureLocalStorage();
mockMatchMedia({ matches: false });

afterAll(() => {
  console.error = orignalError;
});
