# GP DAM - Project Status

## Last Updated: Feb 11, 2026 (Session 6 — Export Fixes)

---

## What This Is
A Digital Asset Management system for **General Public** (art print company), replacing an outdated Squarespace catalog. Built with Next.js 16, PostgreSQL, and AI-powered search.

## Live URL
**https://gp-dam.vercel.app**

---

## Current State: Deployed + Working

### What's Done
- **Catalog homepage** with search, filters (orientation, work type, search tags, GP Exclusive), responsive grid layout (auto-fill left-to-right), large/small thumbnail toggle, GP branding, centered bold "ART CATALOG" header
- **Work detail modal** with full metadata, tags, dimensions, source label, max print size, "Add to Selection" button, left/right arrow navigation (keyboard + buttons) with position indicator
- **AI tagging** with OpenAI GPT-4o vision (10 hero + 50 hidden tags per work)
- **Vector/semantic search** with text-embedding-3-large (1536-dim pgvector embeddings)
- **Password-protected admin** (`ADMIN_PASSWORD` env var, session-based)
- **Admin panel** with 5 tabs:
  - **Manage Works** — browse, edit, archive/restore/delete works, download source images, inline editing
  - **Add Work** — single image upload with manual metadata entry form, free-text Source field, GP Exclusive toggle, image preview, auto-title from filename
  - **Bulk Import** — CSV + ZIP upload (CSV is optional; images-only derives titles from filenames)
  - **Update Metadata** — CSV-only upload to update existing works (matches by GP SKU first, fallback to filename)
  - **Public Domain** — search 6 museum APIs, preview results with pixel dimensions + max print size, select & import, download source images directly from museums
