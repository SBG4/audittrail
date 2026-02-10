export interface ImportUploadResponse {
  session_id: string;
  filename: string;
  headers: string[];
  row_count: number;
  preview_rows: (string | number | null)[][];
}

export interface ColumnMappingRequest {
  session_id: string;
  mappings: Record<string, string>;
}

export interface ImportValidationRow {
  row_number: number;
  valid: boolean;
  errors: string[];
  data: Record<string, unknown>;
}

export interface ImportValidationResponse {
  session_id: string;
  total_rows: number;
  valid_count: number;
  error_count: number;
  rows: ImportValidationRow[];
}

export interface ImportConfirmRequest {
  session_id: string;
}

export interface ImportConfirmResponse {
  created_count: number;
  error_count: number;
  errors: string[];
}
