# VISIOLOG — Vercel Deployment Instructions

Follow these exact steps on the Vercel dashboard to deploy the entire VISIOLOG application, view the user interface, and test responsiveness.

---

## Step 1: Create a Vercel Project

1. Go to [Vercel](https://vercel.com/) and sign in.
2. From your Vercel Dashboard, click the **"Add New..."** button (top right) and select **"Project"**.

---

## Step 2: Import the GitHub Repository

1. Under **"Import Git Repository"**, look for your GitHub connection.
2. Select your repository: `ederaefe/Visiolog` (or click search if it is not immediately visible).
3. Click the **"Import"** button.

---

## Step 3: Configure Build & Output Settings

On the **"Configure Project"** screen, expand the **"Build and Output Settings"** section. Set them as follows:

*   **Framework Preset**: Select **"Other"** (Vercel may default to this automatically).
*   **Build Command**: 
    *   Toggle the **"OVERRIDE"** switch to **ON** (green).
    *   Type: `npm run build`
*   **Output Directory**: 
    *   Toggle the **"OVERRIDE"** switch to **ON** (green).
    *   Type: `public`
*   **Root Directory**: Leave it as `./` (do not change).

---

## Step 4: Environment Variables

For the platform to function, you must add these keys under **"Environment Variables"**:

| Key | Value |
| :--- | :--- |
| `VITE_GEMINI_API_KEY` | *(Your Gemini API key starting with AIzaSy...)* |
| `VITE_SUPABASE_URL` | `https://[project-id].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Your public anon key)* |
| `PASSCODE` | *(Your access passcode)* |

---

## Step 5: Database Setup (Required)

Before deploying, you must set up your Supabase database:

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** (icon looks like a terminal)
3. Open the file `supabase_schema.sql` from your repository
4. Copy and paste the entire SQL script into the editor
5. Click **Run** to execute the script
6. This will create the required tables: `visiolog_data` and `visiolog_scans`
7. Navigate to **Storage** and create a public bucket named `logbooks`

## Step 6: Trigger Deploy

1. Click the blue **"Deploy"** button at the bottom of the page.
2. Vercel will clone the repo, run `deploy_product.js` to build the landing page, bundle the serverless functions in `/api/`, and host the static `/public/` assets.
3. Once completed (approx. 1-2 minutes), you will receive a preview card. Click it to launch the live site!

---
> [!TIP]
> **Testing Responsiveness**:
> Open the deployed link on your phone, or right-click the page in your browser, select **Inspect**, and toggle the device emulator toolbar (Ctrl+Shift+M) to test the mobile UI frames!
