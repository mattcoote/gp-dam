# GP DAM — Phase 2 Roadmap

## Vision

Transform the GP DAM from an internal asset management tool into a **trade-facing art commerce platform** where interior designers and trade partners can browse, select, and order artwork across all GP brands — while public visitors can discover work and click through to retail partners.

**Core value proposition:** One destination for GP originals, public domain fine art, and partner brand exclusives — with premium print and framing from a single source.

---

## Guiding Principles

- **Pricing is optional, not blocking.** Works without pricing show "Request Quote." Data gets backfilled over time.
- **Public and trade experiences diverge at login.** Anonymous visitors get retailer links and "Available at RH" badges. Trade users get wholesale pricing, cart, and quote flow.
- **Ship incrementally.** Each milestone delivers standalone value. No big-bang launches.
- **Lean sales team.** Automate the intake-to-order pipeline so the team focuses on relationships, not data entry.

---

## Milestone 1 — Quick Wins (Low effort, immediate value)

### 1A. "New" Badge + Sort by Date
- Auto-tag works as "NEW" for a configurable period (e.g. 30 days) or until a threshold of newer uploads pushes them out
- Add "Sort by: Newest" option to catalog (uses existing `createdAt` field)
- "New" filter bubble alongside existing filter chips
- **Effort:** Small — frontend only, no schema changes

### 1B. "Available at" Retailer Filter (Public Side)
- Filter chips: "Available at RH", "Available at CB2", "Available at Rejuvenation", etc.
- Driven by existing `retailerExclusive` field
- Each work card shows retailer badge when applicable
- Clicking badge or a "Buy at RH" button opens the retailer's product page in a new tab
- Requires a new field: `retailerUrl` (nullable string) — the direct link to the retailer listing
- **Effort:** Small — one new DB field, frontend filter + badge + link

### 1C. Upload Date Data Cleanup
- Fix the 302 works missing `artist_name` and re-upload
- Handle the 2 special-character filename failures
- **Effort:** Data work, no code changes

---

## Milestone 2 — Multi-Brand Catalog

