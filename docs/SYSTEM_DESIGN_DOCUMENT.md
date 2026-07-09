# VISIOLOG — System Design Document

| Field              | Value                                                  |
|--------------------|--------------------------------------------------------|
| **Document Type**  | Software Architecture / System Design                  |
| **System**         | VISIOLOG — Intelligent Document Digitizer & Data Analytics Platform |
| **Version**        | 2.0                                                    |
| **Date**           | June 2026                                              |
| **Status**         | Active                                                 |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Product Tiers](#3-product-tiers)
4. [Architecture](#4-architecture)
5. [Component Design](#5-component-design)
6. [Data Flow](#6-data-flow)
7. [Interface Specifications](#7-interface-specifications)
8. [Data Model](#8-data-model)
9. [Security Design](#9-security-design)
10. [Deployment Architecture](#10-deployment-architecture)
11. [External Dependencies](#11-external-dependencies)
12. [Constraints & Limitations](#12-constraints--limitations)
13. [Glossary](#13-glossary)
14. [UI/UX System Specifications](#14-uiux-system-specifications)
15. [Frontend Architecture Details](#15-frontend-architecture-details)
16. [Concrete Integration Specifications](#16-concrete-integration-specifications)
17. [Engineering-Ready System Outputs](#17-engineering-ready-system-outputs)

---

## 1. Introduction

### 1.1 Purpose

This document describes the software architecture and design of **VISIOLOG**, a two-tier SaaS platform for digitizing physical logbook records and analyzing operational data. It serves as the single source of truth for understanding the system's structure, data flow, component responsibilities, interfaces, and design rationale.

### 1.2 Scope

VISIOLOG addresses the problem of converting handwritten or printed logbook pages into structured, searchable, editable digital data — and then turning that data into actionable intelligence. The system:

- Accepts photographs of logbook pages (camera capture or file upload).
- Uses AI-powered vision models to extract structured tabular data from the images.
- Provides a guided edit workflow — the AI suggests table structure, users review, edit (insert/delete/rename rows & columns), and click "Create".
- Persists all data with end-to-end encryption (AES-256 at rest, TLS 1.3 in transit).
- Provides a spreadsheet-like interface for viewing, editing, exporting, and managing the data (**Tier 1: Records Vault** — $8/month).
- Offers an integrated Intelligence Engine with manual and AI-assisted analytics, external data upload, chat-based tagging, and report generation (**Tier 2** — $23/month).

### 1.3 Terminology Note

VISIOLOG operates on **Records** — a deliberately broad term. A "record" is any structured physical document: a logbook, a register, a patrol sheet, an inspection form, a lab notebook, a stock count, or any tabular paper document. This is intentional: the platform serves any sector that generates paper-based structured data.

### 1.4 Intended Audience

- Developers maintaining or extending VISIOLOG.
- Stakeholders reviewing the system design.
- New contributors onboarding to the codebase.

### 1.5 Definitions

| Term                  | Definition                                                                                          |
|-----------------------|-----------------------------------------------------------------------------------------------------|
| Record                | Any physical structured document digitized via VISIOLOG (logbooks, registers, forms, etc.).        |
| Ingestion             | The process of uploading and extracting data from a logbook image.                                  |
| Records Vault            | Tier 1 product — the encrypted digital archive at `/data` for storing, retrieving, and managing records. |
| Intelligence Engine | Tier 2 product — manual + AI-assisted analytics suite with data upload and chat-based insights.      |
| Schema Context        | The set of existing column headers and a sample row sent to the AI model to maintain consistency across extractions. |
| Analytics Session     | An isolated, encrypted AI analytics context with a unique session ID per user.                      |
| Tagged Reference      | A user-applied tag on a record set or dataset that the AI assistant can reference in chat.          |
| External Data Upload  | A user-supplied CSV, Excel, or JSON file uploaded to the Intelligence Engine for analysis.          |

---

## 2. System Overview

### 2.1 Problem Statement

Organizations that maintain physical records — operations logs, attendance registers, inspection sheets, compliance forms, inventory counts — need a fast, accurate way to digitize and analyze this data without manual entry. Existing tools fail because:

- Generic OCR lacks contextual intelligence for tabular, handwritten data.
- Enterprise digitization suites are priced out of reach for most organizations.
- No solution combines capture + human review + encrypted storage + analytics in one affordable platform.

### 2.2 Solution

VISIOLOG combines a mobile-optimized capture interface with Google's Gemini 2.5 Flash vision model to intelligently extract structured data from photographed pages. The system operates as a **two-tier SaaS platform**:

**Tier 1 — Records Vault ($8/month)**:
1. Learns the schema from previously ingested records.
2. Applies that schema context to new extractions for consistency.
3. AI suggests table structure; users edit (insert, rename, delete rows/columns) and click "Create".
4. Deduplicates incoming rows against the existing dataset.
5. Encrypts and stores all data with AES-256 encryption.
6. Provides full-featured data management interface for retrieval and documentation.

**Tier 2 — Intelligence Engine ($23/month)**:
1. Everything in Tier 1.
2. Users can upload external datasets (CSV, Excel, JSON) for analysis.
3. AI model is connected to all user data — users tag and reference (@mention) specific datasets in chat.
4. Manual analytics: chart builders, pivot tables, filters, formulas.
5. AI-assisted analytics: trend detection, anomaly detection, pattern recognition.
6. Business report generation (PDF) — business plans, compliance reports, data summaries.
7. All data encrypted end-to-end with session-level isolation.

### 2.3 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER DEVICE                                │
│                                                                     │
│   ┌──────────────────┐     ┌─────────────────────┐     ┌─────────┐ │
│   │   /upload         │     │   /data              │     │ /analyze│ │
│   │   (Ingestion UI)  │     │   (Records Vault)        │     │ (Engine)│ │
│   │                   │     │                       │     │         │ │
│   │ • Camera capture  │     │ • Spreadsheet view    │     │ • Chat  │ │
│   │ • Gallery upload  │     │ • Inline editing      │     │ • Upload│ │
│   │ • AI suggestion   │     │ • Sort/Filter/Search  │     │ • Charts│ │
│   │ • Edit structure  │     │ • CSV/JSON export     │     │ • Tag & │ │
│   │ • Create/save     │     │ • Encrypted storage   │     │   Ref   │ │
│   └────────┬─────────┘     └──────────┬────────────┘     └────┬────┘ │
│            │                          │                       │      │
└────────────┼──────────────────────────┼───────────────────────┼──────┘
             │ HTTPS                    │ HTTPS                 │ HTTPS
             ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL SERVERLESS PLATFORM                     │
│                                                                     │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                     API Layer (/api/)                       │    │
│   │                                                             │    │
│   │  process-logbook    get-logbook     update-logbook          │    │
│   │  validate-passcode  clear-database  upload-data             │    │
│   │  cloudinary-images  delete-image    reprocess-images        │    │
│   │  analyze-data       generate-report  chat-analytics         │    │
│   └───────┬──────────────────┬────────────────────┬────────────┘    │
│           │                  │                    │                  │
└───────────┼──────────────────┼────────────────────┼──────────────────┘
            │                  │                    │
            ▼                  ▼                    ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
    │ Google Gemini │   │  Supabase    │   │  Cloudinary     │
    │ 2.5 Flash     │   │  (Database   │   │  (Image Store)  │
    │               │   │   + Auth +   │   │                  │
    │ Vision AI +   │   │   Encryption)│   │ Uploaded source  │
    │ Analytics AI  │   │              │   │ images           │
    └──────────────┘   └──────────────┘   └──────────────────┘
```

---

## 3. Product Tiers

### 3.1 Tier Overview

VISIOLOG operates on a two-tier subscription model. Both tiers share the same core ingestion pipeline and authentication system.

| Aspect                          | Tier 1 — Records Vault ($8/mo)           | Tier 2 — Intelligence Engine ($23/mo)          |
|---------------------------------|---------------------------------------|--------------------------------------------------|
| **Core Value**                  | Digitize, encrypt, store, retrieve    | Records Vault + AI analytics + external data        |
| **Target User**                 | Officers, clerks, operations managers | Analysts, compliance officers, decision-makers   |
| AI Extraction + Suggestion Step | Yes                                    | Yes                                               |
| Encrypted Storage               | Yes                                    | Yes                                               |
| Records Retrieval & Search      | Yes                                    | Yes                                               |
| Export (CSV, JSON)              | Yes                                    | Yes                                               |
| User Accounts                   | Yes                                    | Yes                                               |
| Session Management              | Yes                                    | Yes                                               |
| Image Archive                   | Yes                                    | Yes                                               |
| Manual Analytics                | No                                    | Yes                                               |
| AI Analytics Assistant (Chat)   | No                                    | Yes                                               |
| Tag & Reference System          | No                                    | Yes                                               |
| External Data Upload            | No                                    | Yes                                               |
| Automated Charts & Graphs       | No                                    | Yes                                               |
| MCP-Embedded Tool Calls         | No                                    | Yes                                               |
| Trend & Anomaly Detection       | No                                    | Yes                                               |
### 3.2 Tier 1 — Records Vault

The Records Vault tier is the foundational digitization and storage product. The core workflow is:

```
SCAN → AI SUGGESTION → USER EDITS → CREATE → ENCRYPTED VAULT → RETRIEVAL
```

Key responsibilities:
- Mobile-optimized image capture (camera or gallery).
- AI-powered table extraction with schema consistency across pages.
- **Suggestion Step**: Human-in-the-loop review. User can insert rows, delete rows, add columns, delete columns, rename column headers, and edit individual cells before committing.
- Encrypted data storage (AES-256 at rest, TLS 1.3 in transit).
- Retrieval interface with search, filter, sort, and export.

### 3.3 Tier 2 — Intelligence Engine

The Intelligence Engine builds on the Records Vault with a world-class analytics layer. It is designed to grow from basic summaries to complex, production-grade statistical analysis over time.

#### 3.3.1 AI Analytics Assistant

An embedded AI assistant (Gemini with function calling + MCP tools) integrated into the analytics workspace:

- Has access to **all** of the user's digitized records and uploaded data simultaneously.
- Supports **tagging**: users apply tags to record sets, date ranges, or uploaded files. Tags are referenced in chat using `@tagname` (e.g., `@patrol-june`, `@q2-inspections`, `@uploaded-inventory`).
- Generates contextually appropriate charts, tables, and visualizations on demand.
- Communicates through a dedicated chat panel within the analytics page.
- Operates within an isolated, encrypted session with a unique session ID managed by VISIOLOG.
- Uses embedded MCP tools to sort, filter, group, and render structured data directly within the chat thread.

#### 3.3.2 External Data Upload

Tier 2 users can upload their own external data files into the Intelligence Engine:

- **Supported formats**: CSV, Excel (.xlsx), JSON.
- Uploaded data is treated as a first-class source alongside scanned records.
- The AI assistant has full access to uploaded files for analysis, comparison, and cross-referencing.
- Uploaded data can be tagged and referenced in chat like any other dataset.
- All uploaded data is encrypted at rest under the same model as scanned records.
- Upload is managed via the `upload-data` API endpoint with user-scoped storage.

#### 3.3.3 Manual Analytics

User-controlled analytics tools for hands-on data analysis:

- Custom chart builder: bar, line, pie, scatter, heatmap.
- Pivot tables with drag-and-drop configuration.
- Advanced filters and grouping.
- Formula engine.
- Custom saved views and dashboards.
- Range from basic (totals, averages) to complex (regression, correlation, statistical outlier detection).

#### 3.3.4 MCP-Embedded Tools

The AI assistant has embedded tool capabilities that allow it to operate on data programmatically within the chat:

- Sort datasets by any field in ascending or descending order.
- Filter records by user-specified criteria (natural language → structured query).
- Group and aggregate data (sum, average, count, min, max by category).
- Render structured results as formatted tables or charts within the chat thread.
- Cross-reference multiple sources (scanned records + uploaded files + tagged subsets).



---

### 3.4 Session Management & Isolation

Every user session is managed by VISIOLOG:

- A unique session ID is generated per user per analytics session.
- Session state (AI context, active data sources, conversation history) is encrypted.
- Sessions are completely isolated between users at the infrastructure level.
- Session IDs are visible to users for trust, transparency, and support traceability.
- Sessions can be saved, resumed, or terminated by the user.

---

## 4. Architecture

### 4.1 Architectural Style

VISIOLOG uses a **serverless client-server architecture** with a **two-tier SaaS model**:

- **Frontend**: Static HTML/CSS/JS served from Vercel's CDN. No build step, no framework (evolving to React/Next.js for analytics).
- **Backend**: Vercel Serverless Functions (Node.js, ESM) acting as stateless API handlers.
- **Data**: Fully managed external services (Supabase for structured data + auth + encryption, Cloudinary for image assets).
- **AI**: Google Gemini 2.5 Flash for both vision extraction and analytics intelligence.
- **Encryption**: AES-256-GCM at rest, TLS 1.3 in transit, per-user key derivation.

### 4.2 Design Principles

| Principle                    | How It's Applied                                                                                          |
|------------------------------|-----------------------------------------------------------------------------------------------------------|
| **Zero-infrastructure**      | No servers or containers to manage. Fully PaaS/SaaS-hosted.                                               |
| **Mobile-first**             | The capture page is optimized for phone cameras — the primary input device.                               |
| **Schema consistency**       | Every extraction is schema-aware: AI receives existing headers + sample row as context.                   |
| **Human-in-the-loop**        | AI suggests; user confirms. No data is committed without user review in the Suggestion Step.              |
| **Idempotent ingestion**     | Deduplication at commit time prevents duplicate records.                                                  |
| **Encrypted by default**     | All user data is AES-256 encrypted at rest and TLS 1.3 in transit. No opt-out.                           |
| **Tenant isolation**         | Supabase Row-Level Security ensures each user's data is isolated at the database query level.             |
| **Session-scoped analytics** | Every analytics session has a unique ID. AI context is encrypted and isolated per user per session.       |
| **Progressive disclosure**   | Capture page is minimal. Analytics workspace reveals depth progressively.                                 |

### 4.3 Technology Stack

| Layer        | Technology                                    | Rationale                                    |
|--------------|-----------------------------------------------|----------------------------------------------|
| Frontend     | Vanilla HTML, CSS, JavaScript → React/Next.js | No build step initially; evolving for analytics |
| Backend      | Vercel Serverless Functions (Node.js 18+, ESM)| Zero-config, auto-scaling, global edge       |
| AI Engine    | Google Gemini 2.5 Flash (`@google/generative-ai`) | Vision extraction + analytics intelligence |
| Database     | Supabase (PostgreSQL + Row-Level Security)    | Scalable, encrypted, multi-tenant            |
| Image Store  | Cloudinary                                    | CDN-backed image management with transforms  |
| Encryption   | AES-256-GCM + TLS 1.3 + per-user keys         | End-to-end data protection                   |
| Auth         | Supabase Auth (email, OAuth)                  | User accounts, session management            |
| Payments     | Stripe Billing                                | Subscription management for two tiers        |
| Form Parsing | `formidable` v3                               | Battle-tested multipart form parsing         |
| Routing      | `vercel.json`                                 | Declarative routing, rewrites, redirects     |

---

## 5. Component Design

### 5.1 Frontend Components

#### 5.1.1 Capture Page (`/upload`)

**File**: `public/upload/index.html`

**Responsibility**: Capture record images and submit them for AI extraction.

**UI States**:

```
┌──────────┐  file selected  ┌──────────┐  submit  ┌──────────────┐  response  ┌──────────────────┐
│  UPLOAD  │ ───────────────▶│  PREVIEW │ ────────▶│   LOADING    │ ──────────▶│  SUGGESTION STEP │
│   VIEW   │                 │          │          │   (+ game)   │            │  (Table Editor)  │
└──────────┘                 └──────────┘          └──────────────┘            └────────┬─────────┘
      ▲                           │                                                      │ [CREATE]
      │        remove file        │                                                      ▼
      │◀──────────────────────────┘                                              ┌──────────────┐
      │                                                                          │   SUCCESS    │
      └──────────────────────────────────────────── "Submit Another" ───────────│   VIEW       │
                                                                                 └──────────────┘
```

**Sub-components**:

| Component            | Purpose                                                                                    |
|----------------------|--------------------------------------------------------------------------------------------|
| Auth Gate            | Blocks access unless Supabase Auth session is valid. Redirects to `/login` if not.         |
| Drop Zone            | Camera capture (`capture="environment"`) or gallery file picker.                            |
| File Preview         | Thumbnail + filename + size display with remove option.                                     |
| Loading View         | Circular progress timer with status messages. Includes dino mini-game toggle.              |
| Dino Game Overlay    | Canvas-based Chrome-style dinosaur runner game (easter egg during processing wait).         |
| **Suggestion Step**  | AI-generated table preview displayed to user before any data is saved.                      |
| **Table Editor**     | Insert row, delete row, add column, delete column, rename column header, edit cell value.   |
| **Create Button**    | Confirms the edited table and commits data to the encrypted Records Vault.                  |
| Success View         | Confirmation screen with "Submit Another Record" action.                                    |
| Toast System         | Non-blocking success/error/warning notifications.                                           |
| Theme Toggle         | Dark/light mode switch, persisted to `localStorage`.                                        |

#### 5.1.2 Records Vault Dashboard (`/data`)

**File**: `public/data/index.html` (~4,330 lines)

**Responsibility**: Full-featured spreadsheet interface for managing extracted data. This is the core Tier 1 experience.

**Features**:

| Feature Category | Capabilities                                                                                        |
|------------------|-----------------------------------------------------------------------------------------------------|
| **Viewing**      | Tabular data display, row numbering (S/N), day-boundary color markers, frozen headers, zoom         |
| **Editing**      | Toggle edit mode, inline cell editing, formula bar, contenteditable cells + headers                 |
| **Selection**    | Click, Shift+Click range select, Ctrl+Click multi-select, row selection via S/N column              |
| **Manipulation** | Add/delete rows, add/delete columns, duplicate rows, move rows up/down                              |
| **Filtering**    | Column-specific text filter bar, toggle visibility                                                  |
| **Sorting**      | Click column headers to sort ascending/descending                                                   |
| **Export**       | CSV download, JSON download, clipboard copy                                                         |
| **Persistence**  | Save edits back to Supabase via `update-records` API                                                |
| **Tagging**      | *(Tier 2)* Apply tags to records, date ranges, or column groups for AI assistant reference          |
| **Image Mgmt**   | View uploaded Cloudinary images, delete images, reprocess images through AI                         |
| **Context Menu** | Right-click context menu for row/cell operations                                                    |
| **Undo**         | Row deletion undo via toast notification                                                             |

#### 5.1.3 Intelligence Engine (`/analyze`) — Tier 2 Only

**File**: `public/analyze/index.html`

**Responsibility**: Two-panel analytics workspace — manual analytics tools (left panel) + AI assistant chat (right panel).

**Layout**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  VISIOLOG Intelligence Engine                    [Session: #a3f9...]│
├──────────────────────────────┬──────────────────────────────────────┤
│   MANUAL ANALYTICS PANEL     │      AI ASSISTANT CHAT PANEL         │
│                              │                                      │
│  Data Sources:               │  ┌────────────────────────────────┐  │
│  ● Scanned Records ▼         │  │ VISIOLOG AI                   │  │
│  ● Uploaded Files ▼          │  │                                │  │
│  ● @tagged-datasets ▼        │  │ Connected to: patrol-records,  │  │
│                              │  │ @q2-inspections, uploaded.csv  │  │
│  [Upload CSV/Excel/JSON]     │  │                                │  │
│                              │  │ What would you like to explore?│  │
│  Chart Builder:              │  └────────────────────────────────┘  │
│  [Bar][Line][Pie][Scatter]   │                                      │
│                              │  > Analyse @patrol-june and compare  │
│  [Build Chart]               │    with my uploaded inventory data   │
│                              │                                      │
│  Pivot Tables:               │  ┌────────────────────────────────┐  │
│  [Configure Pivot]           │  │ [Chart: Activity Trend — June] │  │
│                              │  │                                │  │
│  Filters & Groups:           │  │ Peaks on Tuesdays. Uploaded    │  │
│  [Add Filter]                │  │ data shows 23% spike 18-22:00. │  │
│                              │  └────────────────────────────────┘  │
│  Saved Dashboards:           │                                      │
│  [View Dashboards]           │  [Type a message... @tag to ref]     │
└──────────────────────────────┴──────────────────────────────────────┘
```

**Sub-components**:

| Component              | Description                                                                                |
|------------------------|--------------------------------------------------------------------------------------------|
| Data Source Panel      | Lists all available sources: scanned records, tagged sets, uploaded files                  |
| File Upload            | Drag-and-drop or file picker for CSV, Excel, JSON. Encrypts and registers the data source. |
| Tag Manager            | Apply, edit, and remove tags on record sets and uploaded files                             |
| Chart Builder          | User-controlled: select chart type, axes, grouping, color                                  |
| Pivot Table Builder    | Drag-and-drop row/column/value configuration                                               |
| Filter Panel           | Add compound filters on any field across any data source                                   |
| AI Chat Panel          | Persistent chat thread with the analytics assistant                                        |
| `@` Tag Reference      | Auto-complete for tagged datasets inline in chat input                                     |
| MCP Tool Renderer      | Renders charts, tables, and formatted data returned by AI tool calls within chat           |
| Session Badge          | Displays the current session ID. Click to copy or manage session.                          |
| Session Manager        | Save, resume, or terminate analytics sessions                                              |

---

#### 5.1.4 Auth Pages (`/login`, `/signup`, `/account`)

| Page       | Responsibility                                                                             |
|------------|--------------------------------------------------------------------------------------------|
| `/signup`  | New user registration via Supabase Auth (email + password, or OAuth).                      |
| `/login`   | Authenticates user, issues Supabase session token, redirects to `/upload`.                 |
| `/account` | Subscription status (Stripe), billing management, data export, account deletion.           |

---

### 5.2 Backend Components (Serverless API)

All API handlers: `export default async function handler(req, res)` on Vercel.

Every handler validates the Supabase JWT before processing any data.

#### 5.2.1 `process-record` — AI Extraction (Suggestion Step)

**File**: `api/process-record.js`

Orchestrates AI extraction and returns a **suggestion** — does NOT save data.

```
POST /api/process-record
        │
        ▼
1. Verify Supabase JWT
        │
        ▼
2. Parse image (formidable)
        │
        ▼
3. Fetch schema context from Supabase
   (user's existing headers + sample row)
        │
        ▼
4. Build schema-aware prompt
        │
        ▼
5. Call Gemini 2.5 Flash (image + prompt)
        │
        ▼
6. Parse JSON from model response
   (multi-layer: find boundaries → strip
    trailing commas → fallback sanitize)
        │
        ▼
7. Return suggestion to frontend
   *** DATA IS NOT SAVED ***
        │
        ▼
[User reviews in Suggestion Step Table Editor]
[User inserts/deletes rows, adds/removes columns,
 renames headers, edits cells]
        │
        ▼ [CREATE clicked]
8. Frontend POSTs confirmed data
   → commit-record endpoint
```

#### 5.2.2 `commit-record` — Confirmed Data Persistence

**File**: `api/commit-record.js`

Receives user-confirmed (and potentially edited) table data and persists it.

```
POST /api/commit-record
        │
        ▼
1. Verify Supabase JWT
        │
        ▼
2. Validate payload (array of objects)
        │
        ▼
3. Deduplicate against existing user records
   (≤1 field difference = duplicate)
        │
        ▼
4. Encrypt record data (AES-256-GCM,
   user-scoped key)
        │
        ▼
5. INSERT into Supabase (user_id scoped,
   RLS enforced)
        │
        ▼
6. Return updated record set to frontend
```

#### 5.2.3 Supporting API Handlers

| Handler              | File                          | Logic Summary                                                                        |
|----------------------|-------------------------------|--------------------------------------------------------------------------------------|
| `get-records`        | `api/get-records.js`          | Authenticated GET. Fetches user's records from Supabase (RLS-scoped). Decrypts.      |
| `update-records`     | `api/update-records.js`       | Accepts full record array, validates, encrypts, and overwrites user's Supabase rows. |
| `clear-vault`        | `api/clear-vault.js`          | Deletes all records for the authenticated user. Confirmation-gated.                  |
| `upload-data`        | `api/upload-data.js`          | *(Tier 2)* Accepts CSV/Excel/JSON file. Parses, encrypts, stores in Supabase as a named data source for the user. |
| `analytics-query`    | `api/analytics-query.js`      | *(Tier 2)* Executes structured analytics queries (filter, group, aggregate) across user's records + uploaded data. |
| `analytics-chat`     | `api/analytics-chat.js`       | *(Tier 2)* Streams Gemini response with function calling. Resolves @tag references, calls MCP tools, returns AI response + rendered data. |
| `manage-session`     | `api/manage-session.js`       | *(Tier 2)* Create, retrieve, save, or terminate an analytics session. Returns session ID. |
| `validate-session`   | `api/validate-session.js`     | Verifies Supabase JWT and checks user's active tier (Tier 1 or Tier 2) against Stripe. |
| `cloudinary-images`  | `api/cloudinary-images.js`    | Lists up to 50 resources from user's Cloudinary folder. Returns metadata.            |
| `delete-image`       | `api/delete-image.js`         | Deletes a Cloudinary resource by `public_id`.                                        |
| `reprocess-images`   | `api/reprocess-images.js`     | Fetches image from Cloudinary, sends to `process-record` for re-extraction.          |
| `stripe-webhook`     | `api/stripe-webhook.js`       | Handles Stripe billing events: subscription created, upgraded, cancelled, payment failed. Updates user tier in Supabase. |

---

## 6. Data Flow

### 6.1 Ingestion Flow — Scan → Suggest → Edit → Create

```
User opens /upload
        │
        ▼
[Auth Gate] → Supabase session check → redirect /login if invalid
        │
        ▼
User captures / selects image
        │
        ▼
[File Preview shown]
        │
        ▼
User taps "Process"
        │
        ▼
[Loading View + optional Dino Game]
        │
        │   POST /api/process-record (multipart: image file + JWT)
        │
        ▼
Server:
  1. Verify JWT
  2. Parse image → base64
  3. GET schema context from Supabase (headers + sample row)
  4. Build schema-aware prompt
  5. Send image + prompt → Gemini 2.5 Flash
  6. Parse JSON from Gemini response
  7. Return SUGGESTION (not saved)
        │
        ▼
[SUGGESTION STEP — Table Editor]
  User sees AI-generated table
  User can: insert row / delete row / add column /
            delete column / rename header / edit cell
        │
        ▼ [User clicks CREATE]
POST /api/commit-record (confirmed data + JWT)
        │
        ▼
Server:
  1. Verify JWT
  2. Validate payload
  3. Deduplicate against existing records
  4. Encrypt data (AES-256-GCM)
  5. INSERT into Supabase (RLS-scoped to user_id)
  6. Return updated record set
        │
        ▼
[Success View] → "Submit Another Record"
```

### 6.2 Records Vault Flow

```
User opens /records
        │
        ▼
GET /api/get-records + JWT → Supabase (RLS) → decrypt → JSON array
        │
        ▼
[Render spreadsheet table]
        │
        ├── [Edit Mode] → inline editing → [Save] → PUT /api/update-records → Supabase
        ├── [Filter / Sort] → client-side
        ├── [Export] → CSV / JSON download
        ├── [Tag records] → (Tier 2) → stored in Supabase as tag metadata
        ├── [Image Gallery] → GET /api/cloudinary-images
        │       ├── [Delete Image] → DELETE /api/delete-image
        │       └── [Reprocess] → POST /api/reprocess-images → process-record
        └── [Clear Vault] → DELETE /api/clear-vault → Supabase reset
```

### 6.3 Intelligence Engine Flow — Tier 2

```
User opens /analytics
        │
        ▼
[Tier check] → validate-session → Stripe subscription active at Tier 2?
        │
        ▼
[Session Init] → manage-session → create or resume session (unique ID)
        │
        ▼
Data sources loaded:
  • GET /api/get-records → user's scanned records (decrypted)
  • GET user's uploaded files from Supabase (decrypted)
  • GET user's tag metadata
        │
        ├── [Manual Analytics]
        │       ├── User builds chart → analytics-query → structured result → render chart
        │       ├── User builds pivot → analytics-query → aggregated result → render pivot
        │       └── User filters/groups → client-side or analytics-query
        │
        ├── [Upload Data]
        │       └── POST /api/upload-data (CSV/Excel/JSON + JWT)
        │               → parse → encrypt → store in Supabase as named source
        │               → available immediately in AI chat and manual tools
        │
        └── [AI Chat]
                ├── User types message (can include @tagname references)
                ├── POST /api/analytics-chat (message + session ID + JWT)
                │       → resolve @tag references → load relevant data
                │       → build context (records + uploads + tags + history)
                │       → call Gemini with function calling enabled
                │       → Gemini invokes MCP tools as needed:
                │           • sort_data(field, direction)
                │           • filter_data(criteria)
                │           • aggregate_data(group_by, metric)
                │           • generate_chart(type, x, y, data)
                │       → stream response + tool outputs back to frontend
                └── [Render] → AI text + charts/tables in chat panel
```

---

## 7. Interface Specifications

### 7.1 API Endpoints

#### `POST /api/process-record`

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Content-Type** | `multipart/form-data`                                                |
| **Body**         | `file`: image file (JPEG, PNG) — required                            |
|                  | `customPrompt`: string — optional, overrides default extraction prompt|
| **Response 200** | `{ suggestion: [...] }` — AI-generated table, NOT saved              |
| **Response 401** | `{ error: "Unauthorized" }`                                          |
| **Response 400** | `{ error: "Missing image in the payload." }`                         |
| **Response 500** | `{ error: "<message>" }`                                             |

#### `POST /api/commit-record`

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Content-Type** | `application/json`                                                   |
| **Body**         | JSON array of confirmed record objects                                |
| **Response 200** | `{ success: true, records: [...] }` — full user record set           |
| **Response 400** | `{ error: "Invalid data format." }`                                  |
| **Response 401** | `{ error: "Unauthorized" }`                                          |

#### `GET /api/get-records`

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Response 200** | JSON array of all decrypted records for the authenticated user        |
| **Response 401** | `{ error: "Unauthorized" }`                                          |

#### `PUT /api/update-records`

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Content-Type** | `application/json`                                                   |
| **Body**         | Full JSON array of record objects                                     |
| **Response 200** | `{ success: true }`                                                  |

#### `POST /api/upload-data` *(Tier 2)*

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Tier Check**   | Requires Tier 2 subscription                                         |
| **Content-Type** | `multipart/form-data`                                                |
| **Body**         | `file`: CSV, Excel, or JSON file; `name`: user-defined dataset name   |
| **Response 200** | `{ success: true, dataSourceId: "<id>", name: "<name>", rows: N }`  |

#### `POST /api/analytics-chat` *(Tier 2)*

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Tier Check**   | Requires Tier 2 subscription                                         |
| **Content-Type** | `application/json`                                                   |
| **Body**         | `{ message, sessionId, tagRefs: [...] }`                             |
| **Response 200** | Streamed: `{ text, toolOutputs: [{ type, data }] }`                 |

#### `POST /api/manage-session` *(Tier 2)*

| Field            | Details                                                               |
|------------------|-----------------------------------------------------------------------|
| **Auth**         | `Authorization: Bearer <supabase_jwt>`                               |
| **Body**         | `{ action: "create"|"resume"|"save"|"terminate", sessionId? }`       |
| **Response 200** | `{ sessionId, createdAt, status }`                                   |

#### Legacy / Unchanged Endpoints

| Endpoint                  | Method | Summary                                               |
|---------------------------|--------|-------------------------------------------------------|
| `/api/clear-vault`        | DELETE | Clears all records for authenticated user             |
| `/api/cloudinary-images`  | GET    | Lists user's uploaded source images                   |
| `/api/delete-image`       | DELETE | Deletes a Cloudinary image by `public_id`             |
| `/api/reprocess-images`   | POST   | Re-runs AI extraction on a stored Cloudinary image    |
| `/api/stripe-webhook`     | POST   | Handles Stripe billing lifecycle events               |

### 7.2 External Service Interfaces

| Service      | Protocol    | Operations Used                                        | Auth Mechanism                      |
|--------------|-------------|--------------------------------------------------------|-------------------------------------|
| Gemini API   | HTTPS/REST  | `generateContent` (text + inline image + function call)| API key (`GEMINI_API_KEY`)          |
| Supabase     | HTTPS/SDK   | Auth, PostgreSQL CRUD, RLS, storage                    | Service role key + user JWT         |
| Cloudinary   | HTTPS/SDK   | `resources` (list), `delete_resources`                 | Cloud name + API key + secret        |
| Stripe       | HTTPS/SDK   | Subscription create/update/cancel, webhook events      | Secret key + webhook signing secret  |

---

## 8. Data Model

### 8.1 Supabase Schema

#### `users` (managed by Supabase Auth)

| Column       | Type      | Notes                              |
|--------------|-----------|------------------------------------|
| `id`         | uuid (PK) | Supabase Auth user ID              |
| `email`      | text      | User email                         |
| `created_at` | timestamp | Account creation time              |

#### `subscriptions`

| Column            | Type      | Notes                                   |
|-------------------|-----------|-----------------------------------------|
| `id`              | uuid (PK) |                                         |
| `user_id`         | uuid (FK) | References `auth.users.id`              |
| `tier`            | integer   | 1 = Records Vault, 2 = Intelligence Engine |
| `stripe_customer_id` | text   | Stripe customer identifier             |
| `stripe_subscription_id` | text | Stripe subscription identifier      |
| `status`          | text      | `active`, `cancelled`, `past_due`       |
| `updated_at`      | timestamp |                                         |

#### `records`

| Column        | Type      | Notes                                                  |
|---------------|-----------|--------------------------------------------------------|
| `id`          | uuid (PK) |                                                        |
| `user_id`     | uuid (FK) | References `auth.users.id` — RLS enforced on this key |
| `data`        | jsonb     | AES-256-GCM encrypted record row (JSON object)         |
| `source_image`| text      | Cloudinary public_id of source image                   |
| `created_at`  | timestamp |                                                        |
| `tags`        | text[]    | User-applied tags for AI referencing *(Tier 2)*        |

#### `data_sources` *(Tier 2)*

| Column       | Type      | Notes                                             |
|--------------|-----------|---------------------------------------------------|
| `id`         | uuid (PK) |                                                   |
| `user_id`    | uuid (FK) | RLS-scoped                                        |
| `name`       | text      | User-defined name for the uploaded dataset         |
| `data`       | jsonb     | AES-256-GCM encrypted parsed file content         |
| `format`     | text      | `csv`, `excel`, `json`                            |
| `row_count`  | integer   |                                                   |
| `tags`       | text[]    | User-applied tags                                 |
| `uploaded_at`| timestamp |                                                   |

#### `analytics_sessions` *(Tier 2)*

| Column          | Type      | Notes                                          |
|-----------------|-----------|------------------------------------------------|
| `id`            | uuid (PK) | The session ID shown to the user               |
| `user_id`       | uuid (FK) | RLS-scoped                                     |
| `context`       | jsonb     | Encrypted AI conversation history + state      |
| `active_sources`| text[]    | Data source IDs active in this session         |
| `created_at`    | timestamp |                                                |
| `last_active`   | timestamp |                                                |
| `status`        | text      | `active`, `saved`, `terminated`                |

### 8.2 Record Data Format

Each record row is stored as an encrypted JSON object. Decrypted, it looks like:

```json
{
  "Date": "15/06/2026",
  "Time": "08:30",
  "Officer Name": "J. Doe",
  "Vessel": "MV Pacific Star",
  "Activity": "Arrival inspection",
  "Remarks": "All clear"
}
```

- **Dynamic schema**: Columns are inferred by AI from the first record image. Maintained via schema context.
- **No primary key within data**: Deduplication relies on fuzzy field-by-field comparison at commit time.
- **Flat structure**: No nested objects or arrays.
- **Null handling**: Missing or illegible values are `null`.

### 8.3 Encryption Model

All user data (`records.data`, `data_sources.data`, `analytics_sessions.context`) is encrypted before storage:

```
plaintext JSON
      │
      ▼
AES-256-GCM encryption
  key = PBKDF2(user_secret, salt, 100000 iterations, SHA-256)
  IV = random 12 bytes per record
      │
      ▼
{ iv: <base64>, ciphertext: <base64>, tag: <base64> }
      │
      ▼
stored in Supabase jsonb column
```

- User secret is derived from user credentials + server-side pepper (`ENCRYPTION_PEPPER` env var).
- Key rotation is supported by re-encrypting with a new key on user password change.

---

## 9. Security Design

### 9.1 Authentication

| Aspect           | Implementation                                                                          |
|------------------|-----------------------------------------------------------------------------------------|
| **Mechanism**    | Supabase Auth — email/password + OAuth (Google, etc.)                                   |
| **Session**      | Supabase JWT, stored in `localStorage`. Auto-refreshed by Supabase client.             |
| **API Auth**     | Every API handler validates `Authorization: Bearer <jwt>` via Supabase service client. |
| **Tier Check**   | `validate-session` checks `subscriptions` table for active tier before Tier 2 access.  |

### 9.2 Encryption Layers

| Layer                  | Mechanism                                               |
|------------------------|---------------------------------------------------------|
| Transport              | TLS 1.3 (enforced by Vercel and Supabase)               |
| Application (data)     | AES-256-GCM per-record encryption before Supabase write |
| Storage (Supabase)     | Supabase at-rest encryption (AES-256)                   |
| Session (analytics)    | AES-256-GCM encrypted session context per session ID    |

### 9.3 Row-Level Security (Supabase RLS)

All tables have RLS policies enforcing user isolation:

```sql
-- Example RLS policy for records table
CREATE POLICY "Users can only access their own records"
ON records
FOR ALL
USING (auth.uid() = user_id);
```

No query can return data belonging to a different user, regardless of application-level bugs.

### 9.4 HTTP Security Headers

Configured in `vercel.json` for all routes:

| Header                    | Value                              | Purpose                    |
|---------------------------|------------------------------------|----------------------------|
| `X-Content-Type-Options`  | `nosniff`                          | Prevent MIME-type sniffing |
| `X-Frame-Options`         | `DENY`                             | Block iframe embedding     |
| `X-XSS-Protection`        | `1; mode=block`                    | Legacy XSS filter          |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`  | Limit referrer leakage     |

API routes additionally:

| Header                          | Value      | Purpose                    |
|---------------------------------|------------|----------------------------|
| `Access-Control-Allow-Origin`   | (origin-scoped in production) | Restrict CORS |
| `Cache-Control`                 | `no-store` | Prevent response caching   |

### 9.5 Known Security Considerations (Migrated from v1.0)

| Item                            | Status in v2.0                                                       | Severity |
|---------------------------------|----------------------------------------------------------------------|----------|
| Passcode auth replaced          | Replaced by Supabase Auth (JWT). Fully resolved.                     | Yes Fixed |
| JSONBin master key in repo      | JSONBin replaced by Supabase. `create_bin.js` to be deleted.         | Yes Fixed |
| Open CORS (`*`)                 | CORS restricted to known origins in production.                       | Yes Fixed |
| No API auth middleware          | All API handlers now validate Supabase JWT.                           | Yes Fixed |

---

## 10. Deployment Architecture

### 10.1 Platform

VISIOLOG is deployed on **Vercel** with Supabase as the database/auth backend:

```
Repository (GitHub)
       │
       │  Push / Merge
       ▼
┌─────────────────────────────────────────────┐
│              Vercel Platform                 │
│                                             │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Static Files    │  │ Serverless Fns   │  │
│  │  (CDN Edge)      │  │ (Node.js 18+)    │  │
│  │                  │  │                  │  │
│  │  public/         │  │  api/            │  │
│  │  ├── upload/     │  │  ├── process-    │  │
│  │  ├── records/    │  │  │   record.js   │  │
│  │  ├── analytics/  │  │  ├── commit-     │  │
│  │  ├── login/      │  │  │   record.js   │  │
│  │  ├── signup/     │  │  ├── analytics-  │  │
│  │  ├── account/    │  │  │   chat.js     │  │
│  │  └── 404.html    │  │  └── ...         │  │
│  └─────────────────┘  └──────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │       Supabase         │
       │  PostgreSQL + Auth     │
       │  + RLS + Storage       │
       └────────────────────────┘
```

### 10.2 Routing Configuration (`vercel.json`)

| Rule Type | Source          | Destination                | Notes                    |
|-----------|-----------------|----------------------------|--------------------------|
| Redirect  | `/`             | `/upload`                  | Root → capture page      |
| Rewrite   | `/upload`       | `/upload/index.html`       | Clean URL                |
| Rewrite   | `/records`      | `/records/index.html`      | Clean URL                |
| Rewrite   | `/analytics`    | `/analytics/index.html`    | Clean URL (Tier 2)       |
| Rewrite   | `/login`        | `/login/index.html`        | Clean URL                |
| Rewrite   | `/signup`       | `/signup/index.html`       | Clean URL                |
| Rewrite   | `/account`      | `/account/index.html`      | Clean URL                |
| Rewrite   | `/(.*)`         | `/404.html`                | Catch-all → 404          |

### 10.3 Environment Variables

| Variable                    | Required By                         | Description                                    |
|-----------------------------|-------------------------------------|------------------------------------------------|
| `GEMINI_API_KEY`            | `process-record`, `analytics-chat`  | Google AI Studio API key                       |
| `SUPABASE_URL`              | All data endpoints                  | Supabase project URL                           |
| `SUPABASE_SERVICE_ROLE_KEY` | All data endpoints                  | Supabase service role key (server-side only)   |
| `ENCRYPTION_PEPPER`         | `commit-record`, `update-records`   | Server-side secret for key derivation          |
| `CLOUDINARY_CLOUD_NAME`     | Image management endpoints          | Cloudinary cloud name                          |
| `CLOUDINARY_API_KEY`        | Image management endpoints          | Cloudinary API key                             |
| `CLOUDINARY_API_SECRET`     | Image management endpoints          | Cloudinary API secret                          |
| `STRIPE_SECRET_KEY`         | `stripe-webhook`, `validate-session`| Stripe secret key                              |
| `STRIPE_WEBHOOK_SECRET`     | `stripe-webhook`                    | Stripe webhook signing secret                  |
| `VERCEL_URL`                | `reprocess-images`                  | Auto-set by Vercel; used for self-calls        |

---

## 11. External Dependencies

### 11.1 Runtime Dependencies

| Package                  | Version   | Purpose                                                    |
|--------------------------|-----------|------------------------------------------------------------|
| `@google/generative-ai`  | ^0.11.0   | Google Gemini SDK — vision extraction + function calling    |
| `formidable`             | ^3.5.1    | Multipart form data parsing for image and file uploads      |
| `@supabase/supabase-js`  | ^2.x      | Supabase client for auth, database, and storage             |
| `stripe`                 | ^14.x     | Stripe SDK for subscription billing and webhook handling    |

### 11.2 External Services

| Service       | Free Tier Limits                            | Impact if Unavailable                           |
|---------------|---------------------------------------------|-------------------------------------------------|
| **Gemini API**    | Rate-limited; usage-based billing       | Image processing + AI chat fail entirely        |
| **Supabase**      | 500MB DB; 1GB storage; 50K MAU (free)   | All data operations and auth fail               |
| **Cloudinary**    | 25 credits/month (free)                 | Image gallery and reprocessing unavailable      |
| **Stripe**        | No monthly fee; 2.9% + $0.30 per txn   | Billing and tier management unavailable         |
| **Vercel**        | 100GB bandwidth; 100 hours serverless   | Entire application unavailable                  |

### 11.3 Migration from v1.0

| v1.0 Dependency | v2.0 Replacement | Reason                                    |
|-----------------|------------------|-------------------------------------------|
| JSONBin.io      | Supabase         | 100KB limit; no auth; no multi-tenancy    |
| `PASSCODE` env  | Supabase Auth    | Single passcode cannot support user accounts |
| `sessionStorage` auth | Supabase JWT | Proper session management needed         |

---

## 12. Constraints & Limitations

### 12.1 Technical Constraints

| Constraint                  | Description                                                                                            |
|-----------------------------|--------------------------------------------------------------------------------------------------------|
| **Vercel function timeout**  | Serverless functions: 10s (Hobby) / 60s (Pro). Complex images or large analytics queries may time out. |
| **Gemini context window**    | The analytics assistant context is bounded by Gemini's token limit. Very large datasets need chunking. |
| **No real-time sync**        | The records vault loads data at once. Concurrent edits from multiple devices may conflict.              |
| **No row-level identity**    | Record rows have no primary key. Deduplication is heuristic (≤1 field diff).                           |
| **No offline support**       | No service worker. The app requires connectivity.                                                       |
| **Single-file frontend**     | The records page is a large inline HTML/CSS/JS file. Refactoring needed as analytics complexity grows. |

### 12.2 AI / Extraction Limitations

| Limitation                    | Description                                                                                      |
|-------------------------------|--------------------------------------------------------------------------------------------------|
| **Handwriting quality**       | Accuracy depends on legibility. Poor handwriting produces nulls or bracketed guesses.            |
| **Schema drift**              | If first uploaded image differs from later pages, headers may diverge. Context mitigates this.   |
| **Non-tabular layouts**       | System assumes tabular pages. Freeform notes or non-standard layouts may confuse the model.      |
| **Language support**          | Prompt is English-only. Non-English logbooks may produce inconsistent results.                   |
| **Analytics depth**           | Complex statistical analysis (regression, ML models) is a roadmap item, not available at launch. |

---

## 13. Glossary

| Term                    | Definition                                                                                        |
|-------------------------|---------------------------------------------------------------------------------------------------|
| **VISIOLOG**           | Intelligent Records Platform. A portmanteau suggesting "barcode/archive scanning."                |
| **Record**              | Any physical structured document digitized via VISIOLOG.                                         |
| **Records Vault**       | Tier 1 product — the encrypted storage and retrieval system for digitized records.                |
| **Intelligence Engine** | Tier 2 product — analytics, AI assistant, and data analysis layer.                               |
| **Ingestion**           | The process of uploading an image and AI-extracting structured data from it.                      |
| **Suggestion Step**     | The AI-generated table preview the user reviews and edits before clicking Create.                 |
| **Schema Context**      | Existing column headers and a sample data row sent to Gemini for extraction consistency.          |
| **Deduplication**       | Comparing confirmed rows against existing records to prevent duplicate entries.                   |
| **Tagged Reference**    | A user-applied tag on a record set or uploaded file, referenced via `@tagname` in AI chat.       |
| **Analytics Session**   | An isolated, encrypted AI analytics context with a unique session ID per user.                    |
| **External Data Upload**| A user-supplied CSV, Excel, or JSON file uploaded to the Intelligence Engine for analysis.        |
| **MCP Tool**            | A Model Context Protocol-embedded tool the AI assistant can invoke to operate on data.            |
| **RLS**                 | Row-Level Security — Supabase/PostgreSQL feature ensuring users only access their own data.       |
| **Day Marker**          | A colored border on table rows in the records vault that visually separates records by date.      |
| **Formula Bar**         | An input field in the records vault (similar to Excel) for editing the currently selected cell.   |
| **Supabase**            | The cloud database, auth, and storage platform replacing JSONBin in v2.0.                         |
| **Stripe**              | The payment platform managing VISIOLOG's subscription billing and tier enforcement.              |

---

## 14. UI/UX System Specifications

### 14.1 Navigation Topology
The architectural flow of the VISIOLOG platform relies on a heavily streamlined navigation model that ensures context isolation.
*   **Public Interfaces**: The Landing/Marketing layout directs unconditionally to Authentication or Pricing.
*   **Workspace Shell**: Acts as the authenticated container, exposing persistent peripheral navigation (sidebar/topbar). It houses the Dashboard, Document Library, Tables (Spreadsheet Editor), Capture Portal, and robust utility modules like Reports, Search, and settings domains.
*   **Contextual Modalities**:
    *   *Document Detail* triggers a split-view linkage with its respective *Spreadsheet Row*.
    *   The *Capture Portal* follows a linear progression: Upload → Camera → Preview → Processing → Results.
    *   Administrative modules break down cleanly into User Management, Role Mapping, and Security Policy enforcement.

### 14.2 Core Interaction Pathways
The system is anchored by several principal operational journeys designed to maximize throughput and minimize user friction:
1.  **First-Time Invocation**: A seamless sequence from sign-in to workspace instantiation, concluding when the initial document is ingested and translated into an editable table format.
2.  **High-Velocity Capture**: The Capture Portal is aggressively pared down to merely uploading or scanning, affixing optional taxonomy (titles/comments), and submitting to the processing queue.
3.  **Data Verification**: Within the Document Library, users engage a split-pane inspector. Edits made to extracted fields immediately synchronize with the underlying tabular representation, with every mutation captured by an immutable audit trail.
4.  **Spreadsheet Operations**: Comprehensive grid interactions (filtering, sorting, bulk mutation, and temporal undo/redo) function seamlessly while preserving perfect parity with the canonical document origin.

### 14.3 Component and Thematic Inventory
*   **Layout & Prototyping**: The system utilizes application shells, split panes, resizable dividers, and contextual inspector panels.
*   **Data Representation**: Employs spreadsheets, localized grids, status indicators, and timeline-based log outputs.
*   **Document Tooling**: Integrated viewers feature advanced telemetry such as zoom controls, rotational manipulation, and spatial annotation overlays.
*   **Design Thematics**: The token registry is rigorous. It defines explicit scales for typography (`font-family-sans`, `font-family-mono`, extending from `size-xs` to `size-3xl`), spacing increments (from 4px up to 64px), standardized elevation shadows, and explicit z-index strata.

### 14.4 System State & Edge Case Handling
Resiliency in the user interface is paramount.
*   **Degraded Connectivity**: Offline scenarios trigger persistent banners, queue local mutations, and expose manual retry handlers.
*   **Concurrency Conflicts**: When discrepancies arise between the local state and server-side truth, the platform transparently exposes the origin of conflict (including author metadata) to force manual reconciliation.
*   **Partial Extractions**: Ambiguous or incomplete OCR data is explicitly demarcated; the system never masks extraction uncertainty.

---

## 15. Frontend Architecture Details

### 15.1 Structural Organization
The repository adopts a strict feature-based isolation paradigm.
```text
src/
  app/ (Global layouts, route definitions, top-level providers)
  features/ (Isolated domains: auth, workspace, capture, spreadsheet, etc.)
  components/ (Agnostic UI elements: layouts, feedback, data-display)
  services/ (API clients, telemetry, offline synchronizers)
  hooks/ (Shared React lifecycle abstractions)
  lib/ (Static utilities, typed contracts)
```

### 15.2 State Management Taxonomy
*   **Authentication & Permissions**: Owned by the auth feature; synchronized between server sessions and minimal local caches.
*   **Remote Entities**: Managed by robust caching layers (e.g., TanStack Query) to handle refetching and invalidation.
*   **Grid Mutations**: The spreadsheet feature maintains a localized mutation store that feeds into an asynchronous synchronization layer.
*   **Upload Buffers**: The capture feature leverages IndexedDB combined with an in-memory queue to maintain pending uploads during offline or degraded network conditions.

### 15.3 API Contract Layer
All ingress and egress data operations flow through a strictly typed API client. This client acts as the singular HTTP gateway, normalizing network transport errors and backend exceptions into domain-specific, strongly typed application errors. It also inherently supports request cancellation to prevent race conditions during rapid route transitions.

---

## 16. Concrete Integration Specifications

### 16.1 Tabular Grid Engine Integration
The system integrates an external grid library (Univer) via a strictly bounded wrapper mechanism.
*   **Isolation Policy**: Direct communication between UI components and the Univer engine is strictly prohibited.
*   **Event Orchestration**: A dedicated `spreadsheet-engine` adapter translates local UI state into engine directives, and normalizes engine emissions (cell edits, range pastes, history states) back into application state.
*   **Mutation Strategy**: The adapter writes to a localized edit buffer first, subsequently attempting a server commit, minimizing perceived latency.

### 16.2 Ingestion Pipeline
The document upload architecture is a highly tolerant, multi-stage pipeline:
1.  **Ingress**: Captures payloads from batch pickers or direct camera feeds.
2.  **Sanitization & Compression**: Validates dimensional and size constraints before applying lossless compression algorithms.
3.  **Deduplication**: Employs cryptographic hashing and metadata heuristics to reject redundant submissions.
4.  **Local Staging & Upload**: Stores pending artifacts in IndexedDB, delegating the physical transfer to a resilient, retry-capable background worker.

### 16.3 Library Virtualization
To accommodate enterprise-scale datasets, the Document Library implements aggressive windowed virtualization. The list exclusively renders items within the active viewport. To optimize image loading, progressive thumbnails are fetched immediately, while full-resolution assets are deferred until specifically invoked by the split-view inspector.

---

## 17. Engineering-Ready System Outputs

### 17.1 Quality Assurance Matrices
*   **Unit & Component Layers**: Granular testing of reducers, validation schemas, data transformers, and isolated UI components (split views, dialogs).
*   **Integration & E2E Layers**: Validating the upload queue, the spreadsheet adapter contract, and holistic workflows extending from authentication to extraction review and permission enforcement.
*   **Accessibility Constraints**: Strict adherence to WCAG AA baselines. This mandates native semantic HTML elements, explicit ARIA labeling, logical keyboard focus traps for dialogs, and appropriate announcements for asynchronous operations.

### 17.2 Error Taxonomy
The application categorizes faults into actionable, typed domains:
*   `AuthError` / `PermissionError`: Triggers automated re-authentication flows or explicit access-denied visualizations.
*   `NetworkError` / `TimeoutError`: Preserves active user input, surfaces offline indicators, and queues the payload for subsequent retry.
*   `ConflictError`: Suspends automatic commits and initiates a data reconciliation wizard.

### 17.3 Scalability Roadmap
The application's deployment footprint is optimized for static CDN delivery (supplemented by server-side rendering for critical shells). Future extensibility is inherently supported through a plugin registry tailored for the spreadsheet engine and extraction modules, ensuring that new analytics models or custom validation logic can be injected without structural refactoring.

---

*End of Document — VISIOLOG SDD v2.0*
