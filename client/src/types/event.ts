import type { UserInfo } from "./case";
import type { FileBatch } from "./file-batch";

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_type: "finding" | "action" | "note";
  event_date: string;
  event_time: string | null;
  file_name: string | null;
  file_count: number | null;
  file_description: string | null;
  file_type: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_by_id: string;
  created_by: UserInfo | null;
  file_batches: FileBatch[];
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  event_type?: string;
  event_date: string;
  event_time?: string | null;
  file_name?: string | null;
  file_count?: number | null;
  file_description?: string | null;
  file_type?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateEventRequest {
  event_type?: string;
  event_date?: string;
  event_time?: string | null;
  file_name?: string | null;
  file_count?: number | null;
  file_description?: string | null;
  file_type?: string | null;
  metadata?: Record<string, unknown>;
}

export interface EventListResponse {
  items: TimelineEvent[];
  total: number;
}
