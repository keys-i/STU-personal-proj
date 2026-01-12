import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditUserModal } from "./EditUserModal";
import type { UserRole, UserStatus } from "../types";

function renderModal(
  override?: Partial<React.ComponentProps<typeof EditUserModal>>,
) {
  const props: React.ComponentProps<typeof EditUserModal> = {
    open: true,
    value: {},
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    ...override,
  };

  render(<EditUserModal {...props} />);
  return props;
}

describe("EditUserModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open=false", () => {
    renderModal({ open: false });
    expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
  });

  it("renders title and fields when open=true", () => {
    renderModal({
      value: {
        name: "Alice",
        email: "a@b.com",
        status: "ACTIVE",
        role: "ADMIN",
      },
    });

    expect(screen.getByText(/edit user/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/name/i)).toHaveValue("Alice");
    expect(screen.getByLabelText(/email/i)).toHaveValue("a@b.com");

    expect(screen.getByLabelText(/status/i)).toHaveValue("ACTIVE");
    expect(screen.getByLabelText(/role/i)).toHaveValue("ADMIN");
  });

  it("defaults missing fields to empty strings", () => {
    renderModal({ value: {} });

    expect(screen.getByLabelText(/name/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    expect(screen.getByLabelText(/status/i)).toHaveValue("");
    expect(screen.getByLabelText(/role/i)).toHaveValue("");
  });

  it("calls onChange when editing name", () => {
    const onChange = vi.fn();
    renderModal({ value: { email: "x@y.com" }, onChange });

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Bob" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ email: "x@y.com", name: "Bob" });
  });

  it("calls onChange when editing email", () => {
    const onChange = vi.fn();
    renderModal({ value: { name: "Alice" }, onChange });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@ex.com" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      name: "Alice",
      email: "new@ex.com",
    });
  });

  it.each([
    { next: "ACTIVE" as UserStatus },
    { next: "INACTIVE" as UserStatus },
    { next: "SUSPENDED" as UserStatus },
  ])("calls onChange when changing status to $next", ({ next }) => {
    const onChange = vi.fn();
    renderModal({ value: { name: "A" }, onChange });

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: next },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ name: "A", status: next });
  });

  it.each([
    { label: "USER", expected: "USER" as UserRole | null },
    { label: "ADMIN", expected: "ADMIN" as UserRole | null },
    { label: "MODERATOR", expected: "MODERATOR" as UserRole | null },
    { label: "", expected: null }, // choosing "(none)" -> empty string -> null
  ])("calls onChange when changing role to %s", ({ label, expected }) => {
    const onChange = vi.fn();
    renderModal({ value: { status: "ACTIVE" }, onChange });

    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: label },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ status: "ACTIVE", role: expected });
  });

  it("clicking backdrop calls onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    // backdrop is the parent of the modal; easiest robust target is the title then parentElement chain
    const modal = screen.getByText(/edit user/i).closest(".modal");
    expect(modal).toBeTruthy();

    const backdrop = modal?.parentElement; // .modalBackdrop
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking inside modal does not call onClose (stops propagation)", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const modal = screen.getByText(/edit user/i).closest(".modal");
    fireEvent.click(modal as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Save button calls onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSave });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    // no await needed here unless you want to assert after it resolves;
    // it's invoked synchronously by the click handler.
  });
});
