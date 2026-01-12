import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateUserForm } from "./CreateUserForm";
import type { CreateUserInput, UserRole, UserStatus } from "../types";

function makeValue(overrides?: Partial<CreateUserInput>): CreateUserInput {
  return {
    name: "Alice",
    email: "alice@example.com",
    status: "ACTIVE",
    role: null,
    ...overrides,
  };
}

function renderForm(
  override?: Partial<React.ComponentProps<typeof CreateUserForm>>,
) {
  const props: React.ComponentProps<typeof CreateUserForm> = {
    value: makeValue(),
    onChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    disabled: false,
    ...override,
  };

  render(<CreateUserForm {...props} />);
  return props;
}

describe("CreateUserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inputs with provided values", () => {
    renderForm({
      value: makeValue({
        name: "Bob",
        email: "bob@ex.com",
        status: "INACTIVE",
        role: "ADMIN",
      }),
    });

    expect(screen.getByLabelText(/name/i)).toHaveValue("Bob");
    expect(screen.getByLabelText(/email/i)).toHaveValue("bob@ex.com");
    expect(screen.getByLabelText(/^status/i)).toHaveValue("INACTIVE");
    expect(screen.getByLabelText(/role \(optional\)/i)).toHaveValue("ADMIN");

    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("calls onChange when name changes", () => {
    const onChange = vi.fn();
    const value = makeValue({ email: "x@y.com", status: "ACTIVE", role: null });

    renderForm({ value, onChange });

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "New Name" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...value, name: "New Name" });
  });

  it("calls onChange when email changes", () => {
    const onChange = vi.fn();
    const value = makeValue({ name: "Alice" });

    renderForm({ value, onChange });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@ex.com" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...value, email: "new@ex.com" });
  });

  it.each([
    { next: "ACTIVE" as UserStatus },
    { next: "INACTIVE" as UserStatus },
    { next: "SUSPENDED" as UserStatus },
  ])("calls onChange when status changes to $next", ({ next }) => {
    const onChange = vi.fn();
    const value = makeValue({ status: "ACTIVE" });

    renderForm({ value, onChange });

    fireEvent.change(screen.getByLabelText(/^status/i), {
      target: { value: next },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...value, status: next });
  });

  it.each([
    { label: "USER", expected: "USER" as UserRole | null },
    { label: "ADMIN", expected: "ADMIN" as UserRole | null },
    { label: "MODERATOR", expected: "MODERATOR" as UserRole | null },
    { label: "", expected: null }, // "(none)" => empty => null
  ])("calls onChange when role changes to %s", ({ label, expected }) => {
    const onChange = vi.fn();
    const value = makeValue({ role: "USER" });

    renderForm({ value, onChange });

    fireEvent.change(screen.getByLabelText(/role \(optional\)/i), {
      target: { value: label },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...value, role: expected });
  });

  it("submitting the form prevents default and calls onSubmit once", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    const form = screen
      .getByRole("button", { name: /create/i })
      .closest("form");
    expect(form).toBeTruthy();

    // Create a real submit event and spy on *that* event's preventDefault
    const ev = new Event("submit", { bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(ev, "preventDefault");

    form?.dispatchEvent(ev);

    expect(preventSpy).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Create button is disabled when props.disabled=true", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderForm({ disabled: true, onSubmit });

    const btn = screen.getByRole("button", { name: /create/i });
    expect(btn).toBeDisabled();

    // even if someone submits programmatically, browser would block in real UI,
    // but in jsdom we just ensure the handler is wired + button disabled.
    // (No click here to avoid false assumptions.)
  });
});
