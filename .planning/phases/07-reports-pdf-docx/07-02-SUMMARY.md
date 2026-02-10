# 07-02 Summary: Jinja2 Report Templates

**Status:** Complete
**Duration:** ~3min

## What Was Built

### Base Template (server/src/templates/reports/base.html)
- Full HTML document with embedded CSS (no external dependencies)
- @page CSS rules for A4 size, 2cm margins, page numbers, header
- @page :first suppresses header/footer on cover page
- Professional typography: Georgia (serif) for body, Arial (sans-serif) for headings
- Table styles: collapsed borders, alternating row colors, dark header (#2c3e50)
- Event type badges: finding (red), action (blue), note (gray)
- Metadata table: 2-column key-value layout with bold labels
- Stats grid: flexbox stat boxes for key metrics
- Numbered items with color-coded left borders for findings/actions/notes
- Page break controls: .new-page, .no-break, avoid breaks inside table rows
- Jinja2 blocks: {% block title %}, {% block content %}

### Timeline Template (server/src/templates/reports/timeline.html)
- Extends base.html
- Cover page with title, subtitle ("Quick Timeline"), case info, date
- Case Summary section with full metadata table (case fields + custom metadata)
- Description section (conditional)
- Timeline Events table with columns: Date, Time, Type, File Name, Count, Description, File Type
- File batches rendered as sub-rows below parent events
- Empty state handling with placeholder text
- Generation footer

### Narrative Template (server/src/templates/reports/narrative.html)
- Extends base.html
- Cover page with "Detailed Narrative" subtitle
- Executive Summary with auto-generated text from stats (event count, date range, file count)
- Key metrics stat boxes (total events, findings, actions, notes, total files)
- Case Details metadata table (same as timeline)
- Findings section: filtered events with event_type == "finding", numbered items with file details
- Actions Taken section: filtered event_type == "action"
- Supporting Notes section: filtered event_type == "note"
- Complete Timeline table (all events, same format as timeline mode)
- Conclusions placeholder: "[Add conclusions here]"
- Recommendations placeholder: "[Add recommendations here]"
- Generation footer

## Decisions
- Used Jinja2 list append trick (`{% if list.append(item) %}{% endif %}`) for filtering events by type in narrative template
- All CSS embedded in base.html (no external files) for WeasyPrint compatibility
- Cover page uses page-break-after: always to separate from content
- Event type badges use colored inline spans matching the app's visual language

## Files Created
- `server/src/templates/reports/base.html`
- `server/src/templates/reports/timeline.html`
- `server/src/templates/reports/narrative.html`
