import { describe, it, expect } from "vitest";
import {
  isEmpty,
  getCaseCompleteness,
  getEventCompleteness,
  getFileBatchCompleteness,
  getCompletenessScore,
} from "../completeness";
import { mockCase, mockEvent, mockFileBatch, mockAuditType, mockSchema } from "@/test/mocks/data";

describe("isEmpty", () => {
  it("returns true for null", () => {
    expect(isEmpty(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isEmpty("")).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isEmpty(0)).toBe(false);
  });

  it("returns false for false", () => {
    expect(isEmpty(false)).toBe(false);
  });

  it("returns false for non-empty string", () => {
    expect(isEmpty("hello")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isEmpty(" ")).toBe(false);
  });

  it("returns false for number > 0", () => {
    expect(isEmpty(42)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isEmpty({})).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isEmpty([])).toBe(false);
  });
});

describe("getCaseCompleteness", () => {
  it("returns filled status for all core fields when present", () => {
    const case_ = mockCase();
    const fields = getCaseCompleteness(case_);
    const title = fields.find((f) => f.field === "title");
    expect(title).toMatchObject({ filled: true, required: true });
  });

  it("marks description as not filled when null", () => {
    const case_ = mockCase({ description: null });
    const fields = getCaseCompleteness(case_);
    const desc = fields.find((f) => f.field === "description");
    expect(desc).toMatchObject({ filled: false, required: false });
  });

  it("marks assignee as not filled when null", () => {
    const case_ = mockCase({ assigned_to_id: null });
    const fields = getCaseCompleteness(case_);
    const assignee = fields.find((f) => f.field === "assigned_to_id");
    expect(assignee).toMatchObject({ filled: false, required: false });
  });

  it("includes schema-defined metadata fields", () => {
    const case_ = mockCase({
      audit_type: mockAuditType({
        schema: mockSchema(),
      }),
      metadata: { region: "US", priority: "high" },
    });
    const fields = getCaseCompleteness(case_);
    const region = fields.find((f) => f.field === "metadata.region");
    expect(region).toMatchObject({ filled: true, required: true, label: "Region" });
  });

  it("marks metadata field as not filled when empty", () => {
    const case_ = mockCase({
      audit_type: mockAuditType({
        schema: mockSchema(),
      }),
      metadata: { region: "", priority: "high" },
    });
    const fields = getCaseCompleteness(case_);
    const region = fields.find((f) => f.field === "metadata.region");
    expect(region).toMatchObject({ filled: false, required: true });
  });

  it("handles case with no audit_type schema", () => {
    const case_ = mockCase({ audit_type: null });
    const fields = getCaseCompleteness(case_);
    // Should only have core fields (title, description, assigned_to_id)
    expect(fields).toHaveLength(3);
  });
});

describe("getEventCompleteness", () => {
  it("marks event_date as required and filled", () => {
    const event = mockEvent({ event_date: "2025-01-15" });
    const fields = getEventCompleteness(event);
    const date = fields.find((f) => f.field === "event_date");
    expect(date).toMatchObject({ filled: true, required: true });
  });

  it("marks optional fields correctly when null", () => {
    const event = mockEvent({
      event_time: null,
      file_name: null,
      file_count: null,
      file_description: null,
      file_type: null,
    });
    const fields = getEventCompleteness(event);
    expect(fields.filter((f) => !f.filled)).toHaveLength(5);
    expect(fields.filter((f) => f.required)).toHaveLength(1);
  });

  it("returns all 6 fields", () => {
    const fields = getEventCompleteness(mockEvent());
    expect(fields).toHaveLength(6);
  });

  it("file_count uses != null check (0 is filled)", () => {
    const event = mockEvent({ file_count: 0 });
    const fields = getEventCompleteness(event);
    const fileCount = fields.find((f) => f.field === "file_count");
    expect(fileCount?.filled).toBe(true);
  });
});

describe("getFileBatchCompleteness", () => {
  it("returns all 4 fields", () => {
    const fields = getFileBatchCompleteness(mockFileBatch());
    expect(fields).toHaveLength(4);
  });

  it("marks label and file_count as required", () => {
    const fields = getFileBatchCompleteness(mockFileBatch());
    const required = fields.filter((f) => f.required);
    expect(required).toHaveLength(2);
    expect(required.map((f) => f.field)).toEqual(
      expect.arrayContaining(["label", "file_count"])
    );
  });

  it("marks optional fields as not filled when null", () => {
    const batch = mockFileBatch({ description: null, file_types: null });
    const fields = getFileBatchCompleteness(batch);
    const desc = fields.find((f) => f.field === "description");
    const types = fields.find((f) => f.field === "file_types");
    expect(desc?.filled).toBe(false);
    expect(types?.filled).toBe(false);
  });
});

describe("getCompletenessScore", () => {
  it("calculates 100% when all fields filled", () => {
    const fields = [
      { field: "a", label: "A", filled: true, required: true },
      { field: "b", label: "B", filled: true, required: false },
    ];
    const score = getCompletenessScore(fields);
    expect(score.percentage).toBe(100);
    expect(score.filled).toBe(2);
    expect(score.total).toBe(2);
    expect(score.allRequiredFilled).toBe(true);
  });

  it("calculates 0% when no fields filled", () => {
    const fields = [
      { field: "a", label: "A", filled: false, required: true },
      { field: "b", label: "B", filled: false, required: false },
    ];
    const score = getCompletenessScore(fields);
    expect(score.percentage).toBe(0);
    expect(score.filled).toBe(0);
    expect(score.allRequiredFilled).toBe(false);
  });

  it("calculates partial percentage correctly", () => {
    const fields = [
      { field: "a", label: "A", filled: true, required: true },
      { field: "b", label: "B", filled: false, required: false },
      { field: "c", label: "C", filled: true, required: false },
    ];
    const score = getCompletenessScore(fields);
    expect(score.percentage).toBe(67); // Math.round(2/3 * 100)
    expect(score.filled).toBe(2);
    expect(score.total).toBe(3);
  });

  it("returns allRequiredFilled=false when required field is missing", () => {
    const fields = [
      { field: "a", label: "A", filled: false, required: true },
      { field: "b", label: "B", filled: true, required: false },
    ];
    const score = getCompletenessScore(fields);
    expect(score.allRequiredFilled).toBe(false);
  });

  it("returns 100% for empty fields array", () => {
    const score = getCompletenessScore([]);
    expect(score.percentage).toBe(100);
    expect(score.allRequiredFilled).toBe(true);
  });

  it("rounds percentage correctly", () => {
    const fields = [
      { field: "a", label: "A", filled: true, required: false },
      { field: "b", label: "B", filled: false, required: false },
      { field: "c", label: "C", filled: false, required: false },
    ];
    const score = getCompletenessScore(fields);
    expect(score.percentage).toBe(33); // Math.round(1/3 * 100)
  });
});
