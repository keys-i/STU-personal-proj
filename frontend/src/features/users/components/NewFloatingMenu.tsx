import { useEffect, useId, useRef } from "react";

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

  return (
    <div ref={rootRef} className="menuAnchor">
      <div
        id={menuId}
        role="menu"
        aria-hidden={!open}
        className={[
          "floatingMenu",
          open ? "floatingMenuOpen" : "",
          align === "left" ? "floatingMenuLeft" : "floatingMenuRight",
        ].join(" ")}
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
