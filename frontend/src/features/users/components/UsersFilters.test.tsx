import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsersFilters, type FilterState } from "./UsersFilters";

describe("UsersFilters", () => {
  const onChange = vi.fn();
  const onLimitChange = vi.fn();
  const onApply = vi.fn();

  const baseValue: FilterState = {
    name: "",
    status: "",
    fromDate: "",
    toDate: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders controls and helper note", () => {
    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
    expect(screen.getByText("Limit")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();

    expect(screen.getByText(/note: search is at the top/i)).toBeInTheDocument();

    // has "(any)" option for status
    const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /\(any\)/i }),
    ).toBeInTheDocument();
  });

  it("calls onChange when status changes", async () => {
    const user = userEvent.setup();

    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    const statusSelect = screen.getByLabelText("Status");
    await user.selectOptions(statusSelect, "INACTIVE");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...baseValue,
      status: "INACTIVE",
    });
  });

  it.each([
    {
      title: "updates fromDate",
      label: "From date",
      key: "fromDate" as const,
      value: "2025-01-01",
    },
    {
      title: "updates toDate",
      label: "To date",
      key: "toDate" as const,
      value: "2025-01-31",
    },
  ])("$title", async ({ label, key, value }) => {
    const user = userEvent.setup();

    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...baseValue,
      [key]: value,
    });
  });

  it("calls onLimitChange when limit changes", async () => {
    const user = userEvent.setup();

    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    const limitSelect = screen.getByLabelText("Limit");
    await user.selectOptions(limitSelect, "50");

    expect(onLimitChange).toHaveBeenCalledTimes(1);
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("calls onApply when Apply is clicked", async () => {
    const user = userEvent.setup();

    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("renders all status options", () => {
    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={10}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    // STATUSES: "", ACTIVE, INACTIVE, SUSPENDED
    expect(screen.getByRole("option", { name: "(any)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ACTIVE" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "INACTIVE" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "SUSPENDED" }),
    ).toBeInTheDocument();
  });

  it("uses passed limit prop as the selected value", () => {
    render(
      <UsersFilters
        value={baseValue}
        onChange={onChange}
        limit={50}
        onLimitChange={onLimitChange}
        onApply={onApply}
      />,
    );

    const limitSelect = screen.getByLabelText("Limit") as HTMLSelectElement;
    expect(limitSelect.value).toBe("50");
  });
});
