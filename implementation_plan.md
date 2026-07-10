# Implementation Plan: Supabase DB Migration, Asynchronous Ingestion, and Gallery UI Overhaul

This document details the architecture and step-by-step technical plan to migrate the database from JSONBin to Supabase, convert the image upload pipeline from synchronous to asynchronous (upload-and-go), implement a client-triggered queue engine, and add a premium image gallery/inspector tab in the Data Ledger.

---

## User Review Required

> [!IMPORTANT]
> **Database Table Creation Needed**:
> To support this implementation, you will need to run a SQL script in your Supabase SQL Editor. I have documented this schema in a new file [supabase_schema.sql](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/supabase_schema.sql) in your workspace root.
> Please run this script in the Supabase Dashboard before deploying to staging.

---

## Open Questions

None. The requirements for the asynchronous upload-and-go queue and the gallery are fully specified and compatible with our client-side UniverJS sheet layout.

---

## Proposed Changes

### 1. Database and API Schema Migration

#### [NEW] [supabase_schema.sql](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/supabase_schema.sql)
- Contains SQL rules to initialize `visiolog_data` (for spreadsheet rows storage) and `visiolog_scans` (for background extraction jobs).

#### [MODIFY] [api/get-logbook.js](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/api/get-logbook.js)
- Rewrite to select `value` from the `visiolog_data` table where `key = 'server_data'`. Falls back to an empty array if not found.

#### [MODIFY] [api/update-logbook.js](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/api/update-logbook.js)
- Rewrite to upsert the JSON array of spreadsheet records in `visiolog_data` for the key `server_data`.

---

### 2. Asynchronous Ingestion Queue

#### [NEW] [api/upload-scan.js](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/api/upload-scan.js)
- Parses multipart form data files using Formidable.
- Uploads the image buffer directly to the Supabase `logbooks` bucket.
- Inserts a row in the `visiolog_scans` table with status `'pending'`.
- Returns the scan ID and public image URL immediately (under 2 seconds).

#### [NEW] [api/process-scan.js](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/api/process-scan.js)
- Triggered by the dashboard client to process a specific scan.
- Fetches the scan details, reads the image file from Supabase Storage as a buffer, and calls Gemini Flash to extract structured records.
- Updates the scan status in `visiolog_scans` to `'completed'` and writes the JSON output to `extracted_data`.
- Automatically merges the extracted rows into the main `server_data` sheet in `visiolog_data`.

#### [NEW] [api/get-scans.js](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/api/get-scans.js)
- Retrieves all rows from `visiolog_scans` ordered by `created_at DESC` to feed the client dashboard's gallery list.

---

### 3. Frontend Upgrades (Uploader & Dashboard)

#### [MODIFY] [public/upload/index.html](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/public/upload/index.html)
- Change the upload handler to submit files to `/api/upload-scan` instead of `/api/process-logbook`.
- On success, redirect the user immediately to the Data Ledger `/data` page.

#### [MODIFY] [public/data/index.html](file:///c:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG%20%28univer%29/public/data/index.html)
- **UI Design Overhaul**: Expand the sidebar into a multi-tab system: **"Spreadsheet"** and **"Ingestion Gallery"**.
- **Ingestion Gallery UI**:
  - Show cards for all uploaded images, displaying a preview image and a status badge: `Pending` (yellow pulsing), `Processing` (blue spinner), `Completed` (green check), `Failed` (red error message).
  - Add a **"Reprocess"** button on each card to trigger a retry.
- **Split-Pane Viewer**:
  - Clicking an image card opens a slide-over panel displaying the full source photograph side-by-side with a preview table of its parsed tabular rows.
- **Client-Triggered Queue Engine**:
  - Implement a polling mechanism in Javascript: when the page loads, it fetches scans from `/api/get-scans`. If any are `'pending'`, it triggers `/api/process-scan?id=[id]` in the background and updates the UI real-time. On success, it merges the data and refreshes UniverJS automatically!

---

## Verification Plan

### Automated Tests
- Build and compile the assets using `node deploy_product.js`.
- Execute a test run of `/api/upload-scan` and `/api/process-scan` to verify database integrations.

### Manual Verification
1. Open Supabase Dashboard, run the SQL script to create the tables.
2. Go to `/upload`, upload an image, and verify it redirects immediately.
3. Open `/data`, see the image appearing in the Ingestion Gallery with a loader.
4. Verify the sheet automatically refreshes and loads the new rows once the loader finishes.
