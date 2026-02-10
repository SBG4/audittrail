# Stack Research

**Domain:** Audit case management web application (airgapped, Dockerized)
**Project:** AuditTrail
**Researched:** 2026-02-10
**Confidence:** HIGH

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Python** | 3.12 | Backend language | Mature ecosystem for document generation (PDF, DOCX), data processing (Excel/CSV), and web APIs. 3.12 is the stable production target; 3.13 is too new for dependency compatibility across WeasyPrint/pandas/SQLAlchemy. | HIGH |
| **FastAPI** | 0.115+ | REST API framework | Async-first, auto-generated OpenAPI docs, Pydantic-native validation. The standard Python API framework for new projects. Schema-driven audit types map directly to Pydantic models. | HIGH |
| **React** | 19.x | Frontend UI | Dominant ecosystem, largest component library selection. React 19 is stable (19.2.4 current). Timeline UI, inline editing, and dashboard components are well-supported. | HIGH |
| **TypeScript** | 5.7+ | Frontend language | Non-negotiable for any project with schema-driven data. Catches audit type schema mismatches at compile time. | HIGH |
| **PostgreSQL** | 17 | Primary database | Required by project spec. v17 is current stable (18.x is very new, wait for 18.1+). JSONB columns for flexible audit type schemas. Full-text search for case search. | HIGH |
| **Docker Compose** | v2 | Deployment | Required by project spec. Multi-container orchestration for app + db + reverse proxy. | HIGH |

### Backend Libraries

| Library | Version | Purpose | Why This One | Confidence |
|---------|---------|---------|--------------|------------|
| **SQLAlchemy** | 2.0.46 | ORM & database toolkit | Industry standard Python ORM. v2.0 has modern async support, type annotations, and explicit query patterns. Pairs with Alembic for migrations. | HIGH |
| **Alembic** | 1.18.3 | Database migrations | The only serious migration tool for SQLAlchemy. Auto-generates migration scripts from model changes. | HIGH |
| **Pydantic** | 2.12.5 | Data validation & schemas | Built into FastAPI. Audit type schemas defined as Pydantic models, shared between validation, API docs, and database serialization. | HIGH |
| **Uvicorn** | 0.40.0 | ASGI server | FastAPI's recommended production server. Lightweight, fast, well-tested. | HIGH |
| **WeasyPrint** | 68.1 | PDF report generation | HTML/CSS-to-PDF. Write one Jinja2 template, render to both HTML preview and PDF. Supports modern CSS (flexbox, grid). No headless browser required (unlike Playwright/Puppeteer). Pure Python. | HIGH |
| **python-docx** | 1.2.0 | DOCX report generation | The standard Python library for creating Word documents. Programmatic control over styles, tables, headers. No alternatives worth considering. | HIGH |
| **Jinja2** | 3.1.6 | HTML templating | Template engine for all three report formats (PDF via WeasyPrint, DOCX content, interactive HTML). Already a FastAPI/WeasyPrint dependency. | HIGH |
| **Plotly** | 6.5.2 | Interactive charts (reports) | `plotly.io.to_html(include_plotlyjs=True)` produces fully self-contained HTML with ~3MB embedded JS. Charts are interactive (hover, zoom) without any server or CDN. This is the key technology for offline interactive HTML reports. | HIGH |
| **pandas** | 3.0.0 | Data processing & Excel/CSV import | Read Excel (`.xlsx`, `.xls`) and CSV files with `read_excel()` / `read_csv()`. Data transformation, aggregation for report statistics. v3.0 is current (released Jan 2026). | MEDIUM |
| **openpyxl** | 3.1.x | Excel engine for pandas | Backend engine for `pandas.read_excel()`. Required dependency, not used directly. | HIGH |
| **passlib + python-jose** | latest | Auth (password hashing + JWT) | Simple login auth for 2-5 users. passlib[bcrypt] for password hashing, python-jose for JWT tokens. No need for OAuth/OIDC complexity. | MEDIUM |
| **pytest** | 9.1 | Backend testing | Standard Python test framework. No reason to use anything else. | HIGH |

### Frontend Libraries

