# 07-05 Summary: Report Generation UI

**Status:** Complete
**Duration:** ~4min

## What Was Built

### Report Types (client/src/types/report.ts)
- `ReportFormat` type: "pdf" | "docx"
- `ReportMode` type: "timeline" | "narrative"
- `ReportRequest` interface with format and mode fields

### Report Hooks (client/src/hooks/useReports.ts)
- Refactored to extract shared `downloadBlob()` helper function for blob downloads with auth
- `useDownloadHtmlReport(caseId)` -- preserved existing HTML report hook, now uses shared downloadBlob
- `useGenerateReport(caseId)` -- new TanStack Query mutation hook:
  - Takes `{ format, mode }` as mutation params
  - Builds URL: `/api/cases/{id}/reports/generate?format={format}&mode={mode}`
  - Uses downloadBlob for authenticated file download with browser save dialog
  - Extracts filename from Content-Disposition header

### Report Dialog (client/src/components/reports/ReportDialog.tsx)
- Props: caseId, caseNumber, open, onOpenChange
- Format selection: two buttons side-by-side (PDF, DOCX) with FileText icons
- Mode selection: two stacked buttons with title + description:
  - "Quick Timeline" -- "Case summary with chronological events"
  - "Detailed Narrative" -- "Findings, conclusions, and recommendations"
- Generate & Download button with loading state
- Error message display on generation failure
- Dialog closes on successful generation

### CaseDetailPage Integration (client/src/pages/CaseDetailPage.tsx)
- Added `reportDialogOpen` state
- Added "Generate Report" button in header next to Review button (with FileText icon)
- Updated Reports tab to include:
  - "PDF & DOCX Reports" section with "Generate PDF / DOCX Report" button
  - "Interactive HTML Report" section (preserved existing HTML report functionality)
- ReportDialog component rendered with case context

## Decisions
- Used TanStack Query `useMutation` for the PDF/DOCX hook (consistent with other mutation patterns)
- Extracted shared `downloadBlob` helper from the existing HTML download to avoid code duplication
- Two entry points for report generation: header button (quick access) and Reports tab button (discoverable)
- Dialog-based format/mode selection rather than inline dropdowns for cleaner UX

## Files Created/Modified
- `client/src/types/report.ts` -- new: report types
- `client/src/hooks/useReports.ts` -- updated: added useGenerateReport, refactored shared downloadBlob
- `client/src/components/reports/ReportDialog.tsx` -- new: format/mode selection dialog
- `client/src/pages/CaseDetailPage.tsx` -- updated: added report dialog and header button
