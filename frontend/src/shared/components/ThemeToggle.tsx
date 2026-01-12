import { useId } from "react";
import "../shared.css";

type Props = {
  checked: boolean; // true = dark
  onChange: (checked: boolean) => void;
};

export function ThemeToggle({ checked, onChange }: Props) {
  const id = useId();

  return (
    <div className="themeToggle">
      <input
        id={id}
        className="themeToggle__input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Toggle theme"
      />

      <label className="themeToggle__label" htmlFor={id}>
        <span className="themeToggleMoon" aria-hidden="true">
          <span className="themeToggleCrater crater1" />
          <span className="themeToggleCrater crater2" />
          <span className="themeToggleCrater crater3" />
          <span className="themeToggleCrater crater4" />
          <span className="themeToggleCrater crater5" />
        </span>

        <span className="themeToggleCloud ray1" aria-hidden="true" />
        <span className="themeToggleCloud ray2" aria-hidden="true" />
        <span className="themeToggleCloud ray3" aria-hidden="true" />
      </label>
    </div>
  );
}
