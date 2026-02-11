import { http, HttpResponse } from "msw";
import {
  mockUser,
  mockCase,
  mockCaseListResponse,
  mockEventListResponse,
  mockEvent,
  mockAuditType,
} from "./data";

export const handlers = [
  // Auth
  http.post("/api/auth/login", async () => {
    return HttpResponse.json({
      access_token: "test-token-123",
      token_type: "bearer",
    });
  }),

  http.get("/api/auth/me", () => {
    return HttpResponse.json({
      id: "user-1",
      username: "testuser",
      full_name: "Test User",
    });
  }),

  // Cases
  http.get("/api/cases", () => {
    return HttpResponse.json(mockCaseListResponse());
  }),

  http.post("/api/cases", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      mockCase({
        id: "case-new",
        title: body.title as string,
        audit_type_id: body.audit_type_id as string,
      }),
      { status: 201 }
    );
  }),

  http.get("/api/cases/:id", ({ params }) => {
    return HttpResponse.json(
      mockCase({ id: params.id as string })
    );
  }),

  http.patch("/api/cases/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      mockCase({ id: params.id as string, ...body })
    );
  }),

  http.delete("/api/cases/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Events
  http.get("/api/cases/:caseId/events", () => {
    return HttpResponse.json(mockEventListResponse());
  }),

  http.post("/api/cases/:caseId/events", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      mockEvent({
        id: "event-new",
        case_id: params.caseId as string,
        event_date: body.event_date as string,
      }),
      { status: 201 }
    );
  }),

  http.patch("/api/cases/:caseId/events/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      mockEvent({
        id: params.id as string,
        case_id: params.caseId as string,
        ...body,
      })
    );
  }),

  http.delete("/api/cases/:caseId/events/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Audit Types
  http.get("/api/audit-types", () => {
    return HttpResponse.json({
      items: [
        mockAuditType(),
        mockAuditType({
          id: "audit-type-2",
          name: "Compliance Audit",
          slug: "compliance-audit",
        }),
      ],
      total: 2,
    });
  }),

  // Users
  http.get("/api/users", () => {
    return HttpResponse.json([
      mockUser(),
      mockUser({ id: "user-2", username: "admin", full_name: "Admin User" }),
    ]);
  }),
];
