# Pitfalls Research

**Domain:** Audit case management tool on airgapped networks (USB/email usage tracking)
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH (combination of verified documentation and domain-specific experience patterns)

## Critical Pitfalls

### Pitfall 1: Airgap Dependency Leakage

**What goes wrong:**
The application silently depends on network-accessible resources that only surface as failures on the airgapped target. CDN-hosted fonts (Google Fonts, Font Awesome), npm postinstall scripts that download binaries (e.g., Puppeteer downloading Chromium, sharp downloading libvips), and CSS/JS referencing external URLs all break silently -- the app loads but renders incorrectly with missing icons, fallback fonts, or broken PDF generation.

**Why it happens:**
Development occurs on an internet-connected machine. Dependencies that phone home during install or runtime work fine in dev but fail on the target. Developers never test with `--network none`. Font and icon references sneak in through transitive dependencies and UI component libraries.

**How to avoid:**
- Run `docker build --network none` and `docker run --network none` as a CI gate from Phase 1. If it breaks with no network, it will break on the airgap.
- Audit every npm dependency for postinstall scripts (`npm ls --all | grep postinstall`). Pre-download all binaries and vendor them into the Docker image.
- Self-host all fonts and icons. Copy font files into the project, never use `@import url('https://...')` or CDN `<link>` tags. Use a CSP header that blocks external requests as a safety net.
- Vendor the Chromium binary for Puppeteer inside the Docker image (set `PUPPETEER_SKIP_DOWNLOAD=true` and install Chromium via apt).

**Warning signs:**
- Any `https://` URL in CSS, HTML templates, or JS bundles
- `postinstall` scripts in `package.json` of any dependency
- Font rendering differences between dev and Docker environments
- PDF generation works locally but produces blank/broken output in Docker

**Phase to address:**
Phase 1 (project scaffolding). The `--network none` gate must be established before any feature work begins. Every subsequent phase inherits it.

---

### Pitfall 2: Self-Contained HTML Reports That Are Not Actually Self-Contained

**What goes wrong:**
HTML reports appear self-contained during development (all resources load from localhost) but fail when opened as standalone files on another machine. Common failures: images referenced as relative paths instead of base64 data URIs, CSS `url()` references to font files, JavaScript `fetch()` calls to API endpoints for data, and SVG charts that reference external sprite sheets.

**Why it happens:**
Developers test reports by serving them from the app server, where relative paths resolve correctly. They never test by double-clicking the `.html` file from a file manager. Base64 encoding images is an afterthought, not a build step.

**How to avoid:**
- Build a report rendering pipeline that has an explicit "inline all assets" step: CSS inlined into `<style>` tags, JS inlined into `<script>` tags, images converted to base64 data URIs, fonts subset and embedded as base64 `@font-face` with `woff2` format.
- Set a file size budget. Base64 encoding inflates file size by ~33%. A report with 20 screenshots at 500KB each produces a 13MB+ HTML file that is slow to open. Compress and resize images before embedding. Target max 5MB per report.
- Automated test: generate a report, strip all network access (open in a browser with `--disable-web-security --disable-features=NetworkService`), and verify rendering matches expectations.
- Include all chart data as inline JSON, not API calls. Render charts to inline SVG, not canvas with external data fetches.

**Warning signs:**
- Reports render in the app but show broken images/fonts when saved and reopened
- Report HTML files reference localhost or relative paths
- Report file sizes are either suspiciously small (missing assets) or enormous (uncompressed base64)
- Any `<link rel="stylesheet" href="...">` or `<script src="...">` tags in report templates

**Phase to address:**
Phase where report generation is implemented. Build the inlining pipeline as the FIRST step, not as a polish step at the end.

---

### Pitfall 3: Puppeteer/Chromium Fails Inside Docker on Airgapped Deployment

