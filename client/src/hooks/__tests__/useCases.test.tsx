import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { mockCase, mockCaseListResponse } from "@/test/mocks/data";
import { useCases, useCreateCase, useDeleteCase } from "../useCases";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useCases", () => {
  it("returns case list data", async () => {
    const { result } = renderHook(() => useCases({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[0].title).toBe("Test Case");
  });

  it("builds query params from filters", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/cases", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockCaseListResponse());
      })
    );

    const { result } = renderHook(
      () => useCases({ status: "open", search: "test", limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("status")).toBe("open");
    expect(url.searchParams.get("search")).toBe("test");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("does not include empty filter params", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/cases", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockCaseListResponse());
      })
    );

    const { result } = renderHook(
      () => useCases({ status: "", search: "" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = new URL(capturedUrl);
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("search")).toBe(false);
  });
});

describe("useCreateCase", () => {
  it("creates a case and returns response", async () => {
    server.use(
      http.post("/api/cases", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          mockCase({ title: body.title as string }),
          { status: 201 }
        );
      })
    );

    const { result } = renderHook(() => useCreateCase(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: "New Case",
      audit_type_id: "at-1",
      metadata: {},
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("New Case");
  });
});

describe("useDeleteCase", () => {
  it("deletes a case successfully", async () => {
    server.use(
      http.delete("/api/cases/:id", () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useDeleteCase(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("case-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
