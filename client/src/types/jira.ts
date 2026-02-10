export interface JiraScrapeRequest {
  url: string;
  timeout_ms?: number;
}

export interface JiraScrapeResponse {
  url: string;
  fields: Record<string, string>;
  raw_fields: Record<string, string>;
  error: string | null;
  success: boolean;
}

export interface JiraFieldMapping {
  id: string;
  audit_type_id: string;
  jira_field_name: string;
  case_metadata_key: string;
}

export interface JiraFieldMappingCreate {
  jira_field_name: string;
  case_metadata_key: string;
}
