# Task: VISIOLOG Supabase and Asynchronous Queue Ingestion

- `[x]` Database Migration to Supabase
  - `[x]` Implement `api/get-logbook.js`
  - `[x]` Implement `api/update-logbook.js`
- `[x]` Asynchronous Ingestion APIs
  - `[x]` Implement `api/upload-scan.js` (multipart file parsing and Supabase Storage upload)
  - `[x]` Implement `api/process-scan.js` (background Gemini AI vision execution and record merger)
  - `[x]` Implement `api/get-scans.js` (fetch logbook scan jobs list)
  - `[x]` Implement `api/delete-scan.js` (delete scan records and storage files)
- `[ ]` Frontend Upload and Go Switch
  - `[ ]` Update `public/upload/index.html` upload script to use `/api/upload-scan`
- `[ ]` Ingestion Gallery and Queue UI Overhaul
  - `[ ]` Overhaul layout tabs and sidebar in `public/data/index.html`
  - `[ ]` Implement Client-Triggered Queue polling and state manager in `public/data/index.html`
  - `[ ]` Implement split-pane scan detail image and preview table inspect visualizer in `public/data/index.html`
- `[ ]` Compile and Deploy Verification
  - `[ ]` Run `supabase_schema.sql` in Supabase Dashboard
  - `[ ]` Test upload-and-go workflow
  - `[ ]` Verify gallery UI and auto-processing
