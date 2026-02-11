import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils/render";
import { mockCase } from "@/test/mocks/data";
import CaseList from "@/components/cases/CaseList";

const defaultProps = {
  cases: [
    mockCase({ id: "1", case_number: 1001, title: "First Case", status: "open" as const }),
    mockCase({ id: "2", case_number: 1002, title: "Second Case", status: "active" as const }),
  ],
  total: 2,
  offset: 0,
  limit: 20,
  onPageChange: vi.fn(),
  onCaseClick: vi.fn(),
  isLoading: false,
};

describe("CaseList", () => {
  it("renders case rows with case numbers and titles", () => {
    renderWithProviders(<CaseList {...defaultProps} />);

    expect(screen.getByText("1001")).toBeInTheDocument();
    expect(screen.getByText("First Case")).toBeInTheDocument();
    expect(screen.getByText("1002")).toBeInTheDocument();
    expect(screen.getByText("Second Case")).toBeInTheDocument();
  });

  it("shows empty state when no cases", () => {
    renderWithProviders(
      <CaseList {...defaultProps} cases={[]} total={0} />
    );

    expect(screen.getByText("No cases found")).toBeInTheDocument();
    expect(screen.getByText("Create a new case")).toBeInTheDocument();
  });

  it("displays status badges", () => {
    renderWithProviders(<CaseList {...defaultProps} />);

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("calls onCaseClick when a row is clicked", async () => {
    const onCaseClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <CaseList {...defaultProps} onCaseClick={onCaseClick} />
    );

    await user.click(screen.getByText("First Case"));
    expect(onCaseClick).toHaveBeenCalledWith("1");
  });

  it("shows pagination info", () => {
    renderWithProviders(<CaseList {...defaultProps} />);

    expect(screen.getByText(/showing 1-2 of 2 cases/i)).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    renderWithProviders(<CaseList {...defaultProps} />);

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("enables next button when there are more pages", () => {
    renderWithProviders(
      <CaseList {...defaultProps} total={50} />
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("calls onPageChange when next is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <CaseList
        {...defaultProps}
        total={50}
        onPageChange={onPageChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(20);
  });

  it("shows assignee name or 'Unassigned'", () => {
    const cases = [
      mockCase({ id: "1", assigned_to: { id: "u1", username: "a", full_name: "Alice", is_active: true } }),
      mockCase({ id: "2", assigned_to: null }),
    ];
    renderWithProviders(
      <CaseList {...defaultProps} cases={cases} />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });
});