### 2A. Brand as a First-Class Dimension
- New concept: **Brand** — the entity offering the work for sale
- Values: "General Public", "Visual Contrast", "Simply Framed" (extensible)
- Distinct from `retailerExclusive` (where it's sold) and `sourceLabel` (where it came from)
- New DB field on Work: `brand` (string, default "General Public")
- Brand filter on catalog homepage — browse one brand or all combined
- Brand badge on work cards
- **Effort:** Moderate — schema migration, admin UI for setting brand, frontend filter

### 2B. Public Domain Expansion
- Add more museum API integrations (Art Institute of Chicago, Smithsonian, Library of Congress, Europeana)
- Bulk import tooling to rapidly grow the fine art catalog
- All public domain works available for GP to print and frame on demand
- **Effort:** Moderate per museum — follows established pattern from Phase 1

---

## Milestone 3 — Trade Login + Dynamic Pricing

### 3A. Authentication
- Trade accounts: email/password or SSO (Google/Microsoft OAuth already scaffolded)
- Admin-approved trade accounts (not self-service registration)
- User roles: `public` (anonymous), `trade` (logged-in designer), `admin`
- Trade users see everything public users see, plus wholesale features
- **Effort:** Moderate — NextAuth is already wired, needs role system + approval flow

### 3B. Pricing Data Model
- New fields on Work (all nullable — pricing is optional):
  - `priceRetail` — MSRP / retail price (decimal)
  - `priceWholesale` — trade price (decimal)
  - `priceTiers` — JSON for volume/tier pricing if needed later
- Works **with** pricing: show price to appropriate audience
- Works **without** pricing: show "Request Quote" button
- Pricing importable via CSV (same update-metadata flow)
- **Effort:** Small schema change, moderate UI work

### 3C. Public Experience (No Login Required)
- Browse full catalog
- See retailer badges ("Available at RH") with direct links to buy
- See retail price where available, "Contact for Pricing" where not
- Selection/share/export features work as they do today
- No cart or checkout — public users buy through retailers

### 3D. Trade Experience (Login Required)
- See wholesale pricing where available, "Request Quote" where not
- **Trade cart** — add works with quantity, size, frame selection
- **Quote/order submission** — cart submits to GP sales team (not a payment gateway)
- Generates a **sales report** (PDF/Excel) sent to sales team + trade customer
- Order history for trade accounts
- **Effort:** Large — this is the biggest build in Phase 2

---

## Milestone 4 — Framed Inventory + Size Calculator

### 4A. Available Framed Inventory
- Catalog section or filter for ready-to-ship framed pieces
- Additional fields: `inventoryStatus` (available/sold/reserved), `frameType`, `framedPrice`
- Discounted pricing visible — deeper discounts for trade
- **Effort:** Moderate — new fields, inventory management UI

### 4B. Custom Size / Ratio Calculator
- Widget in work detail and checkout flow
- User enters desired dimensions → calculator shows:
  - Whether custom size is available for this work (based on `maxPrintInches`)
  - Closest standard size options
  - Aspect ratio lock / crop preview
- Integrates with quote flow — custom sizes go to sales team
- **Effort:** Moderate — standalone component, math logic + UI

### 4C. Frame Selection
- 5 core frame options: Black, Walnut, White, Natural, Gold Float
- Selectable in work detail view and cart
- Frame choice included in quote/order submission
- **Effort:** Small — dropdown/chip selector, data passed through to order

---

## Milestone 5 — Automated Intake Pipeline

### 5A. S3 Drop Zone
- Designated S3 prefix (e.g. `intake/`) acts as a drop zone
- Production team scans artwork → uploads JPEG to drop zone (via S3 client, Cyberduck, or simple upload page)
- S3 event trigger (Lambda or polling) detects new files
- Auto-processes: Sharp resize, AI tagging, DB insert with derived title
- Admin gets notification of new intake, can review/edit metadata
- **Effort:** Moderate — S3 events + processing pipeline

### 5B. Watched Folder (Alternative)
- For teams that prefer local workflow: watch a network folder
- Lightweight sync daemon copies new files to S3 drop zone
- Same processing pipeline as 5A from there
- **Effort:** Small addition on top of 5A — just a sync script

---

## Milestone 6 — Room Rendering / Frame Visualizer (Long-term)

### 6A. Frame Preview
- Show each work in all 5 frame options (Black, Walnut, White, Natural, Gold Float)
- Canvas-based compositing: work image + frame overlay at correct proportions
- Frame assets: photographed or 3D-rendered frame profile strips
- Toggle between frames in work detail view
- **Effort:** Moderate — image compositing, frame assets needed

### 6B. Room Scene Mockups
- Pre-designed room templates (living room, office, dining room, bedroom)
- Place selected work + frame into scene at correct scale
- Could use:
  - **Template compositing** — pre-shot room photos with designated art placement zones
  - **AI generation** — use image generation to render work in realistic room settings
- **Effort:** Large — depends on approach (template = moderate, AI = experimental)

---

## Data Model Changes Summary

New/modified fields across all milestones:

| Field | Type | Milestone | Notes |
|-------|------|-----------|-------|
| `retailerUrl` | String? | 1B | Direct link to retailer product page |
| `brand` | String | 2A | "General Public", "Visual Contrast", "Simply Framed" |
| `priceRetail` | Decimal? | 3B | MSRP, nullable (no price = "Request Quote") |
| `priceWholesale` | Decimal? | 3B | Trade price, nullable |
| `priceTiers` | JSON? | 3B | Future volume pricing |
| `inventoryStatus` | Enum? | 4A | available, sold, reserved |
| `frameType` | String? | 4A | For framed inventory items |
| `framedPrice` | Decimal? | 4A | Price of framed piece |

New tables:

| Table | Milestone | Purpose |
|-------|-----------|---------|
| `User` roles extension | 3A | Add `role` (public/trade/admin), `approved` flag |
| `Order` | 3D | Trade orders/quotes with line items |
| `OrderItem` | 3D | Work + quantity + size + frame per order line |

---

## Suggested Sequence

```
NOW        Milestone 1 (quick wins — new badge, retailer filters, data cleanup)
           ↓
NEXT       Milestone 2A (multi-brand — schema + UI)
           ↓
THEN       Milestone 3A-3C (auth + pricing + public experience)
           ↓
           Milestone 3D (trade cart + quote flow) ← biggest build
           ↓
PARALLEL   Milestone 4 (framed inventory + calculator + frame selection)
           Milestone 5 (automated intake) ← can build anytime
           ↓
LATER      Milestone 6 (room rendering / frame visualizer)
```

Milestones 4 and 5 are independent and can be built in parallel with or after Milestone 3.

---

## Open Questions

1. **Trade account approval** — manual admin approval? Or invite-only with trade codes?
2. **Retailer URLs** — do you have a spreadsheet mapping SKUs to RH/CB2/etc. product pages, or will these be entered manually?
3. **Brand assignment** — are brands determined by the work itself, or can the same work appear under multiple brands?
4. **Order fulfillment** — does the sales report just go to email, or should there be an admin dashboard for order management?
5. **Framed inventory tracking** — is there an existing inventory system (ERP, spreadsheet) to sync with, or is the DAM the source of truth?
6. **Room scenes** — do you have room photography ready, or does this need a photo shoot / asset creation phase?
