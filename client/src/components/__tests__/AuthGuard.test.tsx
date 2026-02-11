import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils/render";
import { useAuthStore } from "@/stores/authStore";
import AuthGuard from "@/components/AuthGuard";

describe("AuthGuard", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("shows loading state when isLoading is true", () => {
    useAuthStore.setState({ isLoading: true });

    renderWithProviders(<AuthGuard />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not render loading text when not authenticated and not loading", () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });

    renderWithProviders(<AuthGuard />);

    // Should redirect (Navigate to /login), not show loading
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("does not show loading when authenticated", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      token: "token",
      user: { id: "1", username: "u", fullName: "U" },
    });

    renderWithProviders(<AuthGuard />);

    // AuthGuard renders <Outlet />, which will be empty in this test context
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