- **6 museum integrations** for public domain artwork:
  - Rijksmuseum, Getty Museum, The Met, Yale Art Gallery, National Gallery of Art, Cleveland Museum of Art
  - Each with search, preview (pixel dims + max print inches), select & import, direct source image link (opens in new tab)
  - Min short side slider filter (0-36") across all museum grids
- **Source tracking** — `sourceType` enum + `sourceLabel` human-readable name
- **Max print size** — computed from actual downloaded image at 300 DPI, displayed in DAM viewer + search results
- **GP SKU** — optional, manually assigned (no auto-generation)
- **GP Exclusive** — boolean flag on works, settable via CSV (`gp_exclusive` column) or admin toggle, badge displayed on catalog cards, quick filter bubble on homepage
- **Source image access** — direct links to full-res museum source images (opens in new tab) on search cards + download from S3 on works table
- **Excel import template** — generated via `scripts/generate-csv-template.mjs` with validation dropdowns, example rows, and instructions sheet
- **Selection system** (cart UX pattern, replaces old selection bar):
  - **Shopping bag icon** in header with badge count
  - **Per-card "+" overlay** on hover to add/remove works from selection (checkmark when selected)
  - **Selection drawer** — slide-out panel from right with item list, remove, clear all
  - **"View Selection"** — saves to DB, opens public share page in new tab
  - **"Edit & Share"** — saves to DB, opens selection detail page (drag-to-reorder, notes, all exports)
  - **"PDF"** — saves to DB, downloads PDF export directly
  - **localStorage persistence** — selection survives page refreshes
  - **Selection detail page** — drag-to-reorder tiles, per-item notes, selection-level notes, PDF/Excel/PPT export, share link
- **Share links** with unique tokens, public read-only view with GP branding + masonry layout
- **Export formats:**
  - **PDF** — branded title page + one page per work with metadata
  - **Excel** — styled headers, auto-filter, exclusive highlighting
  - **PowerPoint** — widescreen 16:9 slides, image left + details right, GP branding, embedded images
- **S3 image storage** configured (gp-dam-bucket, us-east-2, public read)
- **Image variants:** source (full), preview (1200px), thumbnail (600px)
- **GP branding** with Oswald 700 wordmark across all pages
- **Export bug fixes (Session 6):**
  - **PPT export** — fixed CJS/ESM module loading issue on Vercel (Turbopack externalizes pptxgenjs but resolved ESM entry in CJS context; fixed via `createRequire`)
  - **Excel export** — fixed crash when selection name contains `/` or other characters illegal in Excel worksheet tab names (e.g. "Selection 2/11/2026"); now sanitized
  - Added `jszip` and `image-size` to `serverExternalPackages` in `next.config.ts`
- **Deployed to Vercel** with all env vars configured
- **879 works** in database (batch upload completed Feb 11, 2026)
- **Batch upload script** (`scripts/batch-upload.mjs`) for CSV + image folder uploads to production

### What's NOT Done Yet
- **302 works missing `artist_name`** in CSV — need data fix + re-upload (see Batch Upload Report below)
- **2 images failed to copy** for resize (special characters in filenames — see unmatched below)
- **SSO login** (Google/Microsoft OAuth credentials not configured)
- **CloudFront CDN** (optional, S3 direct URLs work fine for now)
- **Custom domain** (add in Vercel dashboard)

---

## Quick Start

```bash
# 1. Clone/copy the repo
cd gp-dam

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Fill in .env with real values (see Environment Variables section below)

# 4. Generate Prisma client
npx prisma generate

# 5. Start dev server
npx next dev --turbopack -p 3000

# 6. Open in browser
open http://localhost:3000
```

**Admin:** http://localhost:3000/admin (password: set via `ADMIN_PASSWORD` env var)

### New Machine Setup

1. Copy the entire `gp-dam/` directory (and parent `CLAUDE.md`) to the new machine
2. Copy your `.env` file separately (it's gitignored — contains secrets)
3. Run `npm install` → `npx prisma generate` → `npx next dev --turbopack`
4. The database (Neon) and S3 bucket are cloud-hosted, so no local DB setup needed
5. For Vercel deploys: run `vercel login` then `vercel link` to reconnect to the project
6. If the DB connection hangs (cold start), restart the dev server and hit `/api/works?limit=1`

---

## Tech Stack

| Component | Choice | Status |
|-----------|--------|--------|
| Frontend | Next.js 16.1.6 (App Router, Turbopack, TypeScript, Tailwind v4) | Running |
| Database | PostgreSQL + pgvector on Neon (free tier) | Running |
| ORM | Prisma 7.3 with PrismaPg adapter | Configured |
| Auth | NextAuth.js (Google + Microsoft OAuth planned) | Code written, needs credentials |
| Storage | AWS S3 (gp-dam-bucket, us-east-2) | Configured + tested |
| AI Tags | OpenAI GPT-4o vision (10 hero + 50 hidden tags) | Working |
| Embeddings | OpenAI text-embedding-3-large (1536 dims) | Working |
| Images | Sharp (source, preview@1200px, thumbnail@600px) | Working |
| PDF | PDFKit | Installed (serverExternalPackages) |
| Excel | ExcelJS | Installed (serverExternalPackages) |
| PowerPoint | PptxGenJS | Installed (serverExternalPackages, CJS via createRequire) |
| CSV | PapaParse | Installed |
| ZIP | JSZip | Installed |
| Fonts | Inter (body) + Oswald 700 (brand wordmark) | Configured |
| Deployment | Vercel | Deployed |

---

## Environment Variables

All configured in `.env` locally and on Vercel:

| Variable | Purpose | Current State |
|----------|---------|---------------|
| `DATABASE_URL` | Neon PostgreSQL connection | Set |
| `ADMIN_PASSWORD` | Admin page password gate | Set |
| `AWS_ACCESS_KEY_ID` | S3 uploads | Set |
| `AWS_SECRET_ACCESS_KEY` | S3 uploads | Set |
| `AWS_REGION` | S3 region | `us-east-2` |
| `AWS_S3_BUCKET` | S3 bucket name | `gp-dam-bucket` |
| `CLOUDFRONT_URL` | CDN URL (optional) | Empty (using S3 direct) |
| `OPENAI_API_KEY` | AI tagging + embeddings | Set (local + Vercel) |
| `NEXTAUTH_URL` | Auth base URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth encryption | Set |
| `GOOGLE_CLIENT_ID` | Google OAuth | Not set yet |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Not set yet |

---

## Vercel Deployment

- **Account:** mattcoote-9711
- **Project:** gp-dam
- **URL:** https://gp-dam.vercel.app
- **Build:** `next build` (auto-runs `prisma generate` via postinstall)
- **Env vars:** DATABASE_URL, ADMIN_PASSWORD, AWS keys, OPENAI_API_KEY (all set for production)

**To redeploy:**
```bash
cd gp-dam
vercel --prod
```

**To add/update env vars:**
```bash
printf 'value' | vercel env add VAR_NAME production
```

---

## AWS S3 Setup

- **Bucket:** gp-dam-bucket
- **Region:** us-east-2 (Ohio)
- **IAM User:** gp-dam-app (AmazonS3FullAccess policy)
- **Public access:** Block Public Access is OFF, bucket policy allows s3:GetObject for all
- **URL format:** `https://gp-dam-bucket.s3.us-east-2.amazonaws.com/works/{workId}/{variant}.jpg`
- **Variants:** source (full), preview (1200px wide), thumbnail (600px wide)

---

## Database

**Neon PostgreSQL** (free tier)
- Host: ep-damp-voice-aiggddmp-pooler.c-4.us-east-1.aws.neon.tech
- Database: neondb
- Has pgvector extension enabled

**Tables:** works, users, accounts, sessions, verification_tokens, selections, selection_items, search_queries

**Key Work model fields added (Sessions 2-4):**
- `source_label` — Human-readable source name (e.g., "Cleveland Museum of Art", "General Public")
- `max_print_inches` — JSON `{ width, height }` computed from actual image at 300 DPI
- `source_type` enum — includes `cleveland` (added Session 3)
- `gp_exclusive` — Boolean flag for GP exclusive works (added Session 4)
- GP SKU is now nullable (null for public domain imports)

**To reset/reseed:**
```bash
npx prisma db push --force-reset
node prisma/seed.mjs
```

---

## File Structure

```
gp-dam/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── prisma.config.ts           # Prisma config (PrismaPg adapter)
│   └── seed.mjs                   # Sample data seeder (12 works)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Homepage - catalog with search + masonry grid + bulk select mode
│   │   ├── layout.tsx             # Root layout (Inter + Oswald fonts)
│   │   ├── globals.css            # Theme colors + Tailwind v4
│   │   ├── admin/
│   │   │   └── page.tsx           # Admin - 5 tabs: manage works, add work, bulk import, update metadata, public domain
│   │   ├── selections/
│   │   │   └── [id]/page.tsx      # Selection detail - drag reorder, notes, share, PDF/Excel/PPT export
│   │   ├── share/
│   │   │   └── [token]/page.tsx   # Public share page - GP branded, masonry grid + detail modal
│   │   └── api/
│   │       ├── admin/auth/route.ts                  # Password verification
│   │       ├── auth/[...nextauth]/route.ts          # OAuth endpoint
│   │       ├── works/route.ts                       # Works list (search, filter, pagination)
│   │       ├── works/[id]/route.ts                  # Single work (GET, PATCH, DELETE)
│   │       ├── works/[id]/download/route.ts         # Download source image from S3
│   │       ├── works/update-metadata/route.ts       # CSV metadata update for existing works
│   │       ├── upload/route.ts                      # Import: CSV+ZIP or images-only
│   │       ├── rijksmuseum/{search,import}/route.ts  # Rijksmuseum search + import
│   │       ├── getty/{search,import}/route.ts        # Getty Museum search + import
│   │       ├── met/{search,import}/route.ts          # Met Museum search + import
│   │       ├── yale/{search,import}/route.ts         # Yale Art Gallery search + import
│   │       ├── nga/{search,import}/route.ts          # National Gallery search + import
│   │       ├── cleveland/{search,import}/route.ts    # Cleveland Museum search + import
│   │       ├── public-domain/download/route.ts       # Download source from museum API
│   │       ├── selections/route.ts                  # List/create selections
│   │       ├── selections/[id]/route.ts             # Get/update/delete selection
│   │       ├── selections/[id]/items/route.ts       # Add work to selection
│   │       ├── selections/[id]/items/[itemId]/route.ts # Update/remove item
│   │       ├── selections/[id]/reorder/route.ts     # Reorder items
│   │       ├── selections/share/[token]/route.ts    # Public share API
│   │       ├── selections/[id]/export/pdf/route.ts  # PDF export
│   │       ├── selections/[id]/export/excel/route.ts # Excel export
│   │       └── selections/[id]/export/ppt/route.ts  # PowerPoint export
│   ├── components/
│   │   ├── works/
│   │   │   ├── WorkCard.tsx              # Grid card with natural aspect ratio, selection toggle overlay
│   │   │   └── WorkDetailModal.tsx       # Detail popup with arrow nav + "Add to Selection"
│   │   ├── cart/
│   │   │   ├── CartContext.tsx           # React Context + localStorage persistence
│   │   │   ├── CartIcon.tsx             # Header icon with badge count
│   │   │   └── CartDrawer.tsx           # Slide-out panel with View Selection, Edit & Share, PDF, Clear All
│   │   └── search/
│   │       └── SearchBar.tsx             # Search input with debounce
│   ├── lib/
│   │   ├── prisma.ts      # Database client (PrismaPg adapter for Neon)
│   │   ├── auth.ts        # NextAuth config
│   │   ├── s3.ts          # S3 upload + signed download URLs
│   │   ├── openai.ts      # GPT-4o vision tagging + text-embedding-3-large
│   │   ├── sku.ts         # GP SKU auto-generation (GP[YEAR][SEQUENCE])
│   │   ├── import.ts      # Import: CSV parse, Sharp resize, S3 upload, AI tag, max print calc, DB insert
│   │   ├── rijksmuseum.ts # Rijksmuseum API client (Linked Art Search + OAI-PMH + IIIF)
│   │   ├── getty.ts       # Getty Museum API client (SPARQL + IIIF)
│   │   ├── met.ts         # Met Museum API client (REST + image dimensions)
│   │   ├── yale.ts        # Yale Art Gallery API client (Linked Art + IIIF)
│   │   ├── nga.ts         # National Gallery API client (GitHub CSV + IIIF)
│   │   └── cma.ts         # Cleveland Museum API client (REST, CC0 filter)
│   ├── types/
│   │   └── next-auth.d.ts # Auth type extensions
│   └── generated/
│       └── prisma/        # Auto-generated Prisma client
├── scripts/
│   └── generate-csv-template.mjs  # Generates GP_DAM_Import_Template.xlsx
├── GP_DAM_Import_Template.xlsx    # Excel template for CSV bulk import
├── .env                   # Environment variables (DO NOT COMMIT)
├── .env.example           # Template for env vars
├── .gitignore
├── next.config.ts         # serverExternalPackages: pdfkit, exceljs, sharp, pptxgenjs, jszip, image-size
├── package.json
├── tsconfig.json
└── PROJECT-STATUS.md      # This file
```

---

## Upload / Import Flows

### 1. Add Work (Single)
Admin > Add Work tab. Pick an image file, fill in metadata (title auto-derived from filename), upload. Uses the same `/api/upload` endpoint internally.

### 2. Bulk Import (CSV + ZIP)
Admin > Bulk Import tab. Upload a ZIP of images with an optional CSV for metadata.

**With CSV:** Each CSV row maps to an image in the ZIP by filename.
**Without CSV:** Titles derived from filenames in title case (e.g. `sunset-over-hills.jpg` -> "Sunset Over Hills"), artist defaults to "Unknown Artist", work type defaults to synograph.

| CSV Column | Required | Example |
|--------|----------|---------|
| filename | Yes | coastal-dawn.jpg (must match ZIP file) |
| title | Yes | Coastal Dawn |
| artist_name | Yes | Sarah Chen |
| work_type | Yes | synograph / work_on_paper / work_on_canvas / photography / reductive |
| gp_sku | No | GP2006310 (optional, leave blank if not assigned) |
| dimensions | No | 24x36 or 24x36x1.5 (inches) |
| retailer_exclusive | No | RH, CB2, Rejuvenation, Anthropologie |
| artist_exclusive_to | No | RH |
| source_type | No | gp_original (default), rijksmuseum, getty, met, yale, national_gallery, cleveland |
| source | No | Human-readable source label: "General Public", "Visual Contrast", etc. |
| gp_exclusive | No | yes/true/1 = GP exclusive (default: no) |
| max_print_width | No | Width in inches (auto-computed from image if blank) |
| max_print_height | No | Height in inches (auto-computed from image if blank) |

### 3. Update Metadata (CSV only)
Admin > Update Metadata tab. Upload a CSV to update existing works. Matches by `gp_sku` first, falls back to `filename` matching against S3 URL or title. Only non-empty fields are updated.

---

## Selection UX

- **Selection drawer** — works are added/removed via "+" overlay on cards or "Add to Selection" in the detail modal. Selection state lives in React Context + localStorage (survives refreshes). Shopping bag icon in header shows badge count; clicking opens a slide-out drawer.
- **Drawer actions** — "View Selection" (opens public share page), "Edit & Share" (opens selection detail page with reorder/notes/exports), "PDF" (direct download), "Clear All"
- **Selection detail page** — drag-to-reorder tiles, per-item notes, selection-level notes, editable name, PDF/Excel/PPT export, share link copy, delete
- **Share** — each selection has a share token for public read-only link with masonry layout
- **Arrow navigation** — left/right arrow keys or chevron buttons flip through works in the detail modal, with position indicator ("3 / 47") and wrap-around

---

## Known Issues

- **Neon DB cold starts** — the serverless Postgres connection pooler times out after idle periods, causing the dev server and API to hang. Fix: kill dev server, restart, and hit an API endpoint (e.g., `/api/works?limit=1`) to warm the connection.
- **NGA dimension accuracy** — NGA's `published_images.csv` reports original scan dimensions (up to 31,000+ px) which may exceed what the IIIF endpoint actually serves. The NGA search route now fetches each result's `info.json` endpoint to get actual IIIF-served dimensions, so search results display accurate pixel counts + max print sizes. Some images serve at full resolution while others are capped (e.g., to 900px). Once imported, dimensions are re-measured from the actual downloaded image via sharp.

---

## Batch Upload Report — Feb 11, 2026

### Overview

Uploaded 1,205 artwork images from the Round 1 CSV + images folder to production at https://gp-dam.vercel.app. Due to Vercel's hard 4.5MB serverless function payload limit, images were split into two phases and large images were resized before upload.

### Vercel 4.5MB Payload Limit

Vercel enforces a **4.5MB request body limit** on all serverless functions across all plans (Hobby, Pro, Enterprise). This cannot be increased via `vercel.json` or `next.config.ts`. The batch upload script sends each image as a ZIP + CSV via FormData to `/api/upload`, so each image must be under ~3.5MB to fit within the limit after ZIP overhead.

### Phase 1 — Small Images (under 3.5MB, no resize needed)

| Metric | Count |
|--------|-------|
| Total images | 386 |
| Uploaded successfully | 259 |
| Duplicate SKU (already in DAM) | 16 |
| Missing required CSV data (HTTP 400) | 111 |
| Other failures | 0 |

- Batch size: 1 (one image per request)
- AI tagging: enabled
- Duration: ~55 minutes
- Images uploaded directly from SMB network share

### Phase 2 — Large Images (over 3.5MB, resized to 2000px)

| Metric | Count |
|--------|-------|
| Total images in CSV | 819 |
| Matched to resized images | 817 |
| Unmatched (filename copy failures) | 2 |
| Uploaded successfully | 539 |
| Duplicate SKU (already in DAM) | 87 |
| Missing required CSV data (HTTP 400) | 191 |
| Other failures | 0 |

- Images copied from SMB share to local `/tmp/dam-large-originals/` (9.9GB)
- Resized locally with `sips --resampleHeightWidthMax 2000 --setProperty formatOptions 80` (8 parallel jobs, ~3 minutes)
- Resized folder: 767MB (down from 9.9GB), max file size 2.3MB
- Batch size: 1, AI tagging enabled
- Duration: ~2.5 hours
- 2 unmatched images (special characters in filenames prevented copy):
  - `GP2010205 Young Woman, with Puck the Dog (SK-A-1703-00)-RV2CC2_14x20_.jpg`
  - `GP5014078 Factory 1_48x48_RV1_CC3Codarus.jpg`

### Combined Results

| Metric | Count |
|--------|-------|
| CSV rows parsed | 1,205 |
| Images attempted | 1,203 |
| **New works uploaded** | **798** |
| Duplicate SKU skips | 103 |
| Missing CSV data failures | 302 |
| **Total works in DAM** | **879** |

The 879 DAM count (not 798 + 103 = 901) is because some duplicate SKU entries were the same work appearing multiple times in the CSV or across phases, not 103 distinct works.

### Failure Breakdown — 302 Missing Data Errors

All 302 failures were **HTTP 400: "artist_name is required"**. These CSV rows have an empty `artist_name` column. No images were lost — they just need the artist name added to the CSV.

**Error log spreadsheets saved to:**
- `~/Desktop/upload-error-log.csv`
- `/Volumes/GP-Data2/_JOBS-2/_DAM/1. DAM Images_Ready For Upload_Round 1/upload-error-log.csv`
- `/tmp/gp-dam/phase1-small_failures.json`
- `/tmp/gp-dam/phase2-large_failures.json`

### To Upload the Remaining 302 Works

1. Open the CSV and fill in the missing `artist_name` values for the 302 failed rows
2. Save as a new CSV (e.g., `GP_DAM_Import_Round1_Fixed.csv`)
3. Re-run the batch upload — duplicates will be harmlessly skipped:

```bash
cd /path/to/gp-dam
node scripts/batch-upload.mjs \
  --csv /path/to/GP_DAM_Import_Round1_Fixed.csv \
  --images /path/to/images \
  --batch-size 1 \
  --url https://gp-dam.vercel.app
```

Note: Images over 3.5MB will need to be resized first (Vercel 4.5MB payload limit). Use the resized copies at `/tmp/dam-large-resized/` if they still exist, or re-run the resize process.

### Temp Files Created (can be cleaned up)

| Path | Size | Contents |
|------|------|----------|
| `/tmp/dam-large-originals/` | 9.9 GB | Original large images copied from SMB |
| `/tmp/dam-large-resized/` | 767 MB | Resized large images (2000px, q80) |
| `/tmp/dam-images-local/` | ~250 MB | Partial copy (abandoned) |
| `/tmp/gp-dam/` | ~200 MB | Cloned repo + scripts + CSVs + logs |

To reclaim ~11GB: `rm -rf /tmp/dam-large-originals /tmp/dam-images-local`

---

## Export Fixes — Session 6 (Feb 11, 2026)

### PPT Export — Fixed

**Problem:** PowerPoint export returned HTTP 500. The `pptxgenjs` library's ES module entry point (`pptxgen.es.js`) was being loaded inside a CJS context by Vercel's Turbopack runtime, causing `"Cannot use import statement outside a module"`.

**Fix:** Replaced `await import("pptxgenjs")` with `createRequire(import.meta.url)` + `require("pptxgenjs")` in `/src/app/api/selections/[id]/export/ppt/route.ts`. This forces Node.js to resolve the CJS entry point (`pptxgen.cjs.js`) which works correctly in Vercel serverless.

Also added `jszip` and `image-size` (pptxgenjs dependencies) to `serverExternalPackages` in `next.config.ts` to prevent bundler interference.

### Excel Export — Fixed

**Problem:** Excel export returned HTTP 500 when the selection name contained `/` characters (e.g. "Selection 2/11/2026"). ExcelJS throws `"Worksheet name cannot include any of the following characters: * ? : \ / [ ]"`.

**Fix:** Added character sanitization in `/src/app/api/selections/[id]/export/excel/route.ts`:
```typescript
const safeName = selection.name.replace(/[*?:\\/\[\]]/g, "-").substring(0, 31);
```

### PDF Export — No Changes Needed

PDF export was already working correctly throughout.

---

## What's Next

### Immediate
1. **Fix 302 missing `artist_name` rows** in CSV and re-upload
2. **Upload 2 unmatched images** (rename to remove special characters, or copy manually)
3. **Custom domain** — add in Vercel dashboard (Settings > Domains)

### Soon
4. **Date-range filter** — `createdAt` is tracked on all works, ready for UI filter
5. **Google/Microsoft OAuth** for team login

### Later
6. **CloudFront CDN** for faster image delivery
7. **Advanced search** — boolean operators, semantic similarity

---

## Key Decisions Made

1. **No Pinecone** — pgvector handles 10K works easily
2. **No partner access in V1** — internal + public only
3. **Museum APIs added** — 6 museums integrated (Rijksmuseum, Getty, Met, Yale, NGA, Cleveland) for public domain CC0 artwork
4. **PowerPoint export added** — widescreen 16:9 with embedded images
5. **Exclusive works visible** to all but labeled (designers buy direct)
6. **Session-based selections** — no login required for V1 (localStorage sessionId)
7. **Vercel + Neon** — natural fit, both have free tiers
8. **Oswald 700** for brand wordmark font
9. **S3 direct URLs** (no CloudFront) for V1 simplicity
10. **Selection drawer model** — replaced bottom selection bar + bulk select mode with cart-style pattern (header icon, per-card toggle, slide-out drawer with View/Edit/PDF/Clear actions)
11. **Images-only upload** — CSV optional, titles derived from filenames, metadata updatable later
12. **Public domain = Reductive** — all museum imports use `work_type: "reductive"` (Reductive on Paper/Canvas)
13. **Free-text Source field** — admin Add Work form uses text input for source (not enum dropdown)
