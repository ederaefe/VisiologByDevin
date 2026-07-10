# VISIOLOG

VISIOLOG is a modern SaaS platform designed to digitize physical structured documents (logbooks, sheets, registers) into secure, encrypted, and analyzable digital formats.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ederaefe/VisiologByDevin.git
   cd VISIOLOG
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd product-page && npm install && cd ..
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   PASSCODE=your_access_passcode
   ```

4. **Set up Supabase database**
   - Go to your Supabase project dashboard
   - Open SQL Editor and run `supabase_schema.sql`
   - Create a public storage bucket named `logbooks`

5. **Run locally**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   node deploy_product.js
   ```

---

## 📋 Core Platform Overview

VISIOLOG combines mobile-optimized capture interfaces with Google Gemini 2.5 Flash vision AI to extract structured tables from page photographs. The system follows a human-in-the-loop workflow:

1. **Scan**: Users upload or take a photograph of any physical record page.
2. **Suggest**: The AI model analyzes the image and suggests a structured table.
3. **Edit**: Users review and refine the suggested table (insert, rename, delete rows/columns; edit cell values).
4. **Create**: Users save the verified, encrypted data to the cloud.

### Asynchronous Upload-and-Go

VISIOLOG implements a modern asynchronous ingestion pipeline:

- **Fast Upload**: Images upload to Supabase Storage in under 2 seconds
- **Background Processing**: AI extraction happens in the background via client-triggered queue
- **Gallery UI**: View all uploads with status badges (Pending, Processing, Completed, Failed)
- **Auto-Processing**: Client polling automatically processes pending scans when viewing the Data Ledger

---

## 💰 Product Tiers & SaaS Model

VISIOLOG is structured as a two-tier subscription service:

### Tier 1: Records Vault ($8/month)
* **Goal**: Seamless retrieval, digitizing, and long-term secure archiving.
* **Core features**:
  * Ingest and digitize physical records via mobile-optimized camera capture or file upload.
  * Schema context tracking (learns the structure from previous records to ensure consistency).
  * Guided human-in-the-loop table editing.
  * AES-256 end-to-end data encryption.
  * Session isolation and security.
  * Export options to CSV and JSON formats.

### Tier 2: Intelligence Engine ($23/month)
* **Goal**: Advanced analysis, statistical evaluation, and data intelligence.
* **Core features**:
  * All Tier 1 Records Vault functionality.
  * Manual and AI-assisted analytics tools.
  * External dataset upload (CSV, Excel, JSON) for combined analysis.
  * Tag and reference (@mention) system to isolate specific data inside chat.
  * Natural language AI Chat Assistant for queries, summaries, and calculations.
  * Automated chart and graph generation.
  * Real-time trend and anomaly detection.

---

## 🏗️ Project Architecture

VISIOLOG is built with a decentralized, component-based frontend and serverless API handlers on Vercel:

```
                  ┌──────────────────────────────────────────────┐
                  │                 USER BROWSER                 │
                  └──────┬───────────────┬────────────────┬──────┘
                         │               │                │
                         ▼               ▼                ▼
                     ┌───────┐      ┌─────────┐      ┌─────────┐
                     │   /   │      │ /upload │      │  /data  │
                     │ Landing  │      │ Capture │      │ Vault & │
                     │ Page  │      │ Ingest  │      │ Engine  │
                     └───────┘      └─────────┘      └─────────┘
                         │               │                │
                         └───────────────┼────────────────┘
                                         ▼ (HTTPS API Calls)
                  ┌──────────────────────────────────────────────┐
                  │                  API LAYER                   │
                  │                 (/api/*)                     │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                 ┌──────────────────────────────────────────────┐
                 │              BACKEND INTEGRATIONS            │
                 │                                              │
                 │ • Google Gemini (Vision & Analytics AI)      │
                 │ • Supabase (Database, Auth, Storage, AES)    │
                 └──────────────────────────────────────────────┘
```

### Directories & Structure
* `product-page/`: Vite + React project for the marketing landing page (located at `/` in production).
* `public/`: Root static output directory.
  * `/upload`: Ingestion app with camera capture and file upload.
  * `/data`: Digital vault with UniverJS spreadsheet engine and gallery UI.
* `api/`: Serverless functions (Node.js) handling database operations, AI requests, and uploads.
* `docs/`: Product planning, business plans, system design documents, and credentials guide.

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML/CSS/JS, React (product page) | User interfaces |
| Spreadsheet | UniverJS | High-performance canvas spreadsheet engine |
| Backend | Vercel Serverless (Node.js) | API endpoints |
| Database | Supabase (PostgreSQL) | Data storage with RLS |
| Storage | Supabase Storage | Image hosting |
| AI | Google Gemini 2.5 Flash | Vision extraction and analytics |
| Auth | Supabase Auth | User authentication |

---

## 📊 Current Implementation Status

### ✅ Completed
- Database migration from JSONBin to Supabase
- Asynchronous upload-and-go queue system
- Supabase Storage integration (replaced Cloudinary)
- UniverJS spreadsheet engine integration
- API endpoints: `upload-scan`, `process-scan`, `get-scans`, `delete-scan`
- Database schema: `visiolog_data`, `visiolog_scans`
- Mobile-optimized capture interface
- Glassmorphism UI design system

### 🚧 In Progress
- Frontend upload script update to use `/api/upload-scan`
- Ingestion Gallery UI with status badges
- Split-pane image and data viewer
- Client-triggered polling queue engine

### 📋 Planned
- Tier 2 Intelligence Engine features
- AI analytics assistant with chat
- External data upload (CSV, Excel, JSON)
- MCP-embedded tools for AI
- Advanced analytics (trend detection, anomaly detection)

---

## 📖 Documentation

- [Implementation Plan](implementation_plan.md) - Detailed technical implementation roadmap
- [Deployment Instructions](deployment_instructions.md) - Step-by-step Vercel deployment guide
- [Credentials Guide](docs/CREDENTIALS_GUIDE.md) - How to acquire API keys
- [System Design Document](docs/SYSTEM_DESIGN_DOCUMENT.md) - Complete architecture specification
- [Business Plan](docs/BUSINESS_PLAN.md) - Product strategy and market analysis
- [Walkthrough](walkthrough.md) - Development history and progress

---

## 🔐 Security

- **Encryption**: AES-256-GCM at rest, TLS 1.3 in transit
- **Authentication**: Supabase Auth with Row-Level Security
- **Isolation**: Per-user session management and data isolation
- **Privacy**: No data selling, user-owned data with export/delete rights

---

## 🚀 Deployment

The project is configured for deployment on the **Vercel** serverless platform.

### Quick Deploy
```bash
node deploy_product.js
npx vercel --prod
```

### Environment Variables (Required)
- `VITE_GEMINI_API_KEY` - Google Gemini API key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `PASSCODE` - Access passcode for the application

### Database Setup
Before deploying, run the `supabase_schema.sql` script in your Supabase SQL Editor to create the required tables and storage bucket.

---

## 🤝 Contributing

This is a commercial SaaS product. For inquiries about collaboration or enterprise deployments, please contact the development team.

---

## 📄 License

Proprietary - All rights reserved.

---

**VISIOLOG** - Transforming physical records into digital intelligence.

