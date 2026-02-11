import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { useAuthStore } from "../authStore";

describe("authStore", () => {
  beforeEach(() => {
    // Reset the store to a clean initial state
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe("initial state", () => {
    it("has null token and user by default", () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe("login", () => {
    it("sets token and fetches user info", async () => {
      server.use(
        http.post("/api/auth/login", () => {
          return HttpResponse.json({
            access_token: "test-token",
            token_type: "bearer",
          });
        }),
        http.get("/api/auth/me", () => {
          return HttpResponse.json({
            id: "user-1",
            username: "testuser",
            full_name: "Test User",
          });
        })
      );

      await useAuthStore.getState().login("testuser", "password123");

      const state = useAuthStore.getState();
      expect(state.token).toBe("test-token");
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
      });
      expect(window.localStorage.getItem("token")).toBe("test-token");
    });

    it("throws on login failure", async () => {
      server.use(
        http.post("/api/auth/login", () => {
          return HttpResponse.json(
            { detail: "Invalid credentials" },
            { status: 401 }
          );
        })
      );

      await expect(
        useAuthStore.getState().login("bad", "creds")
      ).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("clears auth state and localStorage", () => {
      // Manually set an authenticated state
      useAuthStore.setState({
        token: "test-token",
        user: { id: "1", username: "u", fullName: "U" },
        isAuthenticated: true,
      });
      window.localStorage.setItem("token", "test-token");

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(window.localStorage.getItem("token")).toBeNull();
    });
  });

  describe("initialize", () => {
    it("sets isLoading to false when no token exists", async () => {
      useAuthStore.setState({ isLoading: true });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("fetches user when token exists in localStorage", async () => {
      window.localStorage.setItem("token", "existing-token");

      server.use(
        http.get("/api/auth/me", () => {
          return HttpResponse.json({
            id: "user-1",
            username: "testuser",
            full_name: "Test User",
          });
        })
      );

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({
        id: "user-1",
        username: "testuser",
        fullName: "Test User",
      });
      expect(state.isLoading).toBe(false);
    });

    it("clears state when token is invalid", async () => {
      window.localStorage.setItem("token", "expired-token");

      server.use(
        http.get("/api/auth/me", () => {
          return HttpResponse.json(
            { detail: "Invalid token" },
            { status: 401 }
          );
        })
      );

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});
