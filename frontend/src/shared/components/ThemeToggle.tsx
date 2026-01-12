import "../shared.css";
import { useId } from "react";

type Props = {
  checked: boolean; // true = dark
  onChange: (checked: boolean) => void;
  label?: string;
};

export function ThemeToggle({
  checked,
  onChange,
  label = "Toggle theme",
}: Props) {
  const id = useId();

  return (
    <div className="themeToggle">
      <input
        id={id}
        className="themeToggle__input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />

      <label className="themeToggle__label" htmlFor={id}>
        <span className="themeToggleMoon">
          <span className="themeToggleCrater crater1" />
          <span className="themeToggleCrater crater2" />
          <span className="themeToggleCrater crater3" />
          <span className="themeToggleCrater crater4" />
          <span className="themeToggleCrater crater5" />
        </span>

        <span className="themeToggleCloud ray1" />
        <span className="themeToggleCloud ray2" />
        <span className="themeToggleCloud ray3" />
      </label>
    </div>
  );
}
