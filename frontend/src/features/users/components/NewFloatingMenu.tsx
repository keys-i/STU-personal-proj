import { useEffect, useId, useRef, useState } from "react";

type MenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  align?: "right" | "left";
  anchorRef: React.RefObject<HTMLElement>;
};

export function FloatingMenu({
  open,
  onClose,
  items,
  align = "right",
  anchorRef,
}: Props) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<"enter" | "open" | "closing">(
    open ? "open" : "enter",
  );

  // mount/open/close transitions (NO sync setState in effect body)
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;

    if (open) {
      raf1 = window.requestAnimationFrame(() => {
        setMounted(true);
        setPhase("enter");

        raf2 = window.requestAnimationFrame(() => {
          setPhase("open");
        });
      });

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    if (!open && mounted) {
      raf1 = window.requestAnimationFrame(() => {
        setPhase("closing");
      });

      return () => window.cancelAnimationFrame(raf1);
    }
  }, [open, mounted]);

  // close on outside / escape (no setState here)
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      const menu = menuRef.current;
      const anchor = anchorRef.current;
      const target = e.target as Node;

      if (menu && menu.contains(target)) return;
      if (anchor && anchor.contains(target)) return;

      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mounted, onClose, anchorRef]);

  if (!mounted) return null;

  const openClass = phase === "open" ? "floatingMenuOpen" : "";
  const closingClass = phase === "closing" ? "floatingMenuClosing" : "";
  const alignClass =
    align === "left" ? "floatingMenuLeft" : "floatingMenuRight";

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-hidden={!open}
      className={["floatingMenu", openClass, closingClass, alignClass].join(
        " ",
      )}
      onTransitionEnd={(e) => {
        if (phase !== "closing") return;
        if (e.propertyName !== "transform" && e.propertyName !== "opacity")
          return;
        setMounted(false); // allowed (event callback)
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="menuitem"
          className={["menuItem", it.danger ? "menuItemDanger" : ""].join(" ")}
          onClick={() => {
            it.onSelect();
            onClose();
          }}
        >
          {it.icon ? <span className="menuItemIcon">{it.icon}</span> : null}
          <span className="menuItemLabel">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
