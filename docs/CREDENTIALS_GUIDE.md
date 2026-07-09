# VISIOLOG — Credentials Acquisition Guide

This document provides a highly detailed, step-by-step walkthrough for generating the necessary API keys and credentials required to deploy the VISIOLOG platform.

---

## 1. Google Gemini API Key (Vision Extraction)

**Purpose**: Powers the AI that reads photographed logbooks and converts them to structured tables.

### Step-by-Step Directions:

1. **Navigate to AI Studio**: Go to <https://aistudio.google.com/>
2. **Authenticate**: Sign in with your Google account.
3. **Locate the API Menu**: On the left-hand navigation sidebar, look for a key icon labeled **"Get API key"**. Click it.
4. **Initiate Creation**: On the main screen, click the prominent blue button labeled **"Create API key"**.
5. **Select a Project**:
   - A modal will appear asking you to select a Google Cloud Project.
   - If you have one, select it and click **"Create API key in existing project"**.
   - If you don't have one, click **"Create API key in new project"**.
6. **Copy the Key**:
   - A dialog will pop up displaying your new API key.
   - It will look like a long string of random characters, typically starting with `AIzaSy...`
   - Click the **"Copy"** button next to it.
7. **Store it**: This value goes into your `.env` file as `VITE_GEMINI_API_KEY =`AIzaSyBrnl6ppYnHWBTTTRGQ-YT9Mn7x4mzw5B8` `.

---

## 2. Supabase Credentials (Database & Authentication)

**Purpose**: Secures user accounts and stores the encrypted tabular data extracted from the records.

### Step-by-Step Directions:

1. **Navigate to Supabase**: Go to <https://supabase.com/> and click **"Start your project"** (or Sign In).
2. **Create a Project**:
   - Click the green **"New Project"** button.
   - Select your organization.
   - **Name**: Type `VISIOLOG`.
   - **Database Password**: Generate a very strong password and save it somewhere safe.
   - **Region**: Select the server region closest to your primary users.
   - Click **"Create new project"**.
3. **Wait for Provisioning**: The dashboard will say "Setting up your project". This takes about 2-3 minutes. Wait until the dashboard fully loads.
4. **Navigate to Settings**:
   - Look at the bottom of the far-left dark sidebar. Click the gear icon labeled **"Project Settings"**.
5. **Navigate to API**:
   - In the secondary sidebar that opens, under the "Configuration" header, click **"API"**.
6. **Copy the Project URL**:
   - Look for the section titled **"Project URL"**.
   - It will look like: `https://[random-letters].supabase.co`
   - Click the **"Copy"** button. This goes into your `.env` as `VITE_SUPABASE_URL`.
7. **Copy the Anon Key**:
   - Scroll down slightly to the **"Project API keys"** section.
   - You will see a key with the `anon` and `public` tags next to it.
   - Click the **"Copy"** button. This goes into your `.env` as `VITE_SUPABASE_ANON_KEY`.

> \[!WARNING\]\
****Do not copy the** `service_role` **key.** That key bypasses all security rules and should never be exposed in a web application.

---

## 3. Supabase Storage Bucket Setup (Image Hosting)

**Purpose**: Stores the raw scans and photos uploaded via the ingestion interface.

### Step-by-Step Directions:

1. **Open the Storage Dashboard**:
   - Go to your Supabase project dashboard.
   - On the far-left dark sidebar, click the basket icon labeled **"Storage"**.
2. **Create the Bucket**:
   - Click the **"New Bucket"** button (typically at the top of the storage sub-panel).
   - **Bucket Name**: Type exactly `logbooks` (all lowercase, no spaces).
   - **Public Bucket**: Toggle this option **ON** (green). This allows the front-end interface and the Gemini processing pipelines to retrieve the image files via public URLs.
   - Click **"Save"** or **"Create bucket"**.
3. **Verify Bucket Creation**:
   - You should now see the `logbooks` bucket listed in your storage panel. The upload and delete pipelines will now work automatically!

---

## Finalizing the Environment Settings

Once you have gathered your values, your local `.env` and Vercel environment variables should look like this:

```env
VITE_GEMINI_API_KEY=AQ.Ab8RN6I1tLCzDMLE6E8Ta26SgIgy64LagBcNa44uZhfiwd9MrQ
VITE_SUPABASE_URL=https://zniqpkpehbbeuocvabwv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc...
PASSCODE=9980
```

You are now fully prepared to deploy VISIOLOG.