**What goes wrong:**
PDF generation via Puppeteer works on the developer's Mac but crashes inside Docker. Chromium requires ~25 system-level shared libraries (libx11, libnss3, libatk, etc.) that are not present in slim/Alpine base images. Additionally, the default Docker `/dev/shm` is 64MB, which is too small for Chromium rendering large pages, causing OOM crashes. Font rendering produces squares or tofu characters because CJK/multilingual fonts are missing.

**Why it happens:**
Puppeteer's npm install downloads a compatible Chromium, but this Chromium binary depends on OS-level libraries that vary by distro. Alpine Linux does not support Chromium natively. Developers on macOS never encounter these missing libraries.

**How to avoid:**
- Use a Debian-based image (not Alpine) for the PDF generation service.
- Install Chromium via `apt-get install chromium` in the Dockerfile rather than letting Puppeteer download it. Set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- Set `--shm-size=512m` in `docker-compose.yml` or use `--disable-dev-shm-usage` launch flag.
- Install font packages: `fonts-liberation`, `fonts-noto-cjk`, `fonts-freefont-ttf` for broad character support.
- Launch Chromium with sandbox flags: `--no-sandbox --disable-setuid-sandbox --disable-gpu --disable-dev-shm-usage`.
- Limit concurrency: queue PDF generation requests and process at most `(CPU cores - 1)` concurrently.

**Warning signs:**
- `Error: Failed to launch the browser process` in logs
- PDF files are 0 bytes or contain blank pages
- Square/tofu characters in generated PDFs
- Container OOM kills during PDF generation
- Works with `docker run` but fails with `docker compose` (different shm defaults)

**Phase to address:**
Same phase as PDF generation. Solve Docker+Chromium compatibility BEFORE building report templates. Create a "hello world" PDF generation test as the first deliverable of that phase.

---

### Pitfall 4: PostgreSQL Data Loss on Container Recreation

**What goes wrong:**
Database data disappears when running `docker compose down && docker compose up`. The PostgreSQL official Docker image declares a volume at `/var/lib/postgresql/data`. If the compose file mounts a volume at `/var/lib/postgresql` (without the `/data` suffix) or uses no volume at all, an anonymous volume is created. Anonymous volumes are not reused across container recreations. Months of audit case data vanish.

**Why it happens:**
The distinction between `/var/lib/postgresql` and `/var/lib/postgresql/data` is subtle and poorly documented. Copy-pasted docker-compose examples often get it wrong. Developers who always use `docker compose stop/start` (not `down/up`) never see the issue because containers are not removed.

**How to avoid:**
- Use a named volume mounted specifically at `/var/lib/postgresql/data`:
  ```yaml
  volumes:
    postgres_data:
  services:
    db:
      volumes:
        - postgres_data:/var/lib/postgresql/data
  ```
- Include a backup script (pg_dump) in the deployment package. Run it on a cron-like schedule or before every `docker compose down`.
- Document the difference between `stop` and `down` for operators. `down` removes containers (and anonymous volumes with `-v`). `stop` preserves them.
- Test the upgrade path: `docker compose down && docker compose up` must preserve data. Automate this as a smoke test.

**Warning signs:**
- Volume mount path does not end in `/data`
- Using bind mounts instead of named volumes (permission issues on Linux)
- No backup strategy documented
- Operators using `docker compose down -v` (the `-v` flag removes named volumes)

**Phase to address:**
Phase 1 (infrastructure setup). Data persistence must be verified before storing any real case data.

---

### Pitfall 5: Schema-Driven Forms That Cannot Evolve

**What goes wrong:**
The form schema is designed for the initial set of audit case types (USB usage, email usage) but cannot accommodate new case types or field changes without code modifications. Schemas are tightly coupled to database columns, so adding a new field requires a migration, a schema update, a UI change, and a validation update -- four coordinated changes instead of one.

**Why it happens:**
Developers model the schema as a TypeScript interface that mirrors the database table. Each field has a dedicated column. This works for two case types but breaks when users want to add a "physical access" case type with different fields, or when an auditor needs a custom field for a specific investigation.