| Library | Version | Purpose | Why This One | Confidence |
|---------|---------|---------|--------------|------------|
| **Vite** | 7.x | Build tool & dev server | Standard React build tool. Fast HMR, native ESM, simple config. v7 is current stable. | HIGH |
| **React Router** | 7.x | Client-side routing | Stable, well-documented SPA routing. v7 simplified imports (no more react-router-dom). For a small internal app, React Router's simplicity beats TanStack Router's type-safety overhead. | HIGH |
| **TanStack Query** | 5.x | Server state management | Caching, background refetching, optimistic updates for API calls. Essential for the inline editing workflow (edit timeline event -> optimistic UI update -> server sync). | HIGH |
| **React Hook Form** | 7.71+ | Form handling | Mature, lightweight, uncontrolled components. 7M+ weekly downloads. Better ecosystem/docs than TanStack Form for this project's scale. Pairs with Zod for schema validation. | HIGH |
| **Zod** | 4.x | Schema validation | TypeScript-first validation. Shared schemas between forms and API contracts. v4 is 57% smaller than v3. | HIGH |
| **Zustand** | 5.x | Client state management | Minimal boilerplate for small apps. No providers, no reducers. Perfect for UI state (sidebar open, active filters, selected case). Redux is overkill for 2-5 users. | HIGH |
| **Tailwind CSS** | 4.x | Utility-first CSS | v4 is current (4.1.18). 5x faster builds, automatic content detection. Combined with shadcn/ui for consistent component styling. | HIGH |
| **shadcn/ui** | latest | UI component library | Copy-paste components built on Radix UI + Tailwind. Full ownership of code (no dependency lock-in). Timeline, data tables, dialogs, forms -- all needed components available. As of Feb 2026, supports unified radix-ui package. | HIGH |
| **Recharts** | 3.7.0 | Dashboard charts (in-app) | Declarative React charts built on D3. Lightweight (only specific D3 submodules). For the in-app dashboard. SVG-based, no canvas issues. | HIGH |
| **Vitest** | 4.x | Frontend testing | Native Vite integration. Jest-compatible API. 10-20x faster than Jest. The standard for Vite-based projects. | HIGH |
| **@tanstack/react-table** | 8.x | Data tables | Headless table logic for audit case lists, event tables. Pairs with shadcn/ui's table components. | MEDIUM |

### Development & Infrastructure

| Tool | Purpose | Notes |
|------|---------|-------|
| **Docker** | Containerization | Multi-stage builds: build frontend -> serve via FastAPI static files or Nginx |
| **Docker Compose v2** | Orchestration | Services: `app` (FastAPI), `db` (PostgreSQL), `nginx` (reverse proxy, optional) |
| **Nginx** | Reverse proxy (optional) | Only if serving frontend separately from FastAPI. For small team, FastAPI can serve static files directly. |
| **uv** | Python package manager | 10-100x faster than pip. Use for Dockerfile installs and local dev. Handles lockfiles for reproducible airgapped builds. |
| **pnpm** | Node package manager | Faster installs, strict dependency resolution. Better for airgapped pre-packaging than npm. |
| **Ruff** | Python linter + formatter | Replaces flake8, black, isort in one tool. Extremely fast (Rust-based). |
| **ESLint + Prettier** | JS/TS linting + formatting | Standard frontend tooling. |
| **pre-commit** | Git hooks | Run ruff, eslint, type checks before commit. |

---

## Installation

### Backend

```bash
# Using uv (recommended)
uv init audittrail-backend
uv add fastapi uvicorn[standard] sqlalchemy[asyncio] alembic pydantic
uv add weasyprint python-docx jinja2 plotly pandas openpyxl
uv add passlib[bcrypt] python-jose[cryptography]
uv add --dev pytest pytest-asyncio httpx ruff

# Or using pip
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] alembic pydantic
pip install weasyprint python-docx jinja2 plotly pandas openpyxl
pip install passlib[bcrypt] python-jose[cryptography]
pip install -D pytest pytest-asyncio httpx ruff
```

### Frontend

