# VISIOLOG current walkthrough

## 1. Product shell

The user-facing shell is a Vite-built React + TypeScript application in `product-page/`. `src/App.tsx` contains the landing page and its React Router routes. `src/Upload.tsx` contains the passcode-gated upload workspace. `src/index.css` provides the shared typography, neutral neomorphic surfaces, indigo accent, tactile shadows, and restrained structural borders used by both routes.

The root build invokes `deploy_product.js`, which copies the built SPA into `public/`. Vercel serves that output for `/` and `/upload`; `/data` and `/review` continue to point at their static HTML pages.

## 2. Upload experience

Image mode supports camera capture and multiple gallery files. Each image is compressed in the browser to the existing 1200px/JPEG quality-0.7 behavior, then uploaded using the existing multipart contract:

```text
POST /api/upload-scan
file=<compressed image>
template=<security_gate | classroom_attendance | hospital_registry>
```

The endpoint stores the source image in Supabase Storage and creates a pending scan. Extraction remains downstream in the existing data workspace; this phase deliberately does not change that queue.

Text mode accepts CSV, TXT, and XLSX. Parsing and the preview table happen in the browser. The submit boundary is disabled and labeled as pending until the next phase defines persisted text ingestion and append semantics.

## 3. Existing data workspace

`public/data/index.html` remains a static UniverJS application. It loads Univer's UMD bundles from CDN, loads and saves the server logbook through the existing API functions, and displays queued source images beside extracted table data. It has not been behaviorally changed in the React upload or design work.

## 4. Storage and APIs

The active storage architecture is Supabase PostgreSQL and Supabase Storage. The `api/` directory contains Vercel serverless functions for passcode validation, scan upload, extraction, scan listing/deletion, logbook access, and record operations. Gemini is called by the extraction function. JSONBin and Cloudinary are not active dependencies.

The current backend still contains validation/review fields. Removing that stage is a planned Phase 2 backend migration, not part of the frontend redesign.

## 5. Verification and deployment

Use Node 22. From the repository root:

```bash
npm run build
```

Then run `npm run typecheck` and `npm run lint` from `product-page/`. Vercel should use `npm run build` as its build command and `public` as its output directory. Set server-side environment variables in Vercel without committing secrets, run `supabase_schema.sql`, and create the `logbooks` Storage bucket before exercising image uploads.

## 6. Phased migration

- **Phase 1 complete:** React/TypeScript foundation and upload route.
- **Phase 2:** Supabase pipeline simplification and removal of validation.
- **Phase 3:** React + npm Univer migration for `/data`.
- **Phase 4:** persisted text ingestion, integrations, synchronization, and retirement of `/review`.