**How to avoid:**
- Separate the form schema (what the UI renders) from the storage schema (how data is persisted). Store dynamic form data in a JSONB column in PostgreSQL, with the form schema stored as a JSON document that defines fields, types, validation rules, and layout.
- Version schemas: each case type has a schema version. Old cases render with their original schema; new cases use the latest. Never mutate a published schema -- create a new version.
- Validate on both client and server using the same schema definition (e.g., JSON Schema with ajv on the server and ajv on the client).
- Keep a small set of "core" typed columns (case_id, status, created_at, assigned_to) in the relational schema. Everything case-type-specific goes into JSONB.

**Warning signs:**
- Database migration required every time a form field changes
- Form field definitions scattered across UI components instead of centralized
- Validation logic duplicated between frontend and backend
- No versioning on form schemas

**Phase to address:**
Phase where the data model and forms are designed. This is an architectural decision that is extremely expensive to change later.

---

### Pitfall 6: Docker Image Transfer Breaks on Airgapped Deployment

**What goes wrong:**
Docker images built on the development machine fail to load on the airgapped target. Common causes: architecture mismatch (built on ARM Mac, deployed to x86 Linux), incomplete image saves (multi-stage builds produce intermediate images that `docker save` misses), and corrupt tar files from USB transfer. The operator has no way to troubleshoot because there is no internet access to pull missing layers.

**Why it happens:**
Developers use Apple Silicon Macs (ARM64) but deploy to x86_64 Linux servers. `docker build` defaults to the host architecture. `docker save` with a single image name may miss dependent images. Large tar files (2GB+) can corrupt during USB transfer without checksum verification.

**How to avoid:**
- Always build with `--platform linux/amd64` explicitly in the build command and in `docker-compose.yml`.
- Create a deployment script that: (1) builds all images, (2) runs `docker save` for every image referenced in `docker-compose.yml`, (3) generates SHA256 checksums, (4) packages everything into a single tarball with the compose file, env templates, and a load script.
- The load script on the target should: (1) verify checksums, (2) `docker load` each image, (3) verify all images are present with correct tags before starting.
- Include `docker-compose.yml`, `.env.example`, and operator instructions in the tarball. The airgapped operator should not need to edit YAML.
- Test the full transfer cycle: build, save, copy to USB, load on a clean VM with no internet, start, verify.

**Warning signs:**
- No `--platform` flag in build commands or Dockerfile
- No checksums generated alongside image tarballs
- Deployment tested by `docker compose up` on the same machine that built it
- Tar files larger than the USB drive's filesystem max file size (FAT32: 4GB limit)

**Phase to address:**
Phase 1 (infrastructure). The deployment packaging script should be created alongside the initial docker-compose.yml.

---

### Pitfall 7: Audit Trail Integrity Gaps

**What goes wrong:**
The system records case changes but the audit trail has gaps that undermine its evidentiary value. Missing: who viewed (not just edited) a case, what the previous value was (only new value stored), server-side timestamps vs. client-side timestamps, and bulk operations that record one log entry for 50 changes.

**Why it happens:**
Audit logging is added as an afterthought, implemented with simple INSERT triggers that capture the new row state. View-only access is not logged because "nothing changed." Client-submitted timestamps are trusted without server-side verification. Bulk operations optimize for performance by batching log entries.

**How to avoid:**
- Log at the application layer, not just database triggers. Capture: user, action, timestamp (server UTC), previous value, new value, IP address, session ID.
- Log read access for sensitive cases (who viewed what evidence, when).
- Never trust client timestamps for audit records. Server generates all timestamps.
- Bulk operations must generate individual audit entries per affected record. Performance cost is acceptable for 2-5 users.
- Make the audit log append-only: no UPDATE or DELETE on the audit table. Enforce at the database level with a trigger that raises an exception on UPDATE/DELETE of the audit table.

**Warning signs:**
- Audit table has UPDATE or DELETE permissions granted
- Timestamps in audit log come from `req.body.timestamp` instead of `NOW()`
- No record of who viewed a case, only who edited it
- Bulk operations produce a single audit entry like "updated 47 cases"

