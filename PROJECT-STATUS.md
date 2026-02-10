# GP DAM - Project Status

## Last Updated: Feb 9, 2026 (Session 5)

---

## What This Is
A Digital Asset Management system for **General Public** (art print company), replacing an outdated Squarespace catalog. Built with Next.js 16, PostgreSQL, and AI-powered search.

## Live URL
**https://gp-dam.vercel.app**

---

## Current State: Deployed + Working

### What's Done
- **Catalog homepage** with search, quick filters, collapsible filter sidebar, infinite scroll, responsive grid layout (auto-fill left-to-right), large/small thumbnail toggle, labels toggle, GP branding, centered bold "ART CATALOG" header
- **Infinite scroll** — IntersectionObserver with 600px rootMargin, 48 items per page, "Showing X of Y" counter, manual "Load more" fallback button
- **Quick filter buttons** — top 6 tags dynamically populated from actual catalog data via `/api/works/top-tags`, followed by GP Exclusive set apart with a gold/amber accent and thin divider. Tag filters use search-based matching (substring within tag arrays) so tags like "photography" work even if `workType` is still "reductive"
- **Labels toggle** — toolbar button to show/hide GP Exclusive and retailer badges on card thumbnails for a cleaner browsing view. On by default.
- **Collapsible filter sidebar** — toggle via toolbar button with active filter count badge
  - **Desktop:** 260px fixed-width sticky sidebar on left, grid flexes to fill remaining space, scrollable within viewport
  - **Mobile (< 768px):** slide-over overlay from left with backdrop, close via X button or Escape key
  - **Sections (accordion-style, each collapsible):**
    - Artist — searchable dropdown from `/api/works/artists`
    - Work Type — checkboxes (Synograph, Work on Paper, Work on Canvas, Photography, Reductive)
    - Orientation — checkboxes (Landscape, Portrait, Square)
    - Source — checkboxes (GP Original, Rijksmuseum, Getty, Met, Yale, NGA, Cleveland) — collapsed by default
    - Retailer — checkboxes from `/api/works/retailers` (only shown if retailers exist) — collapsed by default
    - Style & Subject — clickable tag pills from top 15 AI tags
  - "Clear all" button resets all sidebar filters
  - All checkbox filters support multi-select via comma-separated URL params
- **Search** — raw SQL substring matching within tag arrays (`array_to_string()` + `ILIKE`), AND logic across multiple search terms, searches title, artist, hero tags, and hidden tags. Searches like "jewel tones" or "Monet landscape" now work.
- **Work detail modal** with full metadata, tags, dimensions, source label, max print size, "Add to Selection" button, left/right arrow navigation (keyboard + buttons)
- **AI tagging** with OpenAI GPT-4o vision — enhanced prompt with:
  - 10 hero tags (medium, subject matter, mood, style)
  - 50 hidden tags covering: artist style references ("looks like Monet"), art movements ("impressionism", "brutalism"), color palette, composition, technique, historical period, cultural context, emotional tone, setting, room fit, seasonal, abstract concepts
  - Medium detection: photograph, painting, drawing, print, sculpture, mixed_media, digital
  - Auto-corrects `workType` based on detected medium (photograph→photography, painting→work_on_canvas, drawing→work_on_paper) when current type is "reductive"
- **Re-tag endpoint** (`/api/works/retag`) — batch re-tags works with the enhanced AI prompt, updates hero/hidden tags + embeddings, auto-corrects workType based on detected medium. Processes in configurable batch sizes.
- **Vector/semantic search** with text-embedding-3-large (1536-dim pgvector embeddings)
- **Password-protected admin** (`ADMIN_PASSWORD` env var, session-based)
- **Admin panel** with 5 tabs:
  - **Manage Works** — browse, edit, archive/restore/delete works, download source images, inline editing
  - **Add Work** — single image upload with manual metadata entry form, free-text Source field, GP Exclusive toggle, image preview, auto-title from filename
  - **Bulk Import** — CSV + ZIP upload (CSV is optional; images-only derives titles from filenames)
  - **Update Metadata** — CSV-only upload to update existing works (matches by GP SKU first, fallback to filename)
  - **Public Domain** — search 6 museum APIs, preview results with pixel dimensions + max print size, select & import, download source images directly from museums
