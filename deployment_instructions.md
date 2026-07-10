# VISIOLOG deployment

## Vercel project

Create a Vercel project from the repository root. Use:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | `./` |
| Build command | `npm run build` |
| Output directory | `public` |
| Node.js | 22.x |

The build runs `deploy_product.js`, builds the React/Vite app in `product-page/`, and copies the generated entrypoint/assets into `public/`. Vercel then serves the static output and discovers serverless functions in `api/`.

## Environment and Supabase

Configure the required server-side Gemini, Supabase, and passcode values in Vercel's Environment Variables panel. Use the repository's credentials guide for names and scopes, and keep real values out of Git.

In Supabase:

1. Run `supabase_schema.sql` in the SQL editor.
2. Create the `logbooks` Storage bucket used by image uploads.
3. Confirm the database and Storage policies match the deployment's access model before production use.

The active architecture uses Supabase PostgreSQL/Storage. JSONBin and Cloudinary are not required.

## Routes

`vercel.json` preserves these application boundaries:

- `/` and `/upload` → the built React SPA
- `/data` → `public/data/index.html` (static Univer workspace)
- `/review` → `public/review/index.html` (legacy operations console)
- `/api/*` → Vercel serverless functions

The supplied favicon is available at `/favicon.svg`.

## Smoke test

After deployment:

1. Open `/` and confirm the SPA shell loads.
2. Open `/upload`, enter the configured passcode, and select an image.
3. Confirm the upload reaches `/api/upload-scan` and a pending scan is visible from the data workspace.
4. Open `/data` and confirm the existing spreadsheet and scan gallery load.
5. Verify that `/review` remains available until Phase 4 retires it.

Text upload currently parses and previews CSV/TXT/XLSX locally only. Its persisted ingestion endpoint and external synchronization behavior are scheduled for Phase 4.

## Migration roadmap

1. **Complete:** React + TypeScript and image/text upload UI.
2. **Next:** remove validation and review status coupling from the Supabase extraction pipeline.
3. **Next:** migrate `/data` to React + npm Univer.
4. **Later:** persist text ingestion, add integrations/sync, and retire `/review`.
