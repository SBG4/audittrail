import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { api } from "../api";

describe("api", () => {
  beforeEach(() => {
    // Ensure no token in storage
    try {
      window.localStorage.removeItem("token");
    } catch {
      // ignore
    }
  });

  describe("auth header", () => {
    it("sends Authorization header when token is in localStorage", async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get("/api/test", ({ request }) => {
          capturedAuth = request.headers.get("Authorization");
          return HttpResponse.json({ ok: true });
        })
      );

      window.localStorage.setItem("token", "my-secret-token");
      await api.get("/api/test");
      expect(capturedAuth).toBe("Bearer my-secret-token");
    });

    it("does not send Authorization header when no token", async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get("/api/test", ({ request }) => {
          capturedAuth = request.headers.get("Authorization");
          return HttpResponse.json({ ok: true });
        })
      );

      await api.get("/api/test");
      expect(capturedAuth).toBeNull();
    });
  });

  describe("response handling", () => {
    it("returns parsed JSON for successful responses", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json({ data: "hello" });
        })
      );
      const result = await api.get<{ data: string }>("/api/test");
      expect(result.data).toBe("hello");
    });

    it("returns undefined for 204 responses", async () => {
      server.use(
        http.delete("/api/test", () => {
          return new HttpResponse(null, { status: 204 });
        })
      );
      const result = await api.delete<void>("/api/test");
      expect(result).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("clears token on 401 response", async () => {
      window.localStorage.setItem("token", "old-token");

      server.use(
        http.get("/api/test", () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      await expect(api.get("/api/test")).rejects.toThrow("Unauthorized");
      expect(window.localStorage.getItem("token")).toBeNull();
    });

    it("throws error with detail message from error body", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(
            { detail: "Not found" },
            { status: 404 }
          );
        })
      );
      await expect(api.get("/api/test")).rejects.toThrow("Not found");
    });

    it("throws error with message field from error body", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(
            { message: "Server error" },
            { status: 500 }
          );
        })
      );
      await expect(api.get("/api/test")).rejects.toThrow("Server error");
    });

    it("throws generic error when no error body", async () => {
      server.use(
        http.get("/api/test", () => {
          return new HttpResponse("Not JSON", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          });
        })
      );
      await expect(api.get("/api/test")).rejects.toThrow(
        "Request failed with status 500"
      );
    });
  });

  describe("POST with JSON body", () => {
    it("sends JSON body with correct Content-Type", async () => {
      let capturedBody: unknown = null;
      let capturedContentType: string | null = null;

      server.use(
        http.post("/api/test", async ({ request }) => {
          capturedContentType = request.headers.get("Content-Type");
          capturedBody = await request.json();
          return HttpResponse.json({ id: "1" });
        })
      );

      await api.post("/api/test", { name: "test" });
      expect(capturedContentType).toBe("application/json");
      expect(capturedBody).toEqual({ name: "test" });
    });
  });

  describe("postForm", () => {
    it("sends URL-encoded body", async () => {
      let capturedBody: string | null = null;
      let capturedContentType: string | null = null;

      server.use(
        http.post("/api/test", async ({ request }) => {
          capturedContentType = request.headers.get("Content-Type");
          capturedBody = await request.text();
          return HttpResponse.json({ token: "abc" });
        })
      );

      await api.postForm("/api/test", "username=test&password=pass");
      expect(capturedContentType).toBe("application/x-www-form-urlencoded");
      expect(capturedBody).toBe("username=test&password=pass");
    });
  });

  describe("upload", () => {
    it("sends FormData with file", async () => {
      let capturedFieldName: string | null = null;

      server.use(
        http.post("/api/upload", async ({ request }) => {
          const formData = await request.formData();
          const file = formData.get("file");
          capturedFieldName = file ? "file" : null;
          return HttpResponse.json({ uploaded: true });
        })
      );

      const file = new File(["content"], "test.txt", {
        type: "text/plain",
      });
      await api.upload("/api/upload", file);
      expect(capturedFieldName).toBe("file");
    });
  });
});
