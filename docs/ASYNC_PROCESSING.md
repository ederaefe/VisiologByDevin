# VISIOLOG Async Processing Architecture

## Overview
This refactor separates file ingestion from document processing, making uploads lightweight, fault tolerant, and horizontally scalable.

## Key design points

- `POST /api/upload-scan` accepts a file upload, stores the source image in Supabase Storage, and creates a `visiolog_scans` job record with `status = 'pending'`.
- The browser only uploads files and displays success. It does not wait for Gemini extraction or shape parsed data.
- Processing happens entirely on the backend via `lib/scan-processor.js`.
- The scan lifecycle is managed in the database so the spreadsheet and record APIs can continue reading persisted rows only.
- Gemini extraction remains raw CSV output; the pipeline validates and detects malformed or incorrect responses before persisting rows.
- `POST /api/process-scan?id=...` allows explicit reprocessing of a specific scan.
- `POST /api/process-pending-scans?limit=5` allows scheduled bulk processing or worker-driven execution.

## Database schema changes

The `visiolog_scans` table now includes:

- `attempt_count` — tracks processing attempts
- `last_attempt_at` — timestamp of the most recent processing attempt
- `next_retry_at` — scheduled retry time for transient failures

These columns support automatic backoff and make the pipeline resilient to temporary AI or network failures.

## Failure handling

- Worker crashes, Gemini failures, malformed CSV, and storage errors are captured in `error_message`.
- Failed scans are updated with `status = 'failed'` and a scheduled `next_retry_at` if retryable.
- The failure model is idempotent: repeated processing attempts use stable scan state and only replace records for the same scan.

## Extensibility

The processor module is intentionally modular:

- `claimPendingScan` selects work safely and can be replaced with a queue consumer.
- `processScanRecord` encapsulates extraction, validation, and persistence.
- Future hooks can be added before or after persistence for analytics, notifications, duplicate detection, or audit events.

## Deployment notes

- The server must provide `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by backend ingestion paths and must never be exposed to the client.
- The frontend continues to use the anonymous key for read-only operations.

## Operational patterns

- On each upload, the scan job is created and remains pending.
- A worker, cron job, or manual trigger calls `/api/process-pending-scans`.
- If a scan fails repeatedly, `next_retry_at` is set to a later time, avoiding hot retry storms.
- The spreadsheet reads from `visiolog_records`, not from temporary processing state.
