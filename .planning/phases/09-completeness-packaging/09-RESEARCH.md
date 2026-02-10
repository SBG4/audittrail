# Phase 9: Data Completeness & Deployment Packaging - Research

**Researched:** 2026-02-10
**Domain:** UI completeness indicators, case review workflows, Docker airgap packaging
**Confidence:** HIGH

## Summary

Phase 9 covers two distinct domains: (1) data completeness UI features that help auditors identify missing fields and review cases before report generation, and (2) airgap deployment packaging that bundles the entire application for USB transfer to isolated networks.

The completeness indicators are purely client-side -- we analyze existing case/event data structures to detect empty fields and render visual amber/yellow highlights. No new backend APIs are needed since the frontend already has all the data via existing endpoints. The pre-report review screen aggregates completeness checks across the entire case (metadata, events, file batches) into a checklist view.

The airgap packaging uses standard Docker tooling (`docker save`, `docker load`) with SHA256 checksums and a self-contained bash load script. This is a well-established pattern for air-gapped Docker deployments.

**Primary recommendation:** Implement completeness checks as pure client-side utility functions that evaluate Case + Event data against the audit type schema. Use Tailwind amber color classes for visual indicators. Package Docker images with a single `package.sh` script that outputs a versioned tarball with embedded load instructions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | existing | UI rendering | Already in project |
| Tailwind CSS | existing | Styling (amber-200/amber-500 for indicators) | Already in project, has semantic color classes |
| shadcn/ui | existing | UI components (Badge, Card, Progress) | Already in project |
| Docker CLI | any | `docker save` / `docker load` for image packaging | Standard Docker toolchain |
| sha256sum | system | Checksum generation for integrity verification | Available on all Linux systems |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons (AlertTriangle, CheckCircle, CircleDot) | Completeness indicators |
| TanStack Query | existing | Data fetching hooks for review screen | Already used throughout app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side completeness | Server-side API | Unnecessary complexity -- client already has all data |
| Amber highlight | Red/destructive | Amber conveys "warning/attention" not "error" -- appropriate for missing optional data |
| docker save tarballs | Docker registry | Registry requires network -- defeats airgap purpose |

## Architecture Patterns

### Missing Field Detection Pattern
**What:** A utility function that inspects a Case object and its audit type schema to determine which fields are empty/missing
**When to use:** Everywhere a case or event field is displayed
**Example:**
```typescript
// Completeness utility
interface FieldStatus {
  field: string;
  label: string;
  filled: boolean;
  required: boolean;
}

function getCaseCompleteness(case_: Case): FieldStatus[] {
  const fields: FieldStatus[] = [
    { field: "title", label: "Title", filled: !!case_.title, required: true },
    { field: "description", label: "Description", filled: !!case_.description, required: false },
    { field: "assigned_to_id", label: "Assignee", filled: !!case_.assigned_to_id, required: false },
  ];

  // Check schema-defined metadata fields
  if (case_.audit_type?.schema) {
    const schema = case_.audit_type.schema;
    const required = new Set(schema.required ?? []);
    for (const [key, prop] of Object.entries(schema.properties)) {
      const value = case_.metadata[key];
      fields.push({
        field: `metadata.${key}`,
        label: prop.title || key,
        filled: value != null && value !== "",
        required: required.has(key),
      });
    }
  }
  return fields;
}
```

### Amber Empty-Field Indicator Pattern
**What:** Tailwind classes applied conditionally when a field value is empty/null
**When to use:** InlineField, CaseMetadata, TimelineRow, BatchList
**Example:**
```typescript
// In display mode, wrap empty values with amber indicator
const isEmpty = value == null || value === "";
<span className={cn(
  "inline-block rounded px-2 py-1",
  isEmpty && "bg-amber-50 border border-amber-200 text-amber-600"
)}>
  {isEmpty ? "Missing" : String(value)}
</span>
```

### Docker Airgap Packaging Pattern
**What:** Shell scripts that use `docker save` to export images as tarballs, generate checksums, and create a self-contained load script
**When to use:** For deploying to networks with no internet access
**Example:**
```bash
#!/bin/bash
# package.sh - Create airgap deployment package
VERSION=$(date +%Y%m%d)
OUTDIR="audittrail-${VERSION}"
mkdir -p "$OUTDIR"

# Save all images
docker compose build
docker save $(docker compose config --images) | gzip > "$OUTDIR/images.tar.gz"

# Copy compose file and env template
cp docker-compose.yml "$OUTDIR/"
cp .env.example "$OUTDIR/.env"

# Generate checksums
cd "$OUTDIR" && sha256sum * > SHA256SUMS

# Create load script
cat > load.sh << 'LOAD_EOF'
#!/bin/bash
set -e
echo "Loading Docker images..."
docker load < images.tar.gz
echo "Starting application..."
docker compose up -d
echo "Application ready at http://localhost"
LOAD_EOF
chmod +x load.sh
```