```bash
# Create project
pnpm create vite audittrail-frontend --template react-ts

# Core
pnpm add react-router zod zustand @tanstack/react-query react-hook-form recharts @tanstack/react-table

# UI
pnpm add tailwindcss @tailwindcss/vite
# Then: npx shadcn@latest init

# Dev
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D eslint prettier typescript
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not the Alternative |
|----------|-------------|-------------|------------------------|
| **API Framework** | FastAPI | Django REST Framework | Django's batteries-included approach adds complexity we don't need. FastAPI is faster, lighter, and Pydantic-native. Django's ORM is inferior to SQLAlchemy for complex queries. |
| **API Framework** | FastAPI | Flask | Flask lacks native async, auto-docs, and built-in validation. FastAPI does everything Flask does, better. |
| **Frontend** | React (SPA) | Next.js | SSR is pointless for an airgapped internal tool. Next.js adds server complexity with zero benefit here. |
| **Frontend** | React (SPA) | Vue.js / Svelte | React has the largest component ecosystem. Timeline components, table libraries, and charting are more mature in React. |
| **PDF Generation** | WeasyPrint | Playwright/Puppeteer | Headless browsers are heavy (500MB+ Docker images), slow, and fragile. WeasyPrint is pure Python, lightweight, and produces excellent PDFs from HTML/CSS. |
| **PDF Generation** | WeasyPrint | ReportLab | ReportLab uses a programmatic API (not HTML/CSS). You cannot share templates between HTML preview and PDF. WeasyPrint lets you write HTML once, render everywhere. |
| **Interactive Reports** | Plotly (Python) | Chart.js embedded | Plotly's `to_html(include_plotlyjs=True)` is purpose-built for self-contained offline HTML. Chart.js requires manual JS bundling. Plotly charts are also more interactive (hover data, zoom, pan). |
| **In-app Charts** | Recharts | Plotly React | Recharts is lighter and more React-idiomatic for in-app dashboards. Plotly React is heavier and designed for data science UIs. |
| **State Management** | Zustand | Redux Toolkit | Redux is enterprise-grade complexity for a 2-5 user app. Zustand does the same job in 1/10th the boilerplate. |
| **Forms** | React Hook Form | TanStack Form | React Hook Form has vastly more documentation, examples, and community. TanStack Form's type-safety advantage doesn't justify the learning curve for this project's form complexity. |
| **Router** | React Router 7 | TanStack Router | React Router is simpler for SPA routing. TanStack Router's type-safe routes are valuable for large apps, but overkill for ~10 routes in an internal tool. |
| **ORM** | SQLAlchemy 2.0 | Tortoise ORM / SQLModel | SQLAlchemy is the industry standard. SQLModel is built on SQLAlchemy anyway. Tortoise is async-only with a smaller ecosystem. |
| **Database** | PostgreSQL 17 | SQLite | SQLite cannot handle concurrent writes from multiple auditors. PostgreSQL's JSONB, full-text search, and concurrent access are essential. |
| **Python packaging** | uv | pip / poetry | uv is 10-100x faster, handles lockfiles natively, and produces deterministic builds critical for airgapped deployment. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Next.js / Remix** | SSR/SSG is pointless for an airgapped SPA. Adds server-side rendering complexity with zero benefit. Doubles the server surface area. | React SPA with Vite |
| **Electron** | Unnecessary desktop wrapper. This is a web app served via Docker. | Browser-based SPA |
| **MongoDB** | No schema enforcement for audit data that demands consistency. No ACID transactions. PostgreSQL's JSONB provides schema flexibility where needed. | PostgreSQL with JSONB columns |
| **Prisma (Python)** | Prisma's Python client is experimental/unmaintained. SQLAlchemy is the only serious Python ORM. | SQLAlchemy 2.0 |
| **FPDF / pdfkit (wkhtmltopdf)** | FPDF is low-level. wkhtmltopdf is abandoned and uses an ancient WebKit. Neither supports modern CSS. | WeasyPrint |
| **Celery** | Task queue is overkill for 2-5 users generating occasional reports. Use FastAPI background tasks. | `fastapi.BackgroundTasks` |
| **Redis** | No caching layer needed for 2-5 users. PostgreSQL handles everything. | Direct PostgreSQL queries |
| **Tailwind CSS v3** | v3 requires explicit content config and has a JS-based engine. v4 is faster, auto-detects content, and uses native CSS features. | Tailwind CSS v4 |
| **Create React App** | Deprecated. Vite is the standard React build tool. | Vite |
| **Jest** | Slower, more configuration than Vitest for Vite-based projects. | Vitest |
| **npm** | Slower installs, flat node_modules. pnpm is faster with stricter dependency resolution. | pnpm |

---

## Stack Patterns by Variant

**If report generation becomes a bottleneck (many concurrent report requests):**
- Add a simple task queue with `asyncio.Queue` + a background worker
- Still no need for Celery/Redis at 2-5 users
- WeasyPrint PDF rendering is CPU-bound; run in a `ProcessPoolExecutor`

**If audit type schemas grow very complex:**
- Use PostgreSQL JSONB + JSON Schema validation at the database level
- Pydantic models can validate against JSON Schema definitions stored in DB
- This avoids hardcoding every audit type as a Python class

**If the team grows beyond 5 users:**
- Add connection pooling (asyncpg + SQLAlchemy async engine, already supported)
- Consider adding Redis for session storage
- The core stack does not change

**If interactive HTML reports need more complex visualizations:**
- Plotly supports 40+ chart types including heatmaps, treemaps, sankey diagrams
- For geographic data: Plotly has built-in map support (no Mapbox token needed for basic maps)
- All self-contained in the exported HTML

---

## Airgapped Deployment Strategy

### Docker Image Build (on connected machine)

```dockerfile
# Backend: Multi-stage build
FROM python:3.12-slim AS backend-build
# Install uv, copy requirements, download all wheels
# WeasyPrint requires system deps: libpango, libcairo, libgdk-pixbuf

