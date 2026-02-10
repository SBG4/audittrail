# Phase 8: Report Generation - Interactive HTML - Research

**Researched:** 2026-02-10
**Domain:** Self-contained HTML report generation with interactive Plotly charts
**Confidence:** HIGH

## Summary

Phase 8 requires generating a fully self-contained interactive HTML report that works offline when opened by double-clicking from the filesystem. The report must include dashboard statistics, an interactive visual timeline, and Plotly charts with hover/zoom/pan functionality. All CSS, JavaScript (including Plotly.js ~3MB), and fonts must be embedded inline with zero external URLs.

The standard approach uses Plotly Python's `to_html(include_plotlyjs=True, full_html=False)` to generate chart div elements with the Plotly.js library embedded, combined with Jinja2 templates for the overall HTML report structure. Fonts are embedded as base64 data URIs in `@font-face` declarations. The key architectural pattern is: collect report data -> generate Plotly figures -> render Jinja2 template with inlined assets -> verify self-containment.

**Primary recommendation:** Use Plotly Python `to_html()` with `include_plotlyjs=True` for the first chart and `include_plotlyjs=False` for subsequent charts (avoiding duplicate ~3MB embeds), Jinja2 for HTML templating, and base64-encoded system fonts for typography.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| plotly | >=5.18 | Interactive chart generation | Standard for self-contained offline HTML charts |
| jinja2 | >=3.1 | HTML template rendering | De facto Python template engine, already in FastAPI ecosystem |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| base64 (stdlib) | - | Font embedding as data URIs | Always, for font self-containment |
| pathlib (stdlib) | - | File path handling | Template and asset paths |
| json (stdlib) | - | Chart data serialization | Passing data to Plotly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plotly | Chart.js | Chart.js is lighter (~60KB) but lacks Python figure API; would need manual JS data binding |
| Jinja2 | string.Template | Too limited for complex HTML with conditionals and loops |
| System fonts | Google Fonts | Would require downloading and embedding; system fonts (Inter, sans-serif) sufficient |

**Installation:**
```bash
uv add plotly jinja2
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── services/
│   └── html_report.py         # HTML report generation service
├── templates/
│   └── reports/
│       └── html_report.html   # Jinja2 template
├── routers/
│   └── reports.py             # Report generation endpoints
└── schemas/
    └── report.py              # Report request/response schemas
```

### Pattern 1: Chart Generation with Single Plotly.js Embed
**What:** Generate multiple Plotly charts but embed plotly.js only once
**When to use:** Any multi-chart HTML report
**Example:**
```python
import plotly.graph_objects as go

# First chart includes plotly.js
fig1 = go.Figure(...)
chart1_html = fig1.to_html(
    include_plotlyjs=True,
    full_html=False,
    div_id="timeline-chart"
)

# Subsequent charts skip plotly.js (already loaded)
fig2 = go.Figure(...)
chart2_html = fig2.to_html(
    include_plotlyjs=False,
    full_html=False,
    div_id="stats-chart"
)
```

### Pattern 2: Base64 Font Embedding
**What:** Embed fonts as base64 data URIs in CSS @font-face
**When to use:** Self-contained HTML that must work offline
**Example:**
```css
@font-face {
    font-family: 'Inter';
    src: url(data:font/woff2;charset=utf-8;base64,BASE64_ENCODED_FONT_DATA);
    font-weight: 400;
    font-style: normal;
}
```

### Pattern 3: Jinja2 Template with Inlined Assets
**What:** Single HTML file with all assets inlined via Jinja2 template variables
**When to use:** Self-contained report generation
**Example:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>{{ inline_css }}</style>
</head>
<body>
    {{ chart_html | safe }}
    <script>{{ inline_js | safe }}</script>