**Phase to address:**
Phase where the data model is designed. Audit logging schema must be defined alongside the case schema, not retrofitted.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing files on local Docker filesystem instead of a mounted volume | Simpler setup, no volume config | All uploaded evidence files lost on container recreation | Never |
| Hardcoding case types (USB, Email) instead of making them schema-driven | Faster initial development | Adding a new case type requires code changes and redeployment | Phase 1 prototype only, must refactor before Phase 2 |
| Using client-side timestamps for audit entries | Simpler API, fewer server calls | Audit trail unreliable, timestamps can be spoofed | Never |
| Skipping font subsetting in reports (embedding full font files) | Simpler build pipeline | Report HTML files bloated by 2-5MB per font | MVP only, must optimize before production |
| Single Docker image for app + PDF generation | Simpler compose file | Cannot scale PDF generation independently, Chromium dependencies bloat the app image | Acceptable for 2-5 users, but isolate early if possible |
| Storing uploaded files as BLOBs in PostgreSQL | Simpler backup (one pg_dump gets everything) | Database bloat, slow queries, pg_dump takes minutes instead of seconds | Acceptable for small scale (< 1GB total files) |

## Integration Gotchas

Common mistakes when connecting system components in this domain.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Puppeteer + Docker | Using Alpine base image; Chromium binaries are incompatible | Use Debian-based image, install Chromium via apt, set executable path |
| PostgreSQL + Docker volumes | Mounting at `/var/lib/postgresql` instead of `/var/lib/postgresql/data` | Always use `/var/lib/postgresql/data` with a named volume |
| npm + airgap | Running `npm install` inside Dockerfile without pre-populated cache | Copy `package-lock.json` and pre-downloaded tarballs, use `npm ci --offline` |
| Excel/CSV import + varied formats | Assuming consistent delimiters, encodings, and headers | Detect encoding (BOM sniffing), support multiple delimiters, normalize headers (lowercase, trim, strip special chars) |
| DOCX generation + templates | Building documents programmatically instead of using templates | Use docxtemplater or docx-templates with a `.docx` template file that non-developers can modify in Word |
| Base64 images in HTML reports | Embedding full-resolution screenshots | Resize to max 1200px width and compress to JPEG quality 80 before base64 encoding |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Generating PDFs synchronously in the request handler | API timeouts on complex reports, UI freezes | Queue PDF generation as a background job, return a "generating..." status, poll or notify on completion | Reports with > 10 pages or > 5 embedded images |
| Loading entire case timeline into memory for rendering | Slow page loads, browser tab crashes | Paginate timeline entries, lazy-load attachments, virtualize long lists | Cases with > 500 timeline entries |
| Unbounded Excel import without row limits | Server OOM on large files, blocking the event loop | Stream-parse Excel files (e.g., xlsx-stream-reader), set row limit (10,000), process in chunks | Files > 50,000 rows or > 20MB |
| Storing every form field change as a separate audit entry | Audit table grows to millions of rows, queries slow down | Debounce field-level changes, store per-save snapshots instead of per-keystroke | After 6+ months of usage with active editors |
| Full-text search with SQL LIKE on large text fields | Slow queries as case count grows | Add PostgreSQL full-text search (tsvector/tsquery) or use GIN indexes on JSONB | > 1,000 cases with large text fields |

## Security Mistakes

Domain-specific security issues for an audit case management tool.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No row-level authorization on case data | Any authenticated user can access any case by guessing the ID | Implement case-level access control: check user assignment before returning case data |
| Audit log entries modifiable by app user | Compromised audit trail, evidence tampering | Separate audit log database user with INSERT-only permissions; app DB user cannot UPDATE/DELETE audit rows |
| Uploaded evidence files served without content-type validation | Stored XSS via malicious HTML uploaded as "evidence" | Serve uploads with `Content-Disposition: attachment`, validate MIME types, store outside the web root |
| Exported reports contain internal metadata | Case IDs, internal user IDs, database timestamps leak into reports shared externally | Sanitize report output, use display names not internal IDs, strip HTML comments |
| Plain-text passwords in `.env` file shipped on USB | Credentials exposed on physical media during transport | Generate passwords on first boot, never ship pre-configured credentials on USB media |
| No session timeout | Unattended terminal provides unlimited access to case data | Implement 15-minute idle timeout for sessions, require re-authentication |

