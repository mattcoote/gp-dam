"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  Grid3X3,
  Grid2X2,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import WorkCard from "@/components/works/WorkCard";
import WorkDetailModal from "@/components/works/WorkDetailModal";
import { CartProvider } from "@/components/cart/CartContext";
import CartIcon from "@/components/cart/CartIcon";
import CartDrawer from "@/components/cart/CartDrawer";

const PAGE_SIZE = 48;

interface Work {
  id: string;
  gpSku: string | null;
  title: string;
  artistName: string;
  workType: string;
  orientation: string | null;
  dimensionsInches: { width: number; height: number } | null;
  maxPrintInches: { width: number; height: number } | null;
  sourceType: string;
  sourceLabel: string | null;
  imageUrlThumbnail: string | null;
  aiTagsHero: string[];
  retailerExclusive: string | null;
  gpExclusive: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SidebarFilters {
  workTypes: string[];
  orientations: string[];
  sourceTypes: string[];
  retailers: string[];
}

const EMPTY_FILTERS: SidebarFilters = {
  workTypes: [],
  orientations: [],
  sourceTypes: [],
  retailers: [],
};

// Label maps
const WORK_TYPE_LABELS: Record<string, string> = {
  synograph: "Synograph",
  work_on_paper: "Work on Paper",
  work_on_canvas: "Work on Canvas",
  photography: "Photography",
  reductive: "Reductive",
};

const ORIENTATION_LABELS: Record<string, string> = {
  landscape: "Landscape",
  portrait: "Portrait",
  square: "Square",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  gp_original: "GP Original",
  rijksmuseum: "Rijksmuseum",
  getty: "Getty Museum",
  met: "The Met",
  yale: "Yale Art Gallery",
  national_gallery: "National Gallery of Art",
  cleveland: "Cleveland Museum of Art",
};

// GP Exclusive quick filter
const GP_EXCLUSIVE_FILTER = "GP Exclusive";
const MAX_TAG_FILTERS = 6;

// ─── Filter Sidebar ────────────────────────────────────────

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function CheckboxGroup({
  options,
  labels,
  selected,
  onChange,
}: {
  options: string[];
  labels: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-foreground focus:ring-foreground accent-black"
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {labels[opt] || opt}
          </span>
        </label>
      ))}
    </div>
  );
}