</body>
</html>
```

### Anti-Patterns to Avoid
- **CDN references:** Never use `include_plotlyjs='cdn'` -- breaks offline requirement
- **External stylesheets:** Never use `<link rel="stylesheet" href="...">` -- breaks self-containment
- **External font loading:** Never use `@import url(...)` for Google Fonts -- requires network

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive charts | Custom D3.js charts | Plotly `to_html()` | Plotly handles all interactivity, hover, zoom, pan out of the box |
| HTML templating | String concatenation | Jinja2 | Escaping, conditionals, loops, template inheritance |
| Chart JSON serialization | Manual JSON building | Plotly figure objects | Plotly handles all data serialization and chart config |

## Common Pitfalls

### Pitfall 1: Duplicate Plotly.js Embedding
**What goes wrong:** Each chart includes the full ~3MB plotly.js, ballooning file size to 9-12MB+
**Why it happens:** Using `include_plotlyjs=True` for every chart
**How to avoid:** Use `include_plotlyjs=True` only for the first chart; use `include_plotlyjs=False` for all subsequent charts
**Warning signs:** HTML file >6MB with only 2-3 charts

### Pitfall 2: External URL Leaks
**What goes wrong:** Report fails to render when opened offline
**Why it happens:** CSS `@import`, font URLs, or CDN references sneak into the template
**How to avoid:** Post-generation verification: scan HTML for `http://`, `https://`, `//` URLs
**Warning signs:** Any `href=` or `src=` pointing to external domains

### Pitfall 3: Template Injection via Jinja2
**What goes wrong:** Special characters in case data break the HTML
**Why it happens:** Using `| safe` filter on user-provided data
**How to avoid:** Only use `| safe` for pre-generated HTML (chart divs); let Jinja2 auto-escape all user data
**Warning signs:** Case titles with `<`, `>`, `&` characters cause rendering issues

### Pitfall 4: Base64 Font Size Bloat
**What goes wrong:** HTML file becomes 10MB+ due to multiple font weights
**Why it happens:** Embedding Regular, Bold, Italic, BoldItalic variants of multiple fonts
**How to avoid:** Use only 2-3 essential font weights (Regular 400, Bold 700); use system font stack as fallback
**Warning signs:** Fonts section >2MB in the HTML output

## Code Examples

### Report Data Collection
```python
async def collect_report_data(case_id: uuid.UUID, db: AsyncSession) -> dict:
    """Collect all data needed for HTML report generation."""
    case = await db.execute(
        select(Case).options(
            selectinload(Case.audit_type),
            selectinload(Case.assigned_to),
            selectinload(Case.created_by),
        ).where(Case.id == case_id)
    )
    case = case.scalar_one()

    events = await db.execute(
        select(Event).where(Event.case_id == case_id)
        .options(selectinload(Event.file_batches))
        .order_by(Event.event_date, Event.event_time.nulls_last())
    )
    events = events.scalars().all()

    return {
        "case": case,
        "events": events,
        "stats": compute_dashboard_stats(case, events),
    }
```

### Self-Containment Verification
```python
import re

def verify_self_contained(html: str) -> list[str]:
    """Verify HTML has no external URL references."""
    violations = []
    patterns = [
        (r'https?://', 'External HTTP URL found'),
        (r'src=["\'](?!data:)', 'External src attribute'),
        (r'href=["\'](?!#|data:)', 'External href attribute'),
        (r'@import\s+url', 'CSS @import found'),
    ]
    for pattern, message in patterns:
        matches = re.findall(pattern, html)
        if matches:
            violations.append(f"{message}: {len(matches)} occurrences")
    return violations
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| plotly.offline.plot() | fig.to_html() / fig.write_html() | Plotly 4.x+ | Cleaner API, better control |
| Manual HTML string building | Jinja2 templates | Always better | Maintainable, safe escaping |

## Open Questions

1. **Font choice for airgapped environment**
   - What we know: System fonts (sans-serif) work universally; Inter is popular but needs embedding
   - What's unclear: Whether to embed a specific font or rely on system font stack
   - Recommendation: Use system font stack (system-ui, -apple-system, sans-serif) to avoid font embedding bloat; keeps file ~3MB (just Plotly.js) instead of ~5MB

## Sources

### Primary (HIGH confidence)
- plotly.com/python/interactive-html-export/ - Official Plotly Python HTML export docs
- plotly.com/python-api-reference/generated/plotly.io.to_html.html - Official to_html API reference
- Jinja2 documentation - Template engine usage

### Secondary (MEDIUM confidence)
- patdavid.net - Base64 font embedding patterns
- Various Medium articles on self-contained HTML with Plotly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Plotly and Jinja2 are well-documented, widely used
- Architecture: HIGH - Pattern is straightforward (collect data -> generate charts -> render template)
- Pitfalls: HIGH - Well-known issues with duplicate JS embedding and external URL leaks

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (stable domain, slow-moving)
