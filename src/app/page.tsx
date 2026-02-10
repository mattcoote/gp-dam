"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Grid3X3, Grid2X2, Loader2, ChevronDown } from "lucide-react";
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

// GP Exclusive is always pinned first
const GP_EXCLUSIVE_FILTER = { label: "GP Exclusive", type: "gpExclusive" as const };
const MAX_TAG_FILTERS = 6;

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
  const [artists, setArtists] = useState<string[]>([]);
  const [topTags, setTopTags] = useState<{ tag: string; label: string; count: number }[]>([]);

  // Fetch distinct artists and top tags for filter dropdowns
  useEffect(() => {
    fetch("/api/works/artists")
      .then((res) => res.json())
      .then((data) => setArtists(data.artists || []))
      .catch(() => {});
    fetch("/api/works/top-tags")
      .then((res) => res.json())
      .then((data) => setTopTags(data.topTags || []))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (artistFilter) {
        params.set("artist", artistFilter);
      }

      // Apply active quick filter
      if (activeFilter) {
        if (activeFilter === GP_EXCLUSIVE_FILTER.label) {
          params.set("gpExclusive", "true");
        } else {
          // Tag-based filter — combine with search
          const combined = debouncedSearch
            ? `${debouncedSearch} ${activeFilter.toLowerCase()}`
            : activeFilter.toLowerCase();
          params.set("search", combined);
        }
      }

      return params;
    },
    [debouncedSearch, activeFilter, artistFilter]
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

  // Load more (next page) — appends to existing works
  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination || currentPage >= pagination.totalPages) return;
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

  // Infinite scroll: IntersectionObserver on sentinel div
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const toggleFilter = (label: string) => {
    setActiveFilter((prev) => (prev === label ? null : label));
  };

  const hasMore = pagination ? currentPage < pagination.totalPages : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6 relative">
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

        {/* Quick Filters — GP Exclusive pinned first, then top tags from the catalog */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {/* GP Exclusive — always visible */}
          <button
            onClick={() => toggleFilter(GP_EXCLUSIVE_FILTER.label)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              activeFilter === GP_EXCLUSIVE_FILTER.label
                ? "border-foreground bg-foreground text-white"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {GP_EXCLUSIVE_FILTER.label}
          </button>

          {/* Dynamic tag filters from catalog */}
          {topTags.slice(0, MAX_TAG_FILTERS).map((t) => (
            <button
              key={t.tag}
              onClick={() => toggleFilter(t.label)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeFilter === t.label
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Artist filter dropdown */}
          <div className="relative">
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className={`appearance-none rounded-full border px-4 py-1.5 pr-8 text-sm transition-colors cursor-pointer ${
                artistFilter
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              <option value="">Artist</option>
              {artists.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Works Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {/* Toolbar: thumbnail size toggle */}
        <div className="flex items-center justify-end gap-2 mb-4">
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
        {loading ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize === "small" ? "150px" : "240px"}, 1fr))`,
            }}
          >
            {Array.from({ length: thumbSize === "small" ? 12 : 8 }).map((_, i) => (
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
              {searchQuery || activeFilter || artistFilter
                ? "No works match your search."
                : "No works in the catalog yet."}
            </p>
            {(searchQuery || activeFilter || artistFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter(null);
                  setArtistFilter("");
                }}
                className="mt-3 text-sm text-foreground underline"
              >
                Clear filters
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
        {/* Invisible sentinel for intersection observer */}
        <div ref={sentinelRef} className="h-1" />
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-2">
          <span className="font-[family-name:var(--font-oswald)] text-sm font-bold tracking-tight uppercase">
            General Public
          </span>
          <p className="text-xs text-muted-foreground">
            &copy;2026
          </p>
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
