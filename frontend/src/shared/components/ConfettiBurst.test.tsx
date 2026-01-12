import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

type Piece = {
  left: number;
  delay: number;
  dur: number;
  rot: number;
  size: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expectedPieces(seed: number, count: number): Piece[] {
  const rand = mulberry32(seed);
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rand() * 100,
      delay: rand() * 0.15,
      dur: 1.2 + rand() * 0.6,
      rot: rand() * 360,
      size: 6 + rand() * 8,
    });
  }
  return out;
}

function stubCryptoSeed(seed: number) {
  const getRandomValues = (arr: Uint32Array): Uint32Array => {
    arr[0] = seed;
    return arr;
  };

  // Vitest/jsdom might not provide crypto; stub it either way.
  vi.stubGlobal("crypto", { getRandomValues });
}

describe("ConfettiBurst", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("renders a confetti container with aria-hidden", async () => {
    stubCryptoSeed(123);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    render(<ConfettiBurst onDone={() => {}} />);
    const root = document.querySelector(".confetti");
    expect(root).toBeTruthy();
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("renders default count (34) pieces", async () => {
    stubCryptoSeed(123);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    const { container } = render(<ConfettiBurst onDone={() => {}} />);
    const pieces = container.querySelectorAll(".confettiPiece");
    expect(pieces.length).toBe(34);
  });

  it("renders custom count pieces", async () => {
    stubCryptoSeed(123);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    const { container } = render(<ConfettiBurst onDone={() => {}} count={5} />);
    const pieces = container.querySelectorAll(".confettiPiece");
    expect(pieces.length).toBe(5);
  });

  it("calls onDone after 1800ms", async () => {
    stubCryptoSeed(123);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    const onDone = vi.fn();
    render(<ConfettiBurst onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1799);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("clears the timeout on unmount (onDone not called)", async () => {
    stubCryptoSeed(123);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    const onDone = vi.fn();
    const { unmount } = render(<ConfettiBurst onDone={onDone} />);

    unmount();
    vi.advanceTimersByTime(2000);

    expect(onDone).not.toHaveBeenCalled();
  });

  it("applies deterministic inline styles when crypto seed is fixed", async () => {
    const seed = 777;
    const count = 3;
    stubCryptoSeed(seed);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    const expected = expectedPieces(seed, count);

    const { container } = render(
      <ConfettiBurst onDone={() => {}} count={count} />,
    );

    const spans = Array.from(
      container.querySelectorAll("span.confettiPiece"),
    ) as HTMLSpanElement[];
    expect(spans.length).toBe(count);

    for (let i = 0; i < count; i++) {
      const el = spans[i];
      if (!el) throw new Error("missing span");

      // React writes these as inline styles; assert exact string outputs.
      expect(el.style.left).toBe(`${expected[i].left}%`);
      expect(el.style.animationDelay).toBe(`${expected[i].delay}s`);
      expect(el.style.animationDuration).toBe(`${expected[i].dur}s`);
      expect(el.style.transform).toBe(`rotate(${expected[i].rot}deg)`);

      expect(el.style.width).toBe(`${expected[i].size}px`);
      const expectedH = Math.max(4, expected[i].size * 0.6);
      expect(el.style.height).toBe(`${expectedH}px`);
    }
  });

  it("still mounts even if crypto.getRandomValues throws (fallback path)", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: () => {
        throw new Error("nope");
      },
    });

    // Stabilize Date.now for the fallback seed path
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const mod = await import("./ConfettiBurst");
    const ConfettiBurst = mod.ConfettiBurst;

    render(<ConfettiBurst onDone={() => {}} count={2} />);
    const root = document.querySelector(".confetti");
    expect(root).toBeTruthy();

    // Uses aria-hidden, so it shouldn't show up in role-based queries; still fine.
    expect(screen.queryByText(/confetti/i)).toBeNull();
  });
});
