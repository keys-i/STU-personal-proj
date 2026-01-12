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
};

export function FloatingMenu({ open, onClose, items, align = "right" }: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // keep mounted during close animation
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div ref={rootRef} className="menuAnchor">
      <div
        id={menuId}
        role="menu"
        aria-hidden={!open}
        className={[
          "floatingMenu",
          open && !closing ? "floatingMenuOpen" : "",
          closing ? "floatingMenuClosing" : "",
          align === "left" ? "floatingMenuLeft" : "floatingMenuRight",
        ].join(" ")}
        onTransitionEnd={(e) => {
          if (!closing) return;
          if (e.propertyName !== "transform") return;
          setMounted(false);
          setClosing(false);
        }}
      >
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="menuitem"
            className={["menuItem", it.danger ? "menuItemDanger" : ""].join(
              " ",
            )}
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
    </div>
  );
}
