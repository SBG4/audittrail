import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { mockEvent, mockEventListResponse } from "@/test/mocks/data";
import { useEvents, useUpdateEvent, useDeleteEvent } from "../useEvents";

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

describe("useEvents", () => {
  it("returns event list data", async () => {
    const { result } = renderHook(() => useEvents("case-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[0].event_type).toBe("finding");
  });

  it("is disabled when caseId is empty", () => {
    const { result } = renderHook(() => useEvents(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateEvent", () => {
  it("updates an event with optimistic update", async () => {
    const wrapper = createWrapper();
    // Pre-populate the cache with events
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    qc.setQueryData(["events", "case-1"], mockEventListResponse());

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={qc}>
          {children}
        </QueryClientProvider>
      );
    }

    server.use(
      http.patch("/api/cases/:caseId/events/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          mockEvent({ id: "event-1", file_name: body.file_name as string })
        );
      })
    );

    const { result } = renderHook(() => useUpdateEvent("case-1"), {
      wrapper: Wrapper,
    });

    result.current.mutate({ id: "event-1", file_name: "updated.pdf" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteEvent", () => {
  it("deletes an event successfully", async () => {
    server.use(
      http.delete("/api/cases/:caseId/events/:id", () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useDeleteEvent("case-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("event-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
