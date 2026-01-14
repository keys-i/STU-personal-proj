import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FloatingMenu } from "./NewFloatingMenu";

function makeAnchor(): {
  anchor: HTMLButtonElement;
  anchorRef: React.RefObject<HTMLElement>;
} {
  const anchor = document.createElement("button");
  anchor.textContent = "Anchor";
  document.body.appendChild(anchor);

  const anchorRef = { current: anchor } as React.RefObject<HTMLElement>;
  return { anchor, anchorRef };
}

async function tickRaf(times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
  }
}

async function flushRaf(n = 1) {
  // your setup.ts stubs requestAnimationFrame -> setTimeout(0)
  await act(async () => {
    for (let i = 0; i < n; i++) {
      vi.runOnlyPendingTimers();
    }
  });
}

describe("FloatingMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // remove any anchors appended to body in tests
    document.body.querySelectorAll("button").forEach((b) => {
      if (b.textContent === "Anchor") b.remove();
    });
  });

  it("renders nothing when not open and not mounted", () => {
    const { anchorRef } = makeAnchor();
    render(
      <FloatingMenu
        open={false}
        onClose={() => {}}
        items={[]}
        anchorRef={anchorRef}
      />,
    );

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("mounts and becomes open after two rAF ticks when open=true", async () => {
    const { anchorRef } = makeAnchor();
    render(
      <FloatingMenu
        open={true}
        onClose={() => {}}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    // 1st tick: mounted=true, phase="enter" -> menu exists
    await tickRaf(1);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menu").className).not.toMatch(/floatingMenuOpen/);

    // 2nd tick: phase="open"
    await tickRaf(1);
    expect(screen.getByRole("menu").className).toMatch(/floatingMenuOpen/);
  });

  it("applies alignment class", async () => {
    const { anchorRef } = makeAnchor();
    render(
      <FloatingMenu
        open={true}
        onClose={() => {}}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        align="left"
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);
    expect(screen.getByRole("menu").className).toMatch(/floatingMenuLeft/);
  });

  it("closes on Escape when mounted", async () => {
    const { anchorRef } = makeAnchor();
    const onClose = vi.fn();

    render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on outside pointerdown (not inside menu, not on anchor)", async () => {
    const { anchorRef } = makeAnchor();
    const onClose = vi.fn();

    render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    fireEvent.pointerDown(document.body, { target: document.body });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT close when clicking inside menu", async () => {
    const { anchorRef } = makeAnchor();
    const onClose = vi.fn();

    render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does NOT close when clicking anchor", async () => {
    const { anchor, anchorRef } = makeAnchor();
    const onClose = vi.fn();

    render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    fireEvent.pointerDown(anchor, { target: anchor });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clicking an item runs onSelect then onClose", async () => {
    const { anchorRef } = makeAnchor();
    const onClose = vi.fn();
    const onSelectA = vi.fn();

    render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        anchorRef={anchorRef}
        items={[
          { key: "a", label: "A", onSelect: onSelectA },
          { key: "b", label: "B", onSelect: vi.fn(), danger: true },
        ]}
      />,
    );

    // menu mounts after 1st rAF, becomes "open" after 2nd rAF
    await flushRaf(2);

    const itemA = screen.getByRole("menuitem", { name: "A" });
    fireEvent.click(itemA);

    expect(onSelectA).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("adds danger class for danger items", async () => {
    const { anchorRef } = makeAnchor();

    render(
      <FloatingMenu
        open={true}
        onClose={() => {}}
        items={[{ key: "b", label: "B", onSelect: () => {}, danger: true }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    expect(screen.getByRole("menuitem", { name: "B" }).className).toMatch(
      /menuItemDanger/,
    );
  });

  it("when open becomes false while mounted, adds closing class then unmounts on transitionend", async () => {
    const { anchorRef } = makeAnchor();
    const onClose = vi.fn();

    const { rerender } = render(
      <FloatingMenu
        open={true}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    rerender(
      <FloatingMenu
        open={false}
        onClose={onClose}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    // close effect schedules 1 rAF to setPhase("closing")
    await tickRaf(1);

    const menu = screen.getByRole("menu", { hidden: true });
    expect(menu.className).toMatch(/floatingMenuClosing/);

    // transition end triggers unmount (mounted=false)
    fireEvent.transitionEnd(menu, { propertyName: "transform" });
    expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
  });

  it("ignores transitionend if not closing or wrong property", async () => {
    const { anchorRef } = makeAnchor();

    const { rerender } = render(
      <FloatingMenu
        open={true}
        onClose={() => {}}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(2);

    // not closing: transitionEnd should not unmount
    const menuOpen = screen.getByRole("menu");
    fireEvent.transitionEnd(menuOpen, { propertyName: "transform" });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // now close, but fire wrong property => still mounted
    rerender(
      <FloatingMenu
        open={false}
        onClose={() => {}}
        items={[{ key: "a", label: "A", onSelect: () => {} }]}
        anchorRef={anchorRef}
      />,
    );

    await tickRaf(1);

    const menuClosing = screen.getByRole("menu", { hidden: true });
    fireEvent.transitionEnd(menuClosing, { propertyName: "height" });
    expect(screen.getByRole("menu", { hidden: true })).toBeInTheDocument();
  });
});