### Anti-Patterns to Avoid
- **Checking completeness on the server for display purposes:** The client already has all data -- adding a /completeness endpoint creates unnecessary coupling
- **Using red/destructive colors for missing optional fields:** Amber/yellow conveys "attention needed" without implying error
- **Hardcoding field names in completeness checks:** Always derive from the audit type schema so new audit types automatically get completeness checking

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker image export | Custom image serialization | `docker save` / `docker load` | Standard Docker tooling, handles layers correctly |
| Checksum verification | Custom hash implementation | `sha256sum` / `shasum -a 256` | System utility, universally available |
| Tarball creation | Custom archive format | `tar` with gzip | Standard, every Linux has it |
| Progress indicators | Custom progress bar | Tailwind width classes + aria | Simple percentage bar with accessibility |

**Key insight:** The completeness feature is fundamentally a data inspection pattern -- given existing data shapes, determine what's missing. No new infrastructure needed.

## Common Pitfalls

### Pitfall 1: Inconsistent Empty Value Semantics
**What goes wrong:** Different parts of the app treat null, undefined, "", and 0 differently when determining "empty"
**Why it happens:** JavaScript's falsy values include 0 and "" which may be valid data
**How to avoid:** Create a single `isEmpty(value)` utility that handles all cases consistently: null/undefined/empty-string are empty, 0 is NOT empty (it's a valid file count)
**Warning signs:** file_count of 0 showing as "missing"

### Pitfall 2: Docker Image Names Changing Between Builds
**What goes wrong:** `docker save` needs exact image names/tags; compose-generated names may differ across machines
**Why it happens:** Docker Compose generates image names from project directory name
**How to avoid:** Use `docker compose config --images` to dynamically get image names, or explicitly tag images in docker-compose.yml
**Warning signs:** `docker load` succeeds but `docker compose up` says "image not found"

### Pitfall 3: Checksums Not Matching Across Platforms
**What goes wrong:** sha256sum output format differs between Linux (GNU coreutils) and macOS (BSD shasum)
**Why it happens:** macOS uses `shasum -a 256` while Linux uses `sha256sum`
**How to avoid:** Package script should detect OS and use appropriate command, or use `shasum -a 256` which works on both
**Warning signs:** Checksum verification fails on target machine despite files being intact

### Pitfall 4: Large Docker Images Exceeding USB Capacity
**What goes wrong:** Uncompressed Docker images can be very large
**Why it happens:** Each layer adds up; postgres image alone is ~200MB
**How to avoid:** Use gzip compression (`docker save ... | gzip > images.tar.gz`), and the slim/alpine variants already chosen in docker-compose.yml (postgres:17-slim)
**Warning signs:** Package exceeds 1-2GB

## Code Examples

### Completeness Score Calculation
```typescript
function getCompletenessScore(fields: FieldStatus[]): {
  filled: number;
  total: number;
  percentage: number;
  allRequiredFilled: boolean;
} {
  const filled = fields.filter(f => f.filled).length;
  const total = fields.length;
  const allRequiredFilled = fields.filter(f => f.required).every(f => f.filled);
  return {
    filled,
    total,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 100,
    allRequiredFilled,
  };
}
```

### Event Completeness Check
```typescript
function getEventCompleteness(event: TimelineEvent): FieldStatus[] {
  return [
    { field: "event_date", label: "Date", filled: !!event.event_date, required: true },
    { field: "event_time", label: "Time", filled: !!event.event_time, required: false },
    { field: "file_name", label: "File Name", filled: !!event.file_name, required: false },
    { field: "file_count", label: "File Count", filled: event.file_count != null, required: false },
    { field: "file_description", label: "Description", filled: !!event.file_description, required: false },
    { field: "file_type", label: "File Type", filled: !!event.file_type, required: false },
  ];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| docker export (container) | docker save (image) | Always | save preserves layers and tags; export flattens |
| Manual image list | docker compose config --images | Docker Compose v2 | Automatically gets correct image names |
| Uncompressed tarballs | Piped gzip compression | Standard practice | 50-70% size reduction |

## Open Questions

1. **Exact amber color values for dark mode compatibility**
   - What we know: Tailwind amber-50/amber-200/amber-500/amber-600 work well in light mode
   - What's unclear: Dark mode variants need testing
   - Recommendation: Use amber-50 bg + amber-200 border in light, amber-900/20 bg + amber-700 border in dark

## Sources

### Primary (HIGH confidence)
- Docker CLI documentation - `docker save` / `docker load` commands
- Tailwind CSS color palette - amber color scale
- Existing codebase analysis - Case, Event, FileBatch type definitions and existing UI patterns

### Secondary (MEDIUM confidence)
- Airgap deployment patterns for Docker Compose applications
- SHA256 checksum verification patterns across Linux/macOS

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already in project or standard system utilities
- Architecture: HIGH - patterns derived directly from existing codebase analysis
- Pitfalls: HIGH - well-known Docker packaging issues and JS empty-value semantics

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain)
