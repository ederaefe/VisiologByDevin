# VISIOLOG implementation plan

## Current baseline

VISIOLOG is a Vercel application with a React + TypeScript Vite SPA in `product-page/`. The root `npm run build` builds that SPA and copies its `dist/index.html` and `dist/assets/` into `public/`. Serverless functions remain in `api/`; shared helpers live outside that directory so Vercel does not count them as functions.

The active persistence layer is Supabase PostgreSQL plus Supabase Storage. There is no active JSONBin or Cloudinary integration. The static `/data` workspace still uses UniverJS from CDN scripts, and `/review` remains the current operations console until the later migration phases.

## Completed: Phase 1

- Converted the product-page entry, app, and Vite configuration to TypeScript.
- Added React Router routes for `/` and `/upload`.
- Rebuilt `/upload` as a passcode-gated React workspace.
- Added image camera/gallery capture, template selection, thumbnails, browser compression, per-file upload state, and `POST /api/upload-scan`.
- Added local CSV/TXT/XLSX parsing and preview. Text persistence is explicitly deferred; no new backend endpoint was invented.
- Kept `/data`, `/review`, and all existing APIs unchanged.

## Phase 1.5: design and hygiene

- Apply shared neutral neomorphic design tokens with an indigo accent to the landing shell and upload workspace.
- Keep typography, buttons, cards, modes, dropzones, thumbnails, tables, pricing, and access gate accessible and responsive.
- Add the supplied favicon to both the SPA source and root static output.
- Remove only verified-dead legacy upload/data support files.
- Keep the markdown documentation aligned with the deployed architecture.

## Planned phases

### Phase 2 — Supabase pipeline simplification

Move extraction orchestration toward the Supabase-only model and remove the validation, `needs_review`, approval, and rejection stage from processing and storage. Define the replacement scan/record statuses and update schema, APIs, tests, and consumers together. This phase has not started.

### Phase 3 — React data workspace

Migrate `/data` to React + TypeScript and install Univer through npm. Preserve the spreadsheet, image gallery, source-image inspector, extracted table view, and Supabase-backed save/load behavior.

### Phase 4 — text ingestion and integrations

Add a persisted text ingestion API for the rows currently previewed locally, append them to the canonical table, and define optional Google Sheets, Airtable, ERP/CRM, or webhook adapters. Add sync state, retries, and conflict handling before retiring `/review`.

## Verification

Run these checks with Node 22:

```bash
npm test
npm run build
cd product-page
npm run typecheck
npm run lint
```
