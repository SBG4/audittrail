import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils/render";
import LifecycleControl from "@/components/cases/LifecycleControl";

describe("LifecycleControl", () => {
  it("shows current status badge and available transitions for 'open'", () => {
    renderWithProviders(
      <LifecycleControl
        currentStatus="open"
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("shows only 'Close' transition for 'active'", () => {
    renderWithProviders(
      <LifecycleControl
        currentStatus="active"
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("shows 'Reopen' transition for 'closed'", () => {
    renderWithProviders(
      <LifecycleControl
        currentStatus="closed"
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("calls onStatusChange with target status when transition clicked", async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <LifecycleControl
        currentStatus="open"
        onStatusChange={onStatusChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStatusChange).toHaveBeenCalledWith("active");
  });

  it("disables buttons when disabled prop is true", () => {
    renderWithProviders(
      <LifecycleControl
        currentStatus="open"
        onStatusChange={vi.fn()}
        disabled
      />
    );

    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });
});
