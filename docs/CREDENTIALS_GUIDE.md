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

## 3. Cloudinary Credentials (Image Asset Hosting)

**Purpose**: Efficiently stores and optimizes the raw photographs uploaded by users.

### Step-by-Step Directions:

1. **Navigate to Cloudinary**: Go to <https://cloudinary.com/> and Sign Up / Log In.
2. **Access the Dashboard**: Once logged in, you should land on the "Programmable Media" Dashboard. If not, click the "Dashboard" icon on the left sidebar.
3. **Locate Account Details**:
   - Look near the top of the main dashboard area for a section titled **"Account Details"** or **"Product Environment Credentials"**.
4. **Copy the Credentials**: You need three specific values from this card:
   - **Cloud Name**: A short string (e.g., `dzzyxabc`). Click the copy icon next to it. This is your `CLOUDINARY_CLOUD_NAME`.
   - **API Key**: A 15-digit number (e.g., `123456789012345`). Click copy. This is your `CLOUDINARY_API_KEY`.
   - **API Secret**: A string of random characters. It will be hidden by asterisks (`**********`). Click the **👁️ (Eye icon)** to reveal it, then copy it. This is your `CLOUDINARY_API_SECRET`.

---

## Finalizing the Deployment

Once you have gathered all 6 values, your `.env` file should look like this:

```env
VITE_GEMINI_API_KEY=AIzaSyA_example_key_123456789
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
CLOUDINARY_CLOUD_NAME=yourcloudname
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
```

You are now fully prepared to deploy VISIOLOG.