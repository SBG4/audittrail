# Plan 04-02 Summary: File Batch UI Components

## Status: COMPLETE

## What Was Built

### Task 1: TypeScript types and TanStack Query hooks
- **TypeScript types** (`client/src/types/file-batch.ts`): FileBatch, CreateFileBatchRequest, UpdateFileBatchRequest interfaces
- **TanStack Query hooks** (`client/src/hooks/useFileBatches.ts`): useFileBatches (list), useCreateFileBatch, useUpdateFileBatch, useDeleteFileBatch with cache invalidation of both file-batches and events query keys
- **TimelineEvent type updated** (`client/src/types/event.ts`): Added `file_batches: FileBatch[]` field to TimelineEvent interface

### Task 2: BatchList and BatchForm components
- **BatchList** (`client/src/components/batches/BatchList.tsx`):
  - Displays each batch as compact row: Package icon + bold label + file count badge + file types + description
  - Inline edit (pencil) and delete (trash with confirmation) buttons appear on hover
  - Empty state: "No file batches. Add one to track file evidence."
  - "Add batch" button opens inline create form
- **BatchForm** (`client/src/components/batches/BatchForm.tsx`):
  - Create mode (no batch prop) and edit mode (batch prop provided)
  - Fields: label (required), file_count (required, min 0), file_types (optional), description (optional)
  - Uses shadcn/ui Input, Textarea, Button, Label components
  - Calls useCreateFileBatch or useUpdateFileBatch depending on mode
  - Error display from mutation failures
  - Cancel button dismisses form

## Key Decisions
- Batches come embedded in event responses (via server relationship), not from separate hook fetch
- BatchList receives batches as props from parent (event display component)
- Delete uses window.confirm for simplicity consistent with event deletion pattern
- Form is compact single-column layout for inline display within timeline events

## Files Modified
- `client/src/types/file-batch.ts` (new)
- `client/src/types/event.ts` (modified)
- `client/src/hooks/useFileBatches.ts` (new)
- `client/src/components/batches/BatchList.tsx` (new)
- `client/src/components/batches/BatchForm.tsx` (new)
