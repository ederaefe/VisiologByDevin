# VISIOLOG — Implementation Plan

VISIOLOG is a digitization layer over physical logbooks: an officer photographs a completed page, AI extracts the handwritten rows into structured records, the system validates/cleans them, and administrators search, review, and analyze the results. This document is the living overview of the product build — **done**, **in progress**, and **planned** — and is kept up to date as work lands.

> **Key product constraints (from the product owner):**
> 1. **Logbook headers/fields differ by industry.** A security gate registry, a classroom attendance log, and a hospital registry all capture different columns. The system must support **configurable logbook templates**, not one hardcoded schema.
> 2. **The uploader is intentionally minimal.** Security officers only: capture/upload a batch → preview → see "upload complete" → close and go. They never see review, dashboard, or analytics surfaces. All administration happens in a separate admin app.

---

## Roadmap at a glance

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | Core pipeline: field schema, visitor-specific Gemini extraction with per-field confidence, validation/cleaning engine, relational records table | ✅ Done (PR #1) |
| **M1.5** | **Configurable logbook templates** (multi-industry). Refactor records to template-driven fields; add `template_id` to scans | ✅ Done (this branch) |
| **M2** | Admin **review & correction UI**: source image + extracted data side-by-side, edit/approve/reject flagged rows, audit history | 📋 Planned |
| **M1-U** | **Minimal uploader UX**: officer-only flow (batch upload → preview → complete → close); no redirect into the data/admin app | ✅ Done (this branch) |
| **M3** | Typed **search & dashboard** (multi-field filters, KPI cards) + CSV/Excel/PDF export | 📋 Planned |
| **M4** | **Analytics**: visitors over time, peak hours, hall/department distribution, trends | 📋 Planned |
| **M5** | **Auth & roles** (Officer/Admin/Super) via Supabase Auth + RLS lockdown; image retention/cleanup job | 📋 Planned |

---

## Open Questions

1. **Record storage model for multi-industry templates (M1.5).** Two options:
   - **(A) Template-driven flexible storage [recommended].** A `logbook_templates` table defines the field set + validation rules per industry. `visiolog_records` stores values in a `data jsonb` map keyed by field, with a small set of always-present metadata columns (scan_id, row_index, confidence, validation/review status). One records table serves every industry; add expression/GIN indexes for common queried fields.
   - **(B) Fixed columns + extras.** Keep the M1 typed visitor columns as a built-in "Security Gate" template and bolt on other industries later. More rigid; awkward for hospital/classroom fields.

   *Product owner selected Option A for M1.5: one flexible records table with template-defined fields and a JSONB data map.*

---

## M1 — Core Pipeline ✅ (PR #1)

**Goal:** extract → validate → store, producing structured, confidence-scored records.

- **[NEW] `api/lib/visitor-schema.js`** — canonical field list (single source of truth), confidence thresholds, model version, and the Gemini extraction prompt derived from the field list so prompt/validation/DB never drift.
- **[NEW] `api/lib/validation.js`** — pure, dependency-free validation/cleaning engine: blank-row removal, required/identity checks, Nigerian phone normalization, IMEI digit/length checks, time & date normalization, `time_out < time_in`, batch duplicate detection (matric/IMEI), per-field + overall confidence with **Needs Review** flagging. Emits `validation_status ∈ {valid, needs_review, invalid}`, `review_status ∈ {pending, needs_review}`, and `validation_errors[]`.
- **[MODIFY] `api/process-scan.js`** — rewired to extract → mark `validating` → validate → replace + insert rows into `visiolog_records` → set scan status `completed` / `needs_review` / `failed`.
- **[MODIFY] `supabase_schema.sql`** — new `visiolog_records` table (typed visitor columns + confidence/validation/review metadata + indexes; FK to `visiolog_scans`). `visiolog_data` blob left intact for the legacy dashboard.
- **[MODIFY] `.env.example`** — added `GEMINI_API_KEY` (APIs read it; only `VITE_GEMINI_API_KEY` was documented → extraction would silently fail).
- **[NEW] `tests/validation.test.js`** + `npm test` — unit tests for the validation engine (passing).

> **Note:** M1's typed columns are being generalized in M1.5 to support multiple industries. The M1 visitor field set becomes the built-in default "Security Gate / Visitor" template.

---

## M1.5 — Configurable Logbook Templates ✅

**Goal:** support different header sets per industry so one deployment serves security gates, classroom attendance, hospital registries, etc.

Implemented:
- **[NEW] `logbook_templates`** table with permissive RLS and idempotent starter seeds.
- **[MODIFY] `visiolog_scans`** — nullable `template_id` references the selected logbook template.
- **[REFACTOR] `visiolog_records`** — visitor-specific columns replaced by `data jsonb`; metadata remains, with GIN `data` and `review_status` indexes.
- **[REFACTOR] `api/lib/visitor-schema.js`** — field taxonomy, default fallback template, starter definitions, and template-derived Gemini prompts.
- **[REFACTOR] `api/lib/validation.js`** — phone/IMEI/time/date/required/identity/dedupe/confidence rules resolve from field types and flags.
- **[MODIFY] `api/process-scan.js`** — resolves the scan template, falls back to the default template, and stores template-linked records.

Starter templates and field decisions:
- **Security Gate / Visitor (`security_gate`, Security, default):** `name` (name, required, identity), `matric_number` (text, identity, dedupe), `staff_id` (text, identity), `visitor_category`, `department`, `faculty`, `hall`, `phone_number` (phone), `parent_phone` (phone), `phone_brand`, `phone_imei` (IMEI, dedupe), `laptop_brand`, `laptop_imei` (IMEI), `time_in` (time), `time_out` (time), `visit_date` (date), `security_officer`, `page_number` (number).
- **Classroom Attendance (`classroom_attendance`, Education):** `name` (name, required, identity), `matric_number` (text, identity, dedupe), `department`, `level` (number), `course_code`, `date` (date, required), `time_in` (time), `time_out` (time).
- **Hospital Registry (`hospital_registry`, Healthcare):** `visitor_name` (name, required, identity), `patient_name` (name, identity), `patient_id`, `ward`, `relationship`, `phone_number` (phone, dedupe), `time_in` (time), `time_out` (time), `visit_date` (date).

---

## M1-U — Minimal Uploader UX ✅

**Goal:** the officer app knows nothing about review/dashboard/analytics.

- **[MODIFY] `public/upload/index.html`** — flow is: capture/select page(s) → **preview** the batch → submit → **"Upload complete"** confirmation → **close / upload another**. Removed the redirect to `/data`; no links into the admin app. Added a template picker.
- **[MODIFY] `api/upload-scan.js`** — resolves the selected template key/id and stores `template_id` on each queued scan.

---

## M2 — Review & Correction UI 📋

**Goal:** administrators fix AI mistakes on flagged rows.

- Source image alongside extracted data (zoom/rotate/brightness/contrast).
- Edit field values; **approve** / **reject** / **reprocess** per record.
- Filter to `needs_review` / `invalid` records.
- Correction audit history (original vs. corrected values, who/when).

---

## M3 — Search & Dashboard 📋
Typed multi-field search/filters (name, matric, department, hall, phone, IMEI, date, time, officer), KPI cards, CSV/Excel/PDF export.

## M4 — Analytics 📋
Daily/weekly/monthly volume, peak entry/exit hours, top halls/departments, trends (ECharts).

## M5 — Auth & Roles 📋
Supabase Auth, RBAC (Officer=upload only; Admin=review/search/export; Super=full), RLS lockdown (replace permissive `using(true)` policies), and image retention (~3-month auto-delete of source images; structured records retained).

---

## Verification

- **Automated:** `npm test` (validation engine unit tests). `node --check` on changed API files. Build assets via `node deploy_product.js`.
- **Manual (per deployment):** run `supabase_schema.sql` in the Supabase SQL Editor; create the public `logbooks` storage bucket; set env vars (`GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `PASSCODE`); then exercise upload → process → review.
