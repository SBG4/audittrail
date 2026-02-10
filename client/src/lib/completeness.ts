import type { Case } from "@/types/case";
import type { TimelineEvent } from "@/types/event";
import type { FileBatch } from "@/types/file-batch";

export interface FieldStatus {
  field: string;
  label: string;
  filled: boolean;
  required: boolean;
}

/**
 * Determines if a value should be considered "empty" for completeness purposes.
 * - null, undefined, and empty string "" are empty
 * - 0, false, and all other values are NOT empty (0 is a valid file count)
 */
export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * Get completeness status for all case-level fields.
 * Checks core fields (title, description, assignee) plus all schema-defined metadata fields.
 */
export function getCaseCompleteness(case_: Case): FieldStatus[] {
  const fields: FieldStatus[] = [
    {
      field: "title",
      label: "Title",
      filled: !isEmpty(case_.title),
      required: true,
    },
    {
      field: "description",
      label: "Description",
      filled: !isEmpty(case_.description),
      required: false,
    },
    {
      field: "assigned_to_id",
      label: "Assignee",
      filled: !isEmpty(case_.assigned_to_id),
      required: false,
    },
  ];

  // Check schema-defined metadata fields
  if (case_.audit_type?.schema) {
    const schema = case_.audit_type.schema;
    const requiredFields = new Set(schema.required ?? []);

    for (const [key, property] of Object.entries(schema.properties)) {
      const value = case_.metadata[key];
      fields.push({
        field: `metadata.${key}`,
        label: property.title || key,
        filled: !isEmpty(value),
        required: requiredFields.has(key),
      });
    }
  }

  return fields;
}

/**
 * Get completeness status for a single timeline event.
 * event_date is required; all other fields are optional.
 */
export function getEventCompleteness(event: TimelineEvent): FieldStatus[] {
  return [
    {
      field: "event_date",
      label: "Date",
      filled: !isEmpty(event.event_date),
      required: true,
    },
    {
      field: "event_time",
      label: "Time",
      filled: !isEmpty(event.event_time),
      required: false,
    },
    {
      field: "file_name",
      label: "File Name",
      filled: !isEmpty(event.file_name),
      required: false,
    },
    {
      field: "file_count",
      label: "File Count",
      filled: event.file_count != null,
      required: false,
    },
    {
      field: "file_description",
      label: "Description",
      filled: !isEmpty(event.file_description),
      required: false,
    },
    {
      field: "file_type",
      label: "File Type",
      filled: !isEmpty(event.file_type),
      required: false,
    },
  ];
}

/**
 * Get completeness status for a file batch.
 */
export function getFileBatchCompleteness(batch: FileBatch): FieldStatus[] {
  return [
    {
      field: "label",
      label: "Label",
      filled: !isEmpty(batch.label),
      required: true,
    },
    {
      field: "file_count",
      label: "File Count",
      filled: batch.file_count != null,
      required: true,
    },
    {
      field: "description",
      label: "Description",
      filled: !isEmpty(batch.description),
      required: false,
    },
    {
      field: "file_types",
      label: "File Types",
      filled: !isEmpty(batch.file_types),
      required: false,
    },
  ];
}

/**
 * Calculate aggregate completeness score from a list of field statuses.
 */
export function getCompletenessScore(fields: FieldStatus[]): {
  filled: number;
  total: number;
  percentage: number;
  allRequiredFilled: boolean;
} {
  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  const allRequiredFilled = fields
    .filter((f) => f.required)
    .every((f) => f.filled);

  return {
    filled,
    total,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 100,
    allRequiredFilled,
  };
}
