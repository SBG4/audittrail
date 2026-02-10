export type ReportFormat = "pdf" | "docx";
export type ReportMode = "timeline" | "narrative";

export interface ReportRequest {
  format: ReportFormat;
  mode: ReportMode;
}
