import type {
  Case,
  AuditType,
  UserInfo,
  CaseListResponse,
  JsonSchema,
} from "@/types/case";
import type { TimelineEvent, EventListResponse } from "@/types/event";
import type { FileBatch } from "@/types/file-batch";

export function mockUser(overrides?: Partial<UserInfo>): UserInfo {
  return {
    id: "user-1",
    username: "testuser",
    full_name: "Test User",
    is_active: true,
    ...overrides,
  };
}

export function mockSchema(
  overrides?: Partial<JsonSchema>
): JsonSchema {
  return {
    type: "object",
    properties: {
      region: { type: "string", title: "Region" },
      priority: {
        type: "string",
        title: "Priority",
        enum: ["low", "medium", "high"],
      },
    },
    required: ["region"],
    ...overrides,
  };
}

export function mockAuditType(overrides?: Partial<AuditType>): AuditType {
  return {
    id: "audit-type-1",
    name: "Financial Audit",
    slug: "financial-audit",
    description: "A standard financial audit",
    schema: mockSchema(),
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function mockCase(overrides?: Partial<Case>): Case {
  return {
    id: "case-1",
    case_number: 1001,
    title: "Test Case",
    description: "Test case description",
    audit_type_id: "audit-type-1",
    audit_type: mockAuditType(),
    metadata: { region: "US", priority: "high" },
    status: "open",
    assigned_to_id: "user-1",
    assigned_to: mockUser(),
    created_by_id: "user-1",
    created_by: mockUser(),
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    ...overrides,
  };
}

export function mockEvent(overrides?: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: "event-1",
    case_id: "case-1",
    event_type: "finding",
    event_date: "2025-01-15",
    event_time: "10:30",
    file_name: "report.pdf",
    file_count: 3,
    file_description: "Quarterly financial report",
    file_type: "PDF",
    metadata: {},
    sort_order: 0,
    created_by_id: "user-1",
    created_by: mockUser(),
    file_batches: [],
    created_at: "2025-01-15T10:30:00Z",
    updated_at: "2025-01-15T10:30:00Z",
    ...overrides,
  };
}

export function mockFileBatch(overrides?: Partial<FileBatch>): FileBatch {
  return {
    id: "batch-1",
    event_id: "event-1",
    label: "Batch A",
    file_count: 5,
    description: "First batch of files",
    file_types: "PDF, XLSX",
    sort_order: 0,
    created_at: "2025-01-15T10:30:00Z",
    updated_at: "2025-01-15T10:30:00Z",
    ...overrides,
  };
}

export function mockCaseListResponse(
  cases?: Case[],
  overrides?: Partial<CaseListResponse>
): CaseListResponse {
  const items = cases ?? [mockCase(), mockCase({ id: "case-2", case_number: 1002, title: "Second Case" })];
  return {
    items,
    total: items.length,
    offset: 0,
    limit: 20,
    ...overrides,
  };
}

export function mockEventListResponse(
  events?: TimelineEvent[],
  overrides?: Partial<EventListResponse>
): EventListResponse {
  const items = events ?? [mockEvent(), mockEvent({ id: "event-2", event_date: "2025-01-16", sort_order: 1 })];
  return {
    items,
    total: items.length,
    ...overrides,
  };
}
