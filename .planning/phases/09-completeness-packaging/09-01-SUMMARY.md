# 09-01 Summary: Missing Field Indicators

**Status:** Complete
**Duration:** ~5 min

## What was built

1. **Completeness utility module** (`client/src/lib/completeness.ts`):
   - `isEmpty(value)` -- single source of truth for empty checks (null/undefined/"" are empty; 0 is NOT)
   - `FieldStatus` interface for field-level completeness
   - `getCaseCompleteness(case_)` -- checks title, description, assignee + all schema metadata fields
   - `getEventCompleteness(event)` -- checks event_date (required), event_time, file_name, file_count, file_description, file_type
   - `getFileBatchCompleteness(batch)` -- checks label, file_count, description, file_types
   - `getCompletenessScore(fields)` -- calculates filled/total/percentage/allRequiredFilled

2. **InlineField amber indicators** -- empty fields show amber bg-amber-50 border-amber-200 with dark mode support

3. **CaseMetadata amber indicators** -- empty metadata values show "Missing" with amber styling instead of muted "Not set"

4. **CaseList completeness badges** -- each row shows completion percentage badge (amber <100%, green at 100%)

## Decisions
- Used amber color scale (not red/destructive) for missing fields -- conveys "attention" not "error"
- Zero values treated as filled (0 is valid for file_count)
- Completeness utility is reusable for 09-02 review page

## Files Modified
- `client/src/lib/completeness.ts` (new)
- `client/src/components/timeline/InlineField.tsx`
- `client/src/components/cases/CaseMetadata.tsx`
- `client/src/components/cases/CaseList.tsx`