## UX Pitfalls

Common user experience mistakes in audit case management tools.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Timeline shows all events with equal visual weight | Critical findings buried among routine log entries | Visually distinguish event types: findings (red), actions (blue), notes (gray). Allow filtering by event type |
| Inline editing on timeline saves immediately without confirmation | Accidental edits to audit records, no undo | Use explicit save/cancel buttons for inline edits. Show "unsaved changes" indicator. Log previous values |
| Schema-driven forms render all fields in a single long scroll | Users overwhelmed, skip fields, miss required data | Group fields into collapsible sections. Show progress indicator. Validate per-section, not just on submit |
| Bulk operations have no preview step | Users accidentally modify wrong cases, no way to verify before commit | Show a preview table: "These 12 cases will be updated. Field X will change from A to B." Require confirmation |
| File upload gives no progress feedback | Users re-upload, double-submit, or assume the system is broken | Show upload progress bar, file name, and size. Disable submit until upload completes |
| Report generation shows no progress | Users click "Generate" multiple times, queue fills up, server slows | Show generation status (queued, rendering, complete). Disable button during generation. Show estimated time |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **HTML reports:** Open the exported HTML file by double-clicking from the filesystem (not served from localhost). Verify fonts, images, and charts render correctly with no network access.
- [ ] **PDF generation:** Generate a PDF with a case containing CJK characters, Arabic text, or emoji. Verify they render (not tofu squares).
- [ ] **Docker deployment:** Run `docker compose down && docker compose up -d` and verify all case data and uploaded files survive the recreation.
- [ ] **Excel import:** Import a CSV saved from Excel on Windows (CP1252 encoding, BOM, CRLF line endings), from macOS (UTF-8, no BOM, LF), and from a European locale (semicolon delimiter, comma decimal separator).
- [ ] **Timeline inline editing:** Edit a field, navigate away without saving, come back. Verify changes were not silently lost or silently saved.
- [ ] **Schema-driven forms:** Add a new case type schema. Verify existing cases of old types still render and validate correctly with no code changes.
- [ ] **Audit trail:** View audit log for a case. Verify it shows who changed what, when, with previous and new values (not just "case updated").
- [ ] **Offline Docker images:** Build on Mac ARM, transfer to x86 Linux VM via USB, `docker load`, `docker compose up`. Verify everything starts.
- [ ] **Report with many images:** Generate a report for a case with 20+ screenshots. Verify the HTML file opens in under 5 seconds and is under 10MB.
- [ ] **Bulk operations:** Perform a bulk status change on 10 cases. Verify 10 individual audit trail entries exist, not one summary entry.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Data loss from missing Docker volume | HIGH | If no backup: data is gone. Prevention is the only strategy. If pg_dump backup exists: restore from backup, accept data loss since last backup. |
| CDN/external dependency found on airgap | LOW | Identify the resource, download it, vendor it into the project, update references, rebuild image |
| Chromium crash in Docker | MEDIUM | Switch to Debian base image, install system dependencies, increase shm-size, retest all report templates |
| Schema-driven forms locked to hardcoded types | HIGH | Migrate existing data to JSONB, build schema versioning system, update all form renderers -- essentially a rewrite of the data layer |
| Audit trail missing previous values | MEDIUM | Add before/after columns to audit table, backfill is impossible (old values are lost), but fix forward for all new changes |
| HTML reports not self-contained | LOW | Build asset inlining pipeline, re-generate existing reports (if templates and data are still available) |
| Architecture mismatch (ARM images on x86) | LOW | Rebuild with `--platform linux/amd64`, re-export, re-transfer. Adds one deployment cycle delay. |
| Excel import fails on encoding | LOW | Add encoding detection library (e.g., chardet/jschardet), add BOM detection, retest with sample files from users |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Airgap dependency leakage | Phase 1: Infrastructure | `docker build/run --network none` passes in CI |
| Docker image transfer breaks | Phase 1: Infrastructure | Full USB transfer cycle tested on clean VM |
| PostgreSQL data loss | Phase 1: Infrastructure | `docker compose down && up` preserves test data |
| Schema-driven forms cannot evolve | Phase 2: Data Model & Forms | New case type added via schema only (no code changes) |
| Audit trail integrity gaps | Phase 2: Data Model & Forms | Audit table has no UPDATE/DELETE permissions; entries include before/after values |
| Self-contained HTML reports broken | Phase 3: Report Generation | Report HTML opens correctly from filesystem with no network |
| Puppeteer crashes in Docker | Phase 3: Report Generation | PDF generation succeeds inside `--network none` Docker container |
| Timeline UX confusion | Phase 4: UI Polish | User testing confirms edit/save/cancel flow is clear |
| Excel import encoding failures | Phase 2 or 3: Data Import | Import tested with Windows CP1252, macOS UTF-8, European semicolon CSV |
| Bulk operations missing audit entries | Phase 4: Bulk Operations | 10 bulk-changed cases produce 10 audit entries |

