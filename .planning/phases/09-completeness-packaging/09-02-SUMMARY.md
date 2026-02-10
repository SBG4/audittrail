# 09-02 Summary: Pre-report Case Review Screen

**Status:** Complete
**Duration:** ~5 min

## What was built

1. **CaseReviewPage** (`client/src/pages/CaseReviewPage.tsx`):
   - Overall completeness score with progress bar (green/amber/red)
   - Case Details section: shows each field as filled (green check) or missing (amber warning)
   - Timeline Events section: per-event completeness with collapsible sub-sections
   - File Batches section: per-event batch presence check + per-batch field completeness
   - Summary bar: "Ready for report" or "Review needed" with field counts
   - Back to Case button

2. **Route added** at `/cases/:id/review` in App.tsx

3. **Review button** on CaseDetailPage header showing "Review (X%)" with ClipboardCheck icon

## Decisions
- Sections auto-expand when they contain missing fields, collapsed when complete
- Progress bar uses 3-tier coloring: green >= 80%, amber 50-79%, red < 50%
- No file batches on an event shows amber warning (but is not a hard "required" field)
- Uses existing useCase and useEvents hooks -- no new API calls

## Files Modified
- `client/src/pages/CaseReviewPage.tsx` (new)
- `client/src/App.tsx` (route added)
- `client/src/pages/CaseDetailPage.tsx` (review button added)
