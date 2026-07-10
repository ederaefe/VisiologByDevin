# VISIOLOG

VISIOLOG turns photographed logbook pages into structured records. The application currently combines a React + TypeScript Vite upload experience with the existing Univer spreadsheet workspace.

## Current product

- `/` — React/Vite marketing site
- `/upload` — passcode-gated React upload workspace
- `/data` — existing static UniverJS spreadsheet and image queue
- `/review` — existing static operations console (scheduled for retirement)
- `/api/*` — Vercel serverless functions

The architecture is Supabase-only for application storage: PostgreSQL stores records and templates, while Supabase Storage stores source images. Gemini is used by the server-side extraction function. JSONBin and Cloudinary are not part of the active architecture.

## Upload flows

### Image

The React upload page accepts camera captures and multiple gallery images, compresses them in the browser, and sends each image to:

```text
POST /api/upload-scan
  → Supabase Storage + pending scan
  → queued extraction from the data workspace
  → extracted rows in the table and image archive
```

### Text

CSV, TXT, and XLSX files are parsed locally in the browser and shown in a preview table. The persistence/ingestion endpoint is intentionally pending for the next phase; the current UI does not call a made-up endpoint.

## Repository layout

```text
product-page/       React + TypeScript Vite SPA
  src/App.tsx       Landing page and routes
  src/Upload.tsx    Image/text upload workspace
  src/index.css     Shared design tokens and component styles
  public/           SPA favicon and static assets
public/             Vercel output and legacy static pages
  index.html        Built React SPA entry
  data/index.html   Univer spreadsheet (migration pending)
  review/index.html Existing review console
api/                Vercel serverless functions
lib/                Shared server-side helpers
supabase_schema.sql Database and storage-oriented schema
```

## Local development

Use Node 22 (the Vite/Rolldown toolchain requires a current Node 22 release).

```bash
npm install
cd product-page && npm install
cd ..
npm run build
```

The root build runs `deploy_product.js`. It builds `product-page/` with Vite and copies `dist/index.html` and `dist/assets/` into `public/`, which is the directory served by Vercel.

Useful checks:

```bash
npm test
npm run build
cd product-page
npm run typecheck
npm run lint
```

## Supabase setup

Run `supabase_schema.sql` in the Supabase SQL editor and create the `logbooks` Storage bucket required by `api/upload-scan.js`. Configure server-side environment variables in the deployment platform; never commit credentials. The exact variables depend on the deployed API configuration and should be copied from the repository's credentials guide or deployment environment.

## Vercel deployment

Use the repository root as the Vercel project root:

- Build command: `npm run build`
- Output directory: `public`
- Node runtime: 22.x

`vercel.json` routes `/upload` to the React SPA and preserves the static `/data` and `/review` routes. API functions remain under `/api`.

## Migration plan

1. **Phase 1 — complete:** React + TypeScript Vite foundation and the new image/text upload route.
2. **Phase 2 — next:** simplify the Supabase extraction pipeline and remove the validation/needs-review stage from processing and storage.
3. **Phase 3:** migrate `/data` to React and install Univer through npm while preserving the spreadsheet and image/table workspace.
4. **Phase 4:** add persisted text ingestion, append semantics, and optional external integrations/synchronization; retire `/review`.

Until those phases land, `/data`, `/review`, and the existing serverless pipeline remain intentionally separate from the new upload shell.
