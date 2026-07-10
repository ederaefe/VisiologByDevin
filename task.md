# Task: VISIOLOG Supabase and Asynchronous Queue Ingestion

- `[ ]` Database Migration to Supabase
  - `[ ]` Implement `api/get-logbook.js`
  - `[ ]` Implement `api/update-logbook.js`
- `[ ]` Asynchronous Ingestion APIs
  - `[ ]` Implement `api/upload-scan.js` (multipart file parsing and Supabase Storage upload)
  - `[ ]` Implement `api/process-scan.js` (background Gemini AI vision execution and record merger)
  - `[ ]` Implement `api/get-scans.js` (fetch logbook scan jobs list)
- `[ ]` Frontend Upload and Go Switch
  - `[ ]` Update `public/upload/index.html` upload script
- `[ ]` Ingestion Gallery and Queue UI Overhaul
  - `[ ]` Overhaul layout tabs and sidebar in `public/data/index.html`
  - `[ ]` Implement Client-Triggered Queue polling and state manager in `public/data/index.html`
  - `[ ]` Implement split-pane scan detail image and preview table inspect visualizer in `public/data/index.html`
- `[ ]` Compile and Deploy Verification