FROM node:22-slim AS frontend-build
# pnpm install --frozen-lockfile
# pnpm build (produces static files)

FROM python:3.12-slim AS production
# Copy wheels from backend-build, install offline
# Copy frontend dist/ to serve as static files
# ENTRYPOINT: uvicorn app.main:app
```

### Key Airgapped Constraints

| Concern | Solution |
|---------|----------|
| **No PyPI access** | `uv pip compile` on connected machine -> `uv pip install --no-index --find-links ./wheels/` in Docker |
| **No npm registry** | `pnpm install --frozen-lockfile` during Docker build on connected machine. Frontend is pre-built static files. |
| **No CDN for fonts** | Bundle fonts in Docker image. Tailwind uses system font stack by default. WeasyPrint PDFs embed fonts. |
| **No CDN for JS** | Plotly `include_plotlyjs=True` embeds 3MB JS inline. Recharts is bundled at build time. All offline. |
| **Docker image transfer** | `docker save -o audittrail.tar audittrail:latest` -> USB -> `docker load -i audittrail.tar` on airgapped machine |
| **Database initialization** | Alembic migrations run on container startup. Seed data via SQL scripts in Docker entrypoint. |
| **Report fonts/assets** | Include in Docker image under `/app/assets/`. Reference via file:// paths in Jinja2 templates. |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| FastAPI 0.115+ | Pydantic 2.12+ | FastAPI dropped Pydantic v1 support. Must use v2. |
| SQLAlchemy 2.0.46 | Alembic 1.18.3 | Always upgrade together. Alembic 1.18 requires SQLAlchemy 2.0. |
| pandas 3.0.0 | openpyxl 3.1.x | pandas uses openpyxl as default Excel engine. |
| WeasyPrint 68.1 | Python 3.10-3.13 | Requires system libraries: Pango, Cairo, GDK-Pixbuf. Install via `apt-get` in Dockerfile. |
| Plotly 6.5.2 | Jinja2 3.1.x | Plotly can render to HTML string; Jinja2 embeds it in report template. |
| React 19.x | React Router 7.x | React Router 7 requires React 18+. |
| Vite 7.x | Vitest 4.x | Share vite.config.ts. Vitest reads Vite config natively. |
| Tailwind 4.x | shadcn/ui latest | shadcn/ui Feb 2026 update uses unified radix-ui package. |
| Zustand 5.x | React 18+/19.x | Zustand 5 dropped React 17 support. |
| Zod 4.x | React Hook Form 7.71+ | Use `@hookform/resolvers/zod` for integration. |
| TanStack Query 5.x | React 18+/19.x | Works with React 19's concurrent features. |

---

## Report Generation Architecture

The three report formats share a common pipeline:

```
Audit Case Data (PostgreSQL)
        |
        v
  Data Assembly (Python dicts/DataFrames)
        |
        +---> Jinja2 HTML Template ---> WeasyPrint ---> PDF
        |
        +---> Jinja2 HTML Template + Plotly charts ---> Self-contained HTML file
        |         (include_plotlyjs=True, inline CSS, inline fonts)
        |
        +---> python-docx programmatic API ---> DOCX
