export interface JsonSchemaProperty {
  type: string;
  title: string;
  format?: string;
  enum?: string[];
}

export interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

export interface AuditType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  schema: JsonSchema;
  is_active: boolean;
  created_at: string;
}

export interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
}

export interface Case {
  id: string;
  case_number: number;
  title: string;
  description: string | null;
  audit_type_id: string;
  audit_type: AuditType | null;
  metadata: Record<string, unknown>;
  status: "open" | "active" | "closed";
  assigned_to_id: string | null;
  assigned_to: UserInfo | null;
  created_by_id: string;
  created_by: UserInfo | null;
  created_at: string;
  updated_at: string;
}

export interface CaseListResponse {
  items: Case[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateCaseRequest {
  title: string;
  audit_type_id: string;
  description?: string;
  metadata: Record<string, unknown>;
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status?: string;
  assigned_to_id?: string | null;
}

export interface CaseFilters {
  status?: string;
  audit_type_id?: string;
  assigned_to_id?: string;
  search?: string;
  offset?: number;
  limit?: number;
}
