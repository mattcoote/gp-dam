# GP DAM - Project Status

## Last Updated: Feb 7, 2026

---

## What This Is
A Digital Asset Management system for General Public (art print company), replacing an outdated Squarespace catalog. Built with Next.js, PostgreSQL, and AI-powered search.

## Current State: Stage 1-3 (Partially Complete)

### What's Done
- **Next.js 16 project** scaffolded with TypeScript + Tailwind CSS
- **PostgreSQL database** running on Neon (free tier), all tables created
- **Database schema** includes: works, users, selections, selection_items, search_queries
- **pgvector extension** enabled for AI-powered semantic search
- **12 sample works** seeded into the database with tags and metadata
- **Working catalog page** — homepage with search bar, quick filters, masonry grid
- **Working search** — keyword search across tags, title, artist name
- **Work detail modal** — click any card to see full details, tags, dimensions
- **Exclusivity display** — exclusive works visible to all but clearly labeled (not hidden)
- **Bulk import API** — endpoint written at /api/upload (CSV + ZIP processing)
- **Admin upload page** — UI written at /admin with drag-drop file upload
- **AI tagging integration** — GPT-4V tagging + text-embedding-3-large (needs OpenAI key)
- **S3 upload library** — ready to go (needs AWS credentials)
- **Auth library** — NextAuth.js configured for Google OAuth (needs credentials)
- **SKU generation** — auto-generates GP[YEAR][SEQUENCE] format, also accepts existing SKUs

### What's NOT Done Yet
- **Selections system** (add to selection, share links, export)
- **PDF/Excel export**
- **SSO login** (Google/Microsoft OAuth credentials not configured yet)
- **S3 image storage** (using placeholder images currently)
- **AI tagging** (needs OpenAI API key)
- **Production deployment** to Vercel

---

## Known Issue: iCloud Sync

**Problem:** The project is on Desktop which syncs to iCloud. This causes `node_modules` (thousands of small files) to be offloaded to the cloud, making npm and Next.js hang.

**Fix (do this first tomorrow):**
Move the project to a non-iCloud location:
```bash
mv ~/Desktop/Claude/gp-dam ~/gp-dam
```
Then work from `/Users/matthewcoote/gp-dam` instead.

Alternative: System Settings > Apple ID > iCloud > iCloud Drive > Options > uncheck "Desktop & Documents Folders"

After moving, you may need to reinstall dependencies:
```bash
cd ~/gp-dam
rm -rf node_modules .next
npm install
```

---

## Tech Stack

| Component | Choice | Status |
|-----------|--------|--------|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) | Installed |
| Database | PostgreSQL + pgvector on Neon | Running |
| ORM | Prisma 7.3 | Configured |
| Auth | NextAuth.js (Google + Microsoft OAuth) | Code written, needs credentials |
| Storage | AWS S3 + CloudFront | Code written, needs AWS account |
| AI | OpenAI GPT-4V + text-embedding-3-large | Code written, needs API key |
| Images | Sharp (resize/thumbnails) | Installed |
| CSV | PapaParse | Installed |
| ZIP | JSZip | Installed |
| Deployment | Vercel (planned) | Not started |

---

## Accounts You Still Need to Set Up

1. **Vercel** — vercel.com (for deployment)
2. **OpenAI** — platform.openai.com (for AI tagging, ~$30-60 one-time for 2K works)
3. **AWS** — S3 bucket for image storage (~$2-5/mo)
4. **Google Cloud Console** — OAuth credentials for Google SSO
5. **Neon** — DONE (database is running)

---

## Database Connection

**Neon PostgreSQL** (connection string is in .env file)
- Database: neondb
- Host: ep-damp-voice-aiggddmp-pooler.c-4.us-east-1.aws.neon.tech
- **Important:** Rotate the password after setup since it was shared in chat

---

## Key Files

```
gp-dam/
├── prisma/
│   ├── schema.prisma          # Full database schema
│   ├── migrations/            # Applied migration (init)
│   ├── seed.mjs               # Sample data seeder (12 works)
│   └── seed.ts                # TypeScript version (unused)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Homepage — catalog with search + grid
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Theme colors + Tailwind
│   │   ├── admin/
│   │   │   └── page.tsx       # Admin bulk upload page
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # Auth endpoint
│   │       ├── works/route.ts               # Works list API (search, filter)
│   │       ├── works/[id]/route.ts          # Single work detail API
│   │       └── upload/route.ts              # Bulk import API
│   ├── components/
│   │   ├── works/
│   │   │   ├── WorkCard.tsx        # Grid card component
│   │   │   └── WorkDetailModal.tsx # Detail popup
│   │   └── search/
│   │       └── SearchBar.tsx       # Search input with debounce
│   ├── lib/
│   │   ├── prisma.ts     # Database client
│   │   ├── auth.ts       # NextAuth config
│   │   ├── s3.ts         # S3 upload functions
│   │   ├── openai.ts     # GPT-4V tagging + embeddings
│   │   ├── sku.ts        # GP SKU auto-generation
│   │   └── import.ts     # Bulk import processing logic
│   ├── types/
│   │   └── next-auth.d.ts  # Auth type extensions
│   └── generated/
│       └── prisma/         # Auto-generated Prisma client
├── .env                    # Environment variables (has DB connection)
├── .env.example            # Template for env vars
└── package.json            # Dependencies
```

---

## CSV Import Format

| Column | Required | Example |
|--------|----------|---------|
| gp_sku | No | GP2006310 (auto-generated if blank) |
| filename | Yes | coastal-dawn.jpg |
| title | Yes | Coastal Dawn |
| artist_name | Yes | Sarah Chen |
| work_type | Yes | synograph / work_on_paper / work_on_canvas / photography / reductive |
| dimensions | No | 24x36 or 24x36x1.5 |
| retailer_exclusive | No | RH, CB2, Rejuvenation, Anthropologie |
| artist_exclusive_to | No | RH |
| source_type | No | gp_original (default) |

---

## Build Plan (Remaining Stages)

### Stage 3 (resume here): Bulk Import
- Fix iCloud issue first
- Test import with a small CSV + ZIP
- Set up S3 for real image storage
- Set up OpenAI for AI tagging

### Stage 4: Search Enhancement
- Vector search with pgvector embeddings
- Boolean search ("blue AND abstract NOT portrait")
- Search result ranking (70% vector, 30% keyword)

### Stage 5: Selections System
- Add to Selection button (works)
- Selection management page
- Drag-drop reordering, per-item notes
- Session-based selections for anonymous users

### Stage 6: Share Links + Export
- Share token generation
- Public read-only selection view
- PDF export (branded, one work per page)
- Excel export

### Stage 7: Auth
- Google OAuth login
- Microsoft OAuth login
- Admin vs public role enforcement

### Stage 8: Polish + Deploy
- Error handling, loading states
- Mobile responsiveness
- Deploy to Vercel

---

## Key Decisions Made

1. **No Pinecone** — pgvector handles 10K works easily, saves cost + complexity
2. **No partner access in V1** — internal + public only at launch
3. **No museum APIs in V1** — focus on own catalog first
4. **No PowerPoint export in V1** — PDF + Excel only
5. **No ML retraining** — premature optimization
6. **Exclusive works are VISIBLE** to everyone but labeled, not hidden (designers buy direct)
7. **GP SKU accepted in CSV** — existing SKUs like GP2006310 can be imported, auto-generated if blank
8. **Vercel for deployment** — natural fit for Next.js
9. **Neon for database** — free tier, pgvector included, works with Vercel
