export interface FileBatch {
  id: string;
  event_id: string;
  label: string;
  file_count: number;
  description: string | null;
  file_types: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFileBatchRequest {
  label: string;
  file_count: number;
  description?: string;
  file_types?: string;
  sort_order?: number;
}

export interface UpdateFileBatchRequest {
  label?: string;
  file_count?: number;
  description?: string;
  file_types?: string;
  sort_order?: number;
}
