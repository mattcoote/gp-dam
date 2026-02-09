# GP DAM - Project Status

## Last Updated: Feb 8, 2026 (Session 4)

---

## What This Is
A Digital Asset Management system for **General Public** (art print company), replacing an outdated Squarespace catalog. Built with Next.js 16, PostgreSQL, and AI-powered search.

## Live URL
**https://gp-dam.vercel.app**

---

## Current State: Deployed + Working

### What's Done
- **Catalog homepage** with search, filters (orientation, work type, search tags, GP Exclusive), responsive grid layout (auto-fill left-to-right), large/small thumbnail toggle, GP branding, centered bold "ART CATALOG" header
- **Work detail modal** with full metadata, tags, dimensions, source label, max print size, one-click "Add to Selection" button
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
- **GP SKU generation** — auto-generated for GP originals only, skipped for public domain imports
- **GP Exclusive** — boolean flag on works, settable via CSV (`gp_exclusive` column) or admin toggle, badge displayed on catalog cards, quick filter bubble on homepage
- **Source image access** — direct links to full-res museum source images (opens in new tab) on search cards + download from S3 on works table
- **Excel import template** — generated via `scripts/generate-csv-template.mjs` with validation dropdowns, example rows, and instructions sheet
- **Selections system** (session-based, no login required for V1):
  - **Active selection model** — one-click add to the currently active selection
  - **Auto-create** — if no selection exists, clicking "Add to Selection" creates "Selection 1" automatically
  - **Bulk select mode** — checkbox overlay on catalog cards, floating action bar to add multiple works at once
  - **Selection bar** — fixed bottom bar showing active selection name + work count, create/switch selections
  - Drag-to-reorder, per-item notes, selection-level notes
- **Share links** with unique tokens, public read-only view with GP branding + masonry layout
- **Export formats:**
  - **PDF** — branded title page + one page per work with metadata
  - **Excel** — styled headers, auto-filter, exclusive highlighting
  - **PowerPoint** — widescreen 16:9 slides, image left + details right, GP branding, embedded images
- **S3 image storage** configured (gp-dam-bucket, us-east-2, public read)
- **Image variants:** source (full), preview (1200px), thumbnail (600px)
- **GP branding** with Oswald 700 wordmark across all pages
- **Deployed to Vercel** with all env vars configured
- **20 works** in database (12 seeded + 8 test imported with AI tags)

### What's NOT Done Yet
- **Full catalog import** (real production images)
- **SSO login** (Google/Microsoft OAuth credentials not configured)
- **CloudFront CDN** (optional, S3 direct URLs work fine for now)
- **Custom domain** (add in Vercel dashboard)

---

## Quick Start

```bash
# 1. Install dependencies
cd /Users/matthewcoote/Claude/gp-dam
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Start dev server
npx next dev -p 3000

# 4. Open in browser
open http://localhost:3000
```

**Admin:** http://localhost:3000/admin (password: set via `ADMIN_PASSWORD` env var)

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
| PowerPoint | PptxGenJS | Installed (serverExternalPackages) |
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
cd /Users/matthewcoote/Claude/gp-dam
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
│   │   │   ├── WorkCard.tsx              # Grid card with natural aspect ratio, checkbox overlay for select mode
│   │   │   └── WorkDetailModal.tsx       # Detail popup with one-click "Add to Selection"
│   │   ├── selections/
│   │   │   ├── AddToSelectionButton.tsx  # One-click add to active selection (auto-creates if needed)
│   │   │   └── SelectionBar.tsx          # Fixed bottom bar - active selection, create/switch
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
├── .env                   # Environment variables (DO NOT COMMIT)
├── .env.example           # Template for env vars
├── .gitignore
├── next.config.ts         # serverExternalPackages: pdfkit, exceljs, sharp, pptxgenjs
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
| gp_sku | No | GP2006310 (auto-generated if blank for gp_original, skipped for public domain) |
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

- **Active selection model** — one selection is "active" at a time (stored in localStorage)
- **One-click add** — clicking "Add to Selection" in work detail modal adds to active selection instantly
- **Auto-create** — if no selection exists, one is created automatically as "Selection 1"
- **Bulk select** — "Select Multiple" button enables checkbox mode on catalog cards; floating bar to add all selected works
- **Selection bar** — fixed bottom bar shows active selection + count; expand to see all selections, click to switch active
- **Share** — each selection has a share token for public read-only link
- **Export** — PDF, Excel, and PowerPoint downloads from selection detail page

---

## Known Issues

- **Neon DB cold starts** — the serverless Postgres connection pooler times out after idle periods, causing the dev server and API to hang. Fix: kill dev server, restart, and hit an API endpoint (e.g., `/api/works?limit=1`) to warm the connection.
- **NGA dimension accuracy** — NGA's `published_images.csv` reports original scan dimensions (up to 31,000+ px) which may exceed what the IIIF endpoint actually serves. The NGA search route now fetches each result's `info.json` endpoint to get actual IIIF-served dimensions, so search results display accurate pixel counts + max print sizes. Some images serve at full resolution while others are capped (e.g., to 900px). Once imported, dimensions are re-measured from the actual downloaded image via sharp.

---

## What's Next

### Immediate
1. **Import full catalog** with real production images
2. **Deploy latest changes** to Vercel (`vercel --prod`)

### Soon
3. **Custom domain** — add in Vercel dashboard (Settings > Domains)
4. **Full catalog import** — prepare CSV for all works

### Later
5. **Google/Microsoft OAuth** for team login
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
10. **Active selection model** — simpler UX than dropdown selection picker
11. **Images-only upload** — CSV optional, titles derived from filenames, metadata updatable later
12. **Public domain = Reductive** — all museum imports use `work_type: "reductive"` (Reductive on Paper/Canvas)
13. **Free-text Source field** — admin Add Work form uses text input for source (not enum dropdown)
