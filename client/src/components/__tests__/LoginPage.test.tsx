import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/render";
import { useAuthStore } from "@/stores/authStore";
import LoginPage from "@/pages/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("renders login form with username and password inputs", () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error message on failed login", async () => {
    server.use(
      http.post("/api/auth/login", () => {
        return HttpResponse.json(
          { detail: "Invalid credentials" },
          { status: 401 }
        );
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "baduser");
    await user.type(screen.getByLabelText(/password/i), "badpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows 'Signing in...' during submission", async () => {
    // Use a delayed handler to keep the request pending
    server.use(
      http.post("/api/auth/login", async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json({
          access_token: "token",
          token_type: "bearer",
        });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/password/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeInTheDocument();
  });

  it("renders redirect when already authenticated", () => {
    useAuthStore.setState({
      token: "test-token",
      user: { id: "1", username: "u", fullName: "U" },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithProviders(<LoginPage />);

    // LoginPage renders <Navigate to="/" replace /> when authenticated
    // In a test environment with BrowserRouter, the form should not be visible
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
  });
});
