import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const originalError = console.error;

beforeAll(() => {
  // Deterministic rAF/cAF for jsdom (works with vi.useFakeTimers())
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );

  // Silence React act() warning noise (keep real errors)
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (
      msg.includes("Warning: An update to ") &&
      msg.includes("inside a test")
    ) {
      return;
    }
    originalError(...args);
  };
});

type MatchMediaOpts = { matches?: boolean };

export function mockMatchMedia(opts: MatchMediaOpts = {}) {
  const { matches = false } = opts;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // legacy
      removeListener: vi.fn(), // legacy
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

// Run once for all tests
ensureLocalStorage();
mockMatchMedia({ matches: false });

afterAll(() => {
  console.error = originalError;
});
