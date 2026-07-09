# VISIOLOG

VISIOLOG is a modern SaaS platform designed to digitize physical structured documents (logbooks, sheets, registers) into secure, encrypted, and analyzable digital formats.

## 1. Core Platform Overview

VISIOLOG combines mobile-optimized capture interfaces with Google Gemini 2.5 Flash vision AI to extract structured tables from page photographs. The system follows a human-in-the-loop workflow:
1. **Scan**: Users upload or take a photograph of any physical record page.
2. **Suggest**: The AI model analyzes the image and suggests a structured table.
3. **Edit**: Users review and refine the suggested table (insert, rename, delete rows/columns; edit cell values).
4. **Create**: Users save the verified, encrypted data to the cloud.

---

## 2. Product Tiers & SaaS Model

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

## 3. Project Architecture

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
                 │ • Supabase (Database, Auth, AES Encryption) │
                 │ • Cloudinary (Encrypted Image Store)         │
                 └──────────────────────────────────────────────┘
```

### Directories & Structure
* `product-page/`: Vite + React project for the marketing landing page (located at `/` in production).
* `public/`: Root static output directory.
  * `/upload`: Legacy ingestion app bundle.
  * `/data`: Digital vault and analytics engine app bundle.
* `api/`: Serverless functions (Node.js) handling database operations, AI requests, and uploads.
* `docs/`: Product planning, business plans, system design documents, and PDF generation scripts.

---

## 4. Local Development

### Prerequisites
* Node.js (v18 or higher)
* Vercel CLI (optional, for api simulation)

### Installation
Clone the repository and install dependencies in the root:
```bash
npm install
```

Install dependencies for the product page:
```bash
cd product-page
npm install
cd ..
```

### Running Locally
To run the product landing page:
```bash
npm run dev
```

To build and compile all packages to production assets (copies build artifacts to `public/`):
```bash
node deploy_product.js
```

---

## 5. Deployment

The project is configured for deployment on the **Vercel** serverless platform.

Deploying production build:
```bash
node deploy_product.js
npx vercel --prod
```

