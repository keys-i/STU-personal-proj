import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CreateUserMorph } from "./CreateUserMorph";

// ---- helpers ----

type RectLike = { left: number; top: number; width: number; height: number };

function setRect(el: HTMLElement, r: RectLike) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    x: r.left,
    y: r.top,
    left: r.left,
    top: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
    width: r.width,
    height: r.height,
    toJSON: () => ({}),
  } as DOMRect);
}

function setScrollHeight(el: HTMLElement, h: number) {
  Object.defineProperty(el, "scrollHeight", {
    value: h,
    configurable: true,
  });
}

async function flushRafTicks(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      // our setup.ts rAF polyfill uses setTimeout(0)
      vi.runOnlyPendingTimers();
    });
  }
}

function mockMatchMedia(opts: { reduceMotion?: boolean } = {}) {
  const reduce = !!opts.reduceMotion;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("prefers-reduced-motion") ? reduce : false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ---- ResizeObserver mock ----
type ROCallback = ResizeObserverCallback;

class ResizeObserverMock {
  static last: ResizeObserverMock | null = null;

  private cb: ROCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: ROCallback) {
    this.cb = cb;
    ResizeObserverMock.last = this;
  }

  // helper to trigger
  trigger(target: Element) {
    const entry = [{ target } as ResizeObserverEntry];
    this.cb(entry, this as unknown as ResizeObserver);
  }
}