```

**Key insight:** PDF and interactive HTML share the same Jinja2 templates with minor conditional blocks. The HTML version adds Plotly interactive charts; the PDF version uses static chart images (Plotly can export to PNG via `plotly.io.to_image()` with kaleido).

**Self-contained HTML report structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* All CSS inlined, including fonts as base64 */</style>
  <script>/* Plotly.js ~3MB inlined */</script>
</head>
<body>
  <!-- Dashboard section with Plotly charts -->
  <!-- Timeline section with CSS-only rendering -->
  <!-- Data tables with sort/filter via vanilla JS -->
  <script>
    // ~200 lines of vanilla JS for tab switching, filtering, sorting
    // NO framework needed in the report itself
  </script>
</body>
</html>
```

---

## Sources

### Verified via PyPI / npm (HIGH confidence)
- [FastAPI on PyPI](https://pypi.org/project/fastapi/) -- v0.128.6 (Feb 2026)
- [SQLAlchemy 2.0.46 release](https://www.sqlalchemy.org/blog/2026/01/21/sqlalchemy-2.0.46-released/) -- Jan 21, 2026
- [Alembic on PyPI](https://pypi.org/project/alembic/) -- v1.18.3 (Jan 29, 2026)
- [Pydantic on PyPI](https://pypi.org/project/pydantic/) -- v2.12.5
- [WeasyPrint on PyPI](https://pypi.org/project/weasyprint/) -- v68.1 (Feb 6, 2026)
- [python-docx on PyPI](https://pypi.org/project/python-docx/) -- v1.2.0
- [Plotly on PyPI](https://pypi.org/project/plotly/) -- v6.5.2 (Jan 14, 2026)
- [pandas 3.0.0](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html) -- Jan 21, 2026
- [Jinja2 on PyPI](https://pypi.org/project/Jinja2/) -- v3.1.6
- [Uvicorn on PyPI](https://pypi.org/project/uvicorn/) -- v0.40.0
- [pytest on PyPI](https://pypi.org/project/pytest/) -- v9.1

### Verified via npm (HIGH confidence)
- [React on npm](https://www.npmjs.com/package/react) -- v19.2.4 (Jan 26, 2026)
- [Vite on npm](https://www.npmjs.com/package/vite) -- v7.3.1
- [React Router on npm](https://www.npmjs.com/package/react-router) -- v7.13.0
- [TanStack Query on npm](https://www.npmjs.com/package/@tanstack/react-query) -- v5.90.20
- [React Hook Form on npm](https://www.npmjs.com/package/react-hook-form) -- v7.71.1
- [Zustand on npm](https://www.npmjs.com/package/zustand) -- v5.0.10
- [Zod on npm](https://www.npmjs.com/package/zod) -- v4.3.6
- [Tailwind CSS on npm](https://www.npmjs.com/package/tailwindcss) -- v4.1.18
- [Recharts on npm](https://www.npmjs.com/package/recharts) -- v3.7.0
- [Vitest on npm](https://www.npmjs.com/package/vitest) -- v4.0.18

### Official Documentation (HIGH confidence)
- [Plotly interactive HTML export](https://plotly.com/python/interactive-html-export/) -- self-contained HTML with `include_plotlyjs=True`
- [PostgreSQL versioning](https://www.postgresql.org/support/versioning/) -- v17 current stable, v18 latest
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog) -- Feb 2026 unified Radix UI package
- [FastAPI Docker deployment](https://fastapi.tiangolo.com/deployment/docker/) -- official Docker guide
- [Vite 8 beta](https://vite.dev/blog/announcing-vite8-beta) -- Rolldown-powered (not yet stable, use v7)
- [Vitest 4.0](https://vitest.dev/blog/vitest-4) -- current stable

### WebSearch (MEDIUM confidence)
- [Zustand vs Redux 2026](https://javascript.plainenglish.io/zustand-vs-redux-in-2026-why-i-switched-and-you-should-too-c119dd840ddb) -- community consensus on Zustand for small apps
- [TanStack Router vs React Router](https://betterstack.com/community/guides/scaling-nodejs/tanstack-router-vs-react-router/) -- React Router simpler for SPAs
- [Air-gapped Python deployment](https://www.infoworld.com/article/3836692/airgapped-python-setting-up-python-without-a-network.html) -- wheel-based offline installs

---

*Stack research for: Audit case management (airgapped, Dockerized)*
*Researched: 2026-02-10*