- **Multi-select bulk actions** in admin — checkbox selection on works table with select-all/none/some states. Bulk action bar: Re-tag Selected, Archive Selected, Restore Selected, Delete Selected (double confirmation). Retag progress/results display with work type change reporting.
- **6 museum integrations** for public domain artwork:
  - Rijksmuseum, Getty Museum, The Met, Yale Art Gallery, National Gallery of Art, Cleveland Museum of Art
  - Each with search, preview (pixel dims + max print inches), select & import, direct source image link (opens in new tab)
  - Min short side slider filter (0-36") across all museum grids
- **Source tracking** — `sourceType` enum + `sourceLabel` human-readable name
- **Max print size** — computed from actual downloaded image at 300 DPI, displayed in work detail modal + admin/museum search results (not shown on catalog grid cards)
- **GP SKU** — optional, manually assigned (no auto-generation)
- **GP Exclusive** — boolean flag on works, settable via CSV (`gp_exclusive` column) or admin toggle, badge displayed on catalog cards (toggleable via Labels button), gold-accented quick filter button on homepage
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
- **Deployed to Vercel** with all env vars configured
- **Several hundred works** imported into the database with AI tagging

### What's NOT Done Yet
- **Full catalog import** (real production images)
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

**Key Work model fields added (Sessions 2-5):**
- `source_label` — Human-readable source name (e.g., "Cleveland Museum of Art", "General Public")
- `max_print_inches` — JSON `{ width, height }` computed from actual image at 300 DPI
- `source_type` enum — includes `cleveland` (added Session 3)
- `gp_exclusive` — Boolean flag for GP exclusive works (added Session 4)
- GP SKU is now nullable (null for public domain imports)
- `ai_tags_hero` — String[] of 10 primary tags (searched via raw SQL substring matching)
- `ai_tags_hidden` — String[] of 50 extended search tags (artist references, movements, etc.)
- `embedding` — pgvector(1536) for semantic search
- `retailer_exclusive` — Nullable string for retailer-specific works (filterable in sidebar)

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
│   │   ├── page.tsx               # Homepage - catalog with search, infinite scroll, filter sidebar, quick filters
│   │   ├── layout.tsx             # Root layout (Inter + Oswald fonts)
│   │   ├── globals.css            # Theme colors + Tailwind v4
│   │   ├── admin/
│   │   │   └── page.tsx           # Admin - 5 tabs: manage works (bulk actions), add work, bulk import, update metadata, public domain
│   │   ├── selections/
│   │   │   └── [id]/page.tsx      # Selection detail - drag reorder, notes, share, PDF/Excel/PPT export
│   │   ├── share/
│   │   │   └── [token]/page.tsx   # Public share page - GP branded, masonry grid + detail modal
│   │   └── api/
│   │       ├── admin/auth/route.ts                  # Password verification
│   │       ├── auth/[...nextauth]/route.ts          # OAuth endpoint
│   │       ├── works/route.ts                       # Works list (search, multi-value filters, pagination)
│   │       ├── works/[id]/route.ts                  # Single work (GET, PATCH, DELETE)
│   │       ├── works/[id]/download/route.ts         # Download source image from S3
│   │       ├── works/artists/route.ts               # Distinct artist names for filter dropdown
│   │       ├── works/retailers/route.ts             # Distinct retailer values for filter checkboxes
│   │       ├── works/top-tags/route.ts              # Top 20 hero tags by frequency for dynamic filters
│   │       ├── works/retag/route.ts                 # Batch re-tag with AI (tags + embeddings + workType)
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
- **Arrow navigation** — left/right arrow keys or chevron buttons flip through works in the detail modal with wrap-around

---

## Known Issues

- **Neon DB cold starts** — the serverless Postgres connection pooler times out after idle periods, causing the dev server and API to hang. Fix: kill dev server, restart, and hit an API endpoint (e.g., `/api/works?limit=1`) to warm the connection.
- **NGA dimension accuracy** — NGA's `published_images.csv` reports original scan dimensions (up to 31,000+ px) which may exceed what the IIIF endpoint actually serves. The NGA search route now fetches each result's `info.json` endpoint to get actual IIIF-served dimensions, so search results display accurate pixel counts + max print sizes. Some images serve at full resolution while others are capped (e.g., to 900px). Once imported, dimensions are re-measured from the actual downloaded image via sharp.

---

## What's Next

### Immediate
1. **Custom domain** — add in Vercel dashboard (Settings > Domains)
2. **Continue importing** — catalog is growing, keep adding works

### Soon
3. **Date-range filter** — `createdAt` is tracked on all works, ready for UI filter
4. **Google/Microsoft OAuth** for team login

### Later
5. **CloudFront CDN** for faster image delivery
6. **Semantic similarity search** — "find works similar to this one" using pgvector cosine distance

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
12. **Public domain = Reductive** — all museum imports use `work_type: "reductive"` (Reductive on Paper/Canvas), but AI tagging auto-corrects based on detected medium
13. **Free-text Source field** — admin Add Work form uses text input for source (not enum dropdown)
14. **Dynamic filter buttons** — quick filter buttons populated from actual top tags in the catalog (not hardcoded), ensuring filters always reflect what's in the collection
15. **Raw SQL for tag search** — Prisma's `has` only does exact array element matches; raw SQL `array_to_string() + ILIKE` enables substring matching within tags (e.g., "jewel" matches a tag "jewel tones")
16. **Sidebar + quick filters coexist** — sidebar structured filters (work type, orientation, source, retailer, artist) combine with quick filter tag buttons via AND logic
17. **Re-tag over retrain** — existing works can be re-tagged with enhanced AI prompts without re-importing; retag also regenerates embeddings and auto-corrects workType