describe("CreateUserMorph", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // jsdom needs this
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    mockMatchMedia({ reduceMotion: false });

    // stable viewport for layout math
    Object.defineProperty(window, "innerWidth", {
      value: 1200,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    ResizeObserverMock.last = null;
  });

  function renderWithAnchor(open: boolean, onClose = vi.fn()) {
    // anchor element that the morph reads
    const anchor = document.createElement("button");
    anchor.textContent = "Anchor";
    document.body.appendChild(anchor);

    // give it a deterministic rect
    setRect(anchor, { left: 900, top: 40, width: 90, height: 36 });

    const anchorRef = {
      current: anchor,
    } as React.RefObject<HTMLElement | null>;

    const ui = render(
      <CreateUserMorph
        open={open}
        anchorRef={anchorRef}
        onClose={onClose}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    const getCard = () =>
      ui.container.querySelector(".morphCard") as HTMLDivElement;
    const getHeader = () =>
      ui.container.querySelector(".morphHeader") as HTMLDivElement;
    const getBody = () =>
      ui.container.querySelector(".morphBody") as HTMLDivElement;
    const getBackdrop = () =>
      ui.container.querySelector(".morphBackdrop") as HTMLDivElement;

    return {
      ...ui,
      anchor,
      anchorRef,
      onClose,
      getCard,
      getHeader,
      getBody,
      getBackdrop,
    };
  }

  it("renders collapsed face when open=false", () => {
    const { getCard } = renderWithAnchor(false);

    expect(screen.getByText("Collapsed")).toBeInTheDocument();

    const card = getCard();
    expect(card).toHaveClass("morphCardCollapsed");
    expect(card.getAttribute("aria-hidden")).toBe("true");
  });

  it("when open=true, hides the anchor and expands after rAF ticks", async () => {
    const { anchor, getCard, getHeader, getBody, rerender, anchorRef } =
      renderWithAnchor(false);

    // open it
    rerender(
      <CreateUserMorph
        open
        anchorRef={anchorRef}
        onClose={vi.fn()}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    // effect hides anchor immediately
    expect(anchor.style.opacity).toBe("0");
    expect(anchor.style.pointerEvents).toBe("none");

    const card = getCard();
    const header = getHeader();
    const body = getBody();

    // provide header/body sizes so fit-height works
    setRect(header, { left: 0, top: 0, width: 100, height: 72 });
    setScrollHeight(body, 240);

    // open path uses 2 nested rAFs (+ one more for fit)
    await flushRafTicks(3);

    // it should have target width and fitted height set via CSS vars
    const w = card.style.getPropertyValue("--w");
    const h = card.style.getPropertyValue("--h");
    const x = card.style.getPropertyValue("--x");
    const y = card.style.getPropertyValue("--y");

    expect(w).not.toBe("");
    expect(h).not.toBe("");
    expect(x).not.toBe("");
    expect(y).not.toBe("");

    // expanded class when open
    expect(card).toHaveClass("morphCardExpanded");
    expect(card.getAttribute("aria-hidden")).toBe("false");
  });

  it("backdrop mouseDown closes; inside card mouseDown does not close", async () => {
    const onClose = vi.fn();
    const { getBackdrop, getCard, rerender, anchorRef } = renderWithAnchor(
      false,
      onClose,
    );

    rerender(
      <CreateUserMorph
        open
        anchorRef={anchorRef}
        onClose={onClose}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    await flushRafTicks(1);

    fireEvent.mouseDown(getBackdrop());
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();

    fireEvent.mouseDown(getCard());
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("when closing, anchor stays hidden until CLOSE_MS then becomes visible", async () => {
    const onClose = vi.fn();
    const { anchor, rerender, anchorRef } = renderWithAnchor(true, onClose);

    // open => anchor hidden
    expect(anchor.style.opacity).toBe("0");
    expect(anchor.style.pointerEvents).toBe("none");

    // close
    rerender(
      <CreateUserMorph
        open={false}
        anchorRef={anchorRef}
        onClose={onClose}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    // still hidden immediately
    expect(anchor.style.opacity).toBe("0");

    // after CLOSE_MS (220ms) it shows
    await act(async () => {
      vi.advanceTimersByTime(220);
    });

    expect(anchor.style.opacity).toBe("");
    expect(anchor.style.pointerEvents).toBe("");
  });

  it("reduced motion: anchor shows immediately on close (no delay)", async () => {
    mockMatchMedia({ reduceMotion: true });

    const onClose = vi.fn();
    const { anchor, rerender, anchorRef } = renderWithAnchor(true, onClose);

    rerender(
      <CreateUserMorph
        open={false}
        anchorRef={anchorRef}
        onClose={onClose}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    // timer delay is 0 in reduced-motion path
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(anchor.style.opacity).toBe("");
    expect(anchor.style.pointerEvents).toBe("");
  });

  it("resize/scroll while open recomputes vars and refits height", async () => {
    const { getCard, getHeader, getBody, rerender, anchorRef } =
      renderWithAnchor(false);

    rerender(
      <CreateUserMorph
        open
        anchorRef={anchorRef}
        onClose={vi.fn()}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    const card = getCard();
    const header = getHeader();
    const body = getBody();

    setRect(header, { left: 0, top: 0, width: 100, height: 60 });
    setScrollHeight(body, 200);

    await flushRafTicks(3);

    const beforeY = card.style.getPropertyValue("--y");

    // move anchor (simulate scroll/relayout)
    const anchor = anchorRef.current!;
    setRect(anchor, { left: 900, top: 120, width: 90, height: 36 });

    // fire resize -> onReflow
    fireEvent(window, new Event("resize"));

    // onReflow also schedules an rAF for fitHeight
    await flushRafTicks(2);

    const afterY = card.style.getPropertyValue("--y");
    expect(afterY).not.toBe(beforeY);
  });

  it("ResizeObserver triggers refit height while open", async () => {
    const { getCard, getHeader, getBody, rerender, anchorRef } =
      renderWithAnchor(false);

    rerender(
      <CreateUserMorph
        open
        anchorRef={anchorRef}
        onClose={vi.fn()}
        title="Create user"
        subtitle="sub"
        collapsedContent={<div>Collapsed</div>}
      >
        <div>Body content</div>
      </CreateUserMorph>,
    );

    const card = getCard();
    const header = getHeader();
    const body = getBody();

    setRect(header, { left: 0, top: 0, width: 100, height: 70 });
    setScrollHeight(body, 150);

    await flushRafTicks(3);

    const h1 = card.style.getPropertyValue("--h");

    // content grows
    setScrollHeight(body, 300);

    const ro = ResizeObserverMock.last;
    expect(ro).toBeTruthy();

    ro?.trigger(body);

    const h2 = card.style.getPropertyValue("--h");
    expect(h2).not.toBe(h1);
  });
});
