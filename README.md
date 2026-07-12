# VISIOLOG

VISIOLOG turns photographed logbook pages into structured records. The application currently combines a React + TypeScript Vite upload experience with the existing Univer spreadsheet workspace.

## Current product

- `/` — React/Vite marketing site
- `/upload` — passcode-gated React upload workspace
- `/data` — existing static UniverJS spreadsheet and image queue
- `/review` — existing static operations console (scheduled for retirement)
- `/api/*` — Vercel serverless functions

The architecture is Supabase-only for application storage: PostgreSQL stores records and templates, while Supabase Storage stores source images. Gemini 2.5 Flash is used by the server-side extraction function. JSONBin and Cloudinary are not part of the active architecture.

## Upload flows

### Image

The React upload page accepts camera captures and multiple gallery images, compresses them in the browser, and sends each image to:

```text
POST /api/upload-scan
  → Supabase Storage + pending scan
  → asynchronous backend processing
  → extracted rows in the table and image archive
```

The key change is that the browser only uploads the source image and creates a scan job record. It does not wait for Gemini extraction, CSV parsing, or record persistence.

The new backend flow is:

- `api/upload-scan.js` stores the source image in Supabase Storage and inserts a `visiolog_scans` record with `status = 'pending'`.
- `lib/scan-processor.js` is the server-side processor that claims pending scans, downloads the stored image, calls Gemini Vision, parses the returned CSV, validates rows, inserts `visiolog_records`, and updates scan status.
- `api/process-scan.js` delegates explicit single-scan processing to the processor module.
- `api/process-pending-scans.js` allows bulk worker or cron-driven processing of pending scan jobs.
- Backend functions use `SUPABASE_SERVICE_ROLE_KEY`; the frontend still uses `VITE_SUPABASE_ANON_KEY` for read-only operations.

Processing is now decoupled from the browser; once upload completes successfully, the frontend can safely close the page.

A secondary backend path can drive retries and bulk processing:

```text
POST /api/process-pending-scans?limit=5
```

## Async backend refactor

This repository now separates scan ingestion from extraction and persistence.

- `api/upload-scan.js` uploads the source image to Supabase Storage and records a pending scan job in `visiolog_scans`.
- `lib/supabase-client.js` centralizes Supabase client creation and supports backend service-role access.
- `lib/scan-processor.js` claims pending scans, downloads stored images, calls Gemini Vision, parses CSV, validates rows, inserts `visiolog_records`, and updates scan state.
- `api/process-scan.js` delegates explicit single-scan reprocessing to the backend processor.
- `api/process-pending-scans.js` allows scheduled or batch execution of pending scan jobs.

This makes uploads lightweight, keeps the browser responsive, and improves fault tolerance by recording retry metadata and error details in the scan job table.

### Key files in the new flow

- `api/upload-scan.js`
- `api/process-scan.js`
- `api/process-pending-scans.js`
- `lib/supabase-client.js`
- `lib/scan-processor.js`
- `docs/ASYNC_PROCESSING.md`

### Scan job lifecycle

1. User uploads an image from the browser.
2. `api/upload-scan` stores it and creates a `pending` scan job.
3. A worker or cron job calls `api/process-pending-scans`.
4. The processor extracts CSV text from Gemini, validates it, inserts records, and marks the scan `complete` or `failed`.

### Failure and retry behavior

- Failed scans are marked with `status = 'failed'` and `error_message`.
- Retry metadata is stored in `attempt_count`, `last_attempt_at`, and `next_retry_at`.
- The backend schedules retries for transient failures instead of retrying immediately in the browser.

### More details

For a deeper architecture overview, see `docs/ASYNC_PROCESSING.md`.

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

Run `supabase_schema.sql` in the Supabase SQL editor and create the `logbooks` Storage bucket required by `api/upload-scan.js`.

The backend processor now depends on retry metadata in `visiolog_scans`:

- `attempt_count`
- `last_attempt_at`
- `next_retry_at`

Configure these server-side environment variables in the deployment platform; never commit credentials:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key is required for backend processing and must never be exposed to client-side code.

The worker trigger endpoint is:

```text
POST /api/process-pending-scans?limit=5
```

For more architecture details, see `docs/ASYNC_PROCESSING.md`.

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
