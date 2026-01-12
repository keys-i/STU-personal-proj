import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

function getToggleLabel(container: HTMLElement): HTMLLabelElement {
  const el = container.querySelector("label.themeToggle__label");
  if (!el) throw new Error("theme toggle label not found");
  return el as HTMLLabelElement;
}

describe("ThemeToggle", () => {
  it("renders an accessible checkbox", () => {
    render(<ThemeToggle checked={false} onChange={() => {}} />);
    expect(
      screen.getByRole("checkbox", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it("reflects checked=false", () => {
    render(<ThemeToggle checked={false} onChange={() => {}} />);
    expect(
      screen.getByRole("checkbox", { name: /toggle theme/i }),
    ).not.toBeChecked();
  });

  it("reflects checked=true", () => {
    render(<ThemeToggle checked={true} onChange={() => {}} />);
    expect(
      screen.getByRole("checkbox", { name: /toggle theme/i }),
    ).toBeChecked();
  });

  it("calls onChange(true) when label is clicked from unchecked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <ThemeToggle checked={false} onChange={onChange} />,
    );

    await user.click(getToggleLabel(container));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange(false) when label is clicked from checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <ThemeToggle checked={true} onChange={onChange} />,
    );

    await user.click(getToggleLabel(container));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("can toggle with keyboard (Space) when focused", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ThemeToggle checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: /toggle theme/i });
    checkbox.focus();
    expect(checkbox).toHaveFocus();

    await user.keyboard("[Space]");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