function FilterSidebar({
  filters,
  setFilters,
  artistFilter,
  setArtistFilter,
  artists,
  retailers,
  topTags,
  activeTagFilter,
  setActiveTagFilter,
  onClose,
}: {
  filters: SidebarFilters;
  setFilters: (f: SidebarFilters) => void;
  artistFilter: string;
  setArtistFilter: (v: string) => void;
  artists: string[];
  retailers: string[];
  topTags: { tag: string; label: string; count: number }[];
  activeTagFilter: string | null;
  setActiveTagFilter: (v: string | null) => void;
  onClose?: () => void;
}) {
  const activeCount =
    filters.workTypes.length +
    filters.orientations.length +
    filters.sourceTypes.length +
    filters.retailers.length +
    (artistFilter ? 1 : 0) +
    (activeTagFilter ? 1 : 0);

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setArtistFilter("");
    setActiveTagFilter(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-semibold">Filters</span>
          {activeCount > 0 && (
            <span className="bg-foreground text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable filter content */}
      <div className="flex-1 overflow-y-auto space-y-0">
        {/* Artist */}
        <FilterSection title="Artist">
          <select
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-foreground transition-colors"
          >
            <option value="">All Artists</option>
            {artists.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* Work Type */}
        <FilterSection title="Work Type">
          <CheckboxGroup
            options={Object.keys(WORK_TYPE_LABELS)}
            labels={WORK_TYPE_LABELS}
            selected={filters.workTypes}
            onChange={(v) => setFilters({ ...filters, workTypes: v })}
          />
        </FilterSection>

        {/* Orientation */}
        <FilterSection title="Orientation">
          <CheckboxGroup
            options={Object.keys(ORIENTATION_LABELS)}
            labels={ORIENTATION_LABELS}
            selected={filters.orientations}
            onChange={(v) => setFilters({ ...filters, orientations: v })}
          />
        </FilterSection>

        {/* Source */}
        <FilterSection title="Source" defaultOpen={false}>
          <CheckboxGroup
            options={Object.keys(SOURCE_TYPE_LABELS)}
            labels={SOURCE_TYPE_LABELS}
            selected={filters.sourceTypes}
            onChange={(v) => setFilters({ ...filters, sourceTypes: v })}
          />
        </FilterSection>

        {/* Retailer Exclusive */}
        {retailers.length > 0 && (
          <FilterSection title="Retailer" defaultOpen={false}>
            <CheckboxGroup
              options={retailers}
              labels={Object.fromEntries(retailers.map((r) => [r, r]))}
              selected={filters.retailers}
              onChange={(v) => setFilters({ ...filters, retailers: v })}
            />
          </FilterSection>
        )}

        {/* AI Tags — Style & Subject */}
        {topTags.length > 0 && (
          <FilterSection title="Style & Subject">
            <div className="flex flex-wrap gap-1.5">
              {topTags.slice(0, 15).map((t) => (
                <button
                  key={t.tag}
                  onClick={() =>
                    setActiveTagFilter(
                      activeTagFilter === t.label ? null : t.label
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    activeTagFilter === t.label
                      ? "border-foreground bg-foreground text-white"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────

function HomeContent() {
  const [works, setWorks] = useState<Work[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [thumbSize, setThumbSize] = useState<"large" | "small">("large");
  const [cartOpen, setCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Data for filters
  const [artists, setArtists] = useState<string[]>([]);
  const [retailers, setRetailers] = useState<string[]>([]);
  const [topTags, setTopTags] = useState<
    { tag: string; label: string; count: number }[]
  >([]);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<SidebarFilters>(EMPTY_FILTERS);
  const [sidebarTagFilter, setSidebarTagFilter] = useState<string | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    fetch("/api/works/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists || []))
      .catch(() => {});
    fetch("/api/works/retailers")
      .then((r) => r.json())
      .then((d) => setRetailers(d.retailers || []))
      .catch(() => {});
    fetch("/api/works/top-tags")
      .then((r) => r.json())
      .then((d) => setTopTags(d.topTags || []))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Count active sidebar filters for badge
  const sidebarFilterCount =
    filters.workTypes.length +
    filters.orientations.length +
    filters.sourceTypes.length +
    filters.retailers.length +
    (artistFilter ? 1 : 0) +
    (sidebarTagFilter ? 1 : 0);

  const anyFilterActive =
    !!searchQuery || !!activeFilter || sidebarFilterCount > 0;

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      // Build search string (combine text search + quick filter + sidebar tag)
      let searchStr = debouncedSearch;
      if (activeFilter && activeFilter !== GP_EXCLUSIVE_FILTER) {
        searchStr = searchStr
          ? `${searchStr} ${activeFilter.toLowerCase()}`
          : activeFilter.toLowerCase();
      }
      if (sidebarTagFilter) {
        searchStr = searchStr
          ? `${searchStr} ${sidebarTagFilter.toLowerCase()}`
          : sidebarTagFilter.toLowerCase();
      }
      if (searchStr) params.set("search", searchStr);

      // Quick filter: GP Exclusive
      if (activeFilter === GP_EXCLUSIVE_FILTER) {
        params.set("gpExclusive", "true");
      }

      // Sidebar structured filters
      if (artistFilter) params.set("artist", artistFilter);
      if (filters.workTypes.length > 0)
        params.set("workType", filters.workTypes.join(","));
      if (filters.orientations.length > 0)
        params.set("orientation", filters.orientations.join(","));
      if (filters.sourceTypes.length > 0)
        params.set("sourceType", filters.sourceTypes.join(","));
      if (filters.retailers.length > 0)
        params.set("retailerExclusive", filters.retailers.join(","));

      return params;
    },
    [debouncedSearch, activeFilter, artistFilter, filters, sidebarTagFilter]
  );

  // Initial fetch (page 1) — resets when filters/search change
  const fetchWorks = useCallback(async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = buildParams(1);
      const res = await fetch(`/api/works?${params.toString()}`);
      const data = await res.json();
      setWorks(data.works || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch works:", error);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Load more (next page) — appends
  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination || currentPage >= pagination.totalPages)
      return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const params = buildParams(nextPage);
      const res = await fetch(`/api/works?${params.toString()}`);
      const data = await res.json();
      setWorks((prev) => [...prev, ...(data.works || [])]);
      setPagination(data.pagination || null);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Failed to load more works:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, currentPage, buildParams]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Mobile sidebar: close on Escape, prevent body scroll
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarOpen]);

  const toggleQuickFilter = (label: string) => {
    setActiveFilter((prev) => (prev === label ? null : label));
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilter(null);
    setArtistFilter("");
    setFilters(EMPTY_FILTERS);
    setSidebarTagFilter(null);
  };

  const hasMore = pagination ? currentPage < pagination.totalPages : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center px-6 relative">
          <a href="/" className="flex items-center gap-0">
            <span className="font-[family-name:var(--font-oswald)] text-2xl font-bold tracking-tight uppercase">
              General Public
            </span>
          </a>
          <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-oswald)] text-sm font-bold uppercase tracking-wider">
            Art Catalog
          </span>
          <nav className="ml-auto flex items-center gap-4">
            <CartIcon onClick={() => setCartOpen(true)} />
            <a
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </a>
          </nav>
        </div>
      </header>

      {/* Search Section */}
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
        <p className="text-muted-foreground mb-8 text-sm">
          {pagination
            ? `${pagination.total} works in the collection`
            : "Loading..."}
        </p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search by title, artist, style, mood... e.g. "Monet", "impressionism", "serene landscape"'
            className="w-full rounded-full border border-border bg-white py-3.5 pl-12 pr-10 text-base outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Filters — top tags, then GP Exclusive set apart with gold accent */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {topTags.slice(0, MAX_TAG_FILTERS).map((t) => (
            <button
              key={t.tag}
              onClick={() => toggleQuickFilter(t.label)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeFilter === t.label
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={() => toggleQuickFilter(GP_EXCLUSIVE_FILTER)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === GP_EXCLUSIVE_FILTER
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-amber-400 text-amber-700 hover:bg-amber-50 hover:border-amber-500"
            }`}
          >
            GP Exclusive
          </button>
        </div>
      </section>

      {/* Main content area: sidebar + grid */}
      <section className="mx-auto max-w-[1600px] px-6 pb-24">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          {/* Filter toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              sidebarOpen || sidebarFilterCount > 0
                ? "border-foreground bg-foreground text-white"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {sidebarFilterCount > 0 && (
              <span
                className={`text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                  sidebarOpen
                    ? "bg-white text-foreground"
                    : "bg-foreground text-white"
                }`}
              >
                {sidebarFilterCount}
              </span>
            )}
          </button>

          {/* Thumbnail size toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setThumbSize("large")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                thumbSize === "large"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
              title="Large thumbnails"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setThumbSize("small")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                thumbSize === "small"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
              title="Small thumbnails"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flex layout: sidebar + grid */}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          {sidebarOpen && (
            <aside className="hidden md:block w-[260px] flex-shrink-0">
              <div className="sticky top-[4.5rem] max-h-[calc(100vh-5rem)] overflow-y-auto pb-6">
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  artistFilter={artistFilter}
                  setArtistFilter={setArtistFilter}
                  artists={artists}
                  retailers={retailers}
                  topTags={topTags}
                  activeTagFilter={sidebarTagFilter}
                  setActiveTagFilter={setSidebarTagFilter}
                />
              </div>
            </aside>
          )}

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize === "small" ? "150px" : "240px"}, 1fr))`,
                }}
              >
                {Array.from({
                  length: thumbSize === "small" ? 12 : 8,
                }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[3/4] rounded-lg bg-muted animate-pulse mb-3" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : works.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  {anyFilterActive
                    ? "No works match your filters."
                    : "No works in the catalog yet."}
                </p>
                {anyFilterActive && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-3 text-sm text-foreground underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div
                className={thumbSize === "small" ? "grid gap-3" : "grid gap-4"}
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize === "small" ? "150px" : "240px"}, 1fr))`,
                }}
              >
                {works.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    compact={thumbSize === "small"}
                    onSelect={(w) => setSelectedWorkId(w.id)}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel + load more */}
            {!loading && hasMore && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {works.length} of {pagination?.total} works
                </p>
                {loadingMore ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={loadMore}
                    className="rounded-full border border-border px-6 py-2 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
            <div ref={sentinelRef} className="h-1" />
          </div>
        </div>
      </section>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white shadow-xl p-5 overflow-y-auto">
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              artistFilter={artistFilter}
              setArtistFilter={setArtistFilter}
              artists={artists}
              retailers={retailers}
              topTags={topTags}
              activeTagFilter={sidebarTagFilter}
              setActiveTagFilter={setSidebarTagFilter}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col items-center gap-2">
          <span className="font-[family-name:var(--font-oswald)] text-sm font-bold tracking-tight uppercase">
            General Public
          </span>
          <p className="text-xs text-muted-foreground">&copy;2026</p>
        </div>
      </footer>

      {/* Work Detail Modal */}
      <WorkDetailModal
        workId={selectedWorkId}
        onClose={() => setSelectedWorkId(null)}
        workIds={works.map((w) => w.id)}
        onNavigate={setSelectedWorkId}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <CartProvider>
      <HomeContent />
    </CartProvider>
  );
}
