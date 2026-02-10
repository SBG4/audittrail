# 05-03 Summary: Column mapping wizard UI

**Status:** Complete
**Duration:** ~5 min

## What was built

- **TypeScript types** (`client/src/types/import.ts`): Types for all import flow responses/requests
- **Import hooks** (`client/src/hooks/useImport.ts`): TanStack Query mutations for upload, validate, and confirm
- **FileUpload component** (`client/src/components/import/FileUpload.tsx`): Drag-and-drop file upload with validation
- **ColumnMapper component** (`client/src/components/import/ColumnMapper.tsx`): Dropdown-based column-to-field mapping with data preview
- **ImportSummary component** (`client/src/components/import/ImportSummary.tsx`): Validation results table with stats and confirm button
- **ImportPage** (`client/src/pages/ImportPage.tsx`): Multi-step wizard (upload -> map -> review -> done)
- **API upload helper** (`client/src/lib/api.ts`): Added `upload()` method for FormData/multipart uploads
- **Import button** on TimelineView: "Import" button next to "Add Event"
- **Route**: `/cases/:id/import` added to App.tsx

## Key decisions

- Column mapping uses dropdown selects (not drag-and-drop) for simplicity
- Step indicator shows current progress (1/2/3)
- Mapped columns are highlighted in the data preview table
- Event Date is required before validation can proceed (enforced in UI)
- Success page shows created count and navigates back to timeline

## Files created/modified

- `client/src/types/import.ts` (created)
- `client/src/hooks/useImport.ts` (created)
- `client/src/components/import/FileUpload.tsx` (created)
- `client/src/components/import/ColumnMapper.tsx` (created)
- `client/src/components/import/ImportSummary.tsx` (created)
- `client/src/pages/ImportPage.tsx` (created)
- `client/src/lib/api.ts` (modified - added upload method)
- `client/src/App.tsx` (modified - added import route)
- `client/src/components/timeline/TimelineView.tsx` (modified - added Import button)
