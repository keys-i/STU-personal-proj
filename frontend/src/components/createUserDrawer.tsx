import { useRef } from "react";

type Point = { x: number; y: number };

export function CreateUserDrawer(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const startRef = useRef<Point | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    // swipe right to close
    if (dx > 110 && Math.abs(dy) < 80) props.onClose();

    startRef.current = null;
  }

  return (
    <div
      className={`drawerBackdrop ${props.open ? "drawerBackdropOpen" : ""}`}
      onClick={props.onClose}
    >
      <aside
        className={`drawer ${props.open ? "drawerOpen" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="drawerHeader">
          <div>
            <div className="drawerTitle">Create user</div>
            <div className="drawerSub">Swipe right to close</div>
          </div>

          <button type="button" className="chip" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div className="drawerBody">{props.children}</div>
      </aside>
    </div>
  );
}