## Sources

- [Docker Docs: Air-gapped containers](https://docs.docker.com/enterprise/security/hardened-desktop/air-gapped-containers/)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Puppeteer Docker Fix (2026)](https://lakin-mohapatra.medium.com/how-to-fix-puppeteer-docker-issues-3d6bec418287)
- [Docker Offline Deployment](https://github.com/awesome-inc/docker-deploy-offline)
- [Docker Compose Offline Stack Preparation](https://shantanoo-desai.github.io/posts/technology/docker-compose-offline-stack/)
- [Percona: Save and Load Docker Images](https://www.percona.com/blog/how-to-save-and-load-docker-images/)
- [NodeJS on Air Gapped Networks](https://blog.hardill.me.uk/2024/11/04/installing-nodejs-applications-on-air-gapped-networks/)
- [PDF Generation Tips & Gotchas (Joyfill)](https://joyfill.io/blog/integrating-pdf-generation-into-node-js-backends-tips-gotchas)
- [Risingstack: Puppeteer HTML to PDF](https://blog.risingstack.com/pdf-from-html-node-js-puppeteer/)
- [Base64 Performance Anti-Patterns](https://calendar.perfplanet.com/2018/performance-anti-patterns-base64-encoding/)
- [DebugBear: Base64 Data URLs](https://www.debugbear.com/blog/base64-data-urls-html-css)
- [CSV Import Common Pitfalls (Dromo)](https://dromo.io/blog/ultimate-guide-to-csv-imports)
- [CSV Import Errors (Flatfile)](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/)
- [Data Parsing Edge Cases](https://rvrsh3ll.net/data-parsing-in-the-real-world-delimiters-encodings-and-edge-cases)
- [PostgreSQL Docker Volume Persistence](https://www.w3tutorials.net/blog/how-to-persist-data-in-a-dockerized-postgres-database-using-volumes/)
- [Docker Volumes Persistent Storage (2026)](https://oneuptime.com/blog/post/2026-02-02-docker-volumes-persistent-data/view)
- [Digital Forensics Chain of Custody](https://online.champlain.edu/blog/chain-custody-digital-forensics)
- [Schema-Driven Form Design](https://meands.org/posts/FormDesign/)
- [Inline Editing UX Best Practices](https://uxdworld.com/inline-editing-in-tables-design/)
- [Docxtemplater](https://docxtemplater.com/)

---
*Pitfalls research for: AuditTrail -- Dockerized audit case management on airgapped networks*
*Researched: 2026-02-10*
