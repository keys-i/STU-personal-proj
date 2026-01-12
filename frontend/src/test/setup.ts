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

afterAll(() => {
  console.error = orignalError;
});
