"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import WorkCard from "@/components/works/WorkCard";
import WorkDetailModal from "@/components/works/WorkDetailModal";
import SelectionBar from "@/components/selections/SelectionBar";

interface Work {
  id: string;
  gpSku: string | null;
  title: string;
  artistName: string;
  workType: string;
  orientation: string | null;
  dimensionsInches: { width: number; height: number } | null;
  imageUrlThumbnail: string | null;
  aiTagsHero: string[];
  retailerExclusive: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const QUICK_FILTERS = [
  { label: "Landscapes", param: "orientation", value: "landscape" },
  { label: "Portraits", param: "orientation", value: "portrait" },
  { label: "Abstract", param: "search", value: "abstract" },
  { label: "Photography", param: "workType", value: "photography" },
  { label: "Botanical", param: "search", value: "botanical" },
];

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("dam-session-id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("dam-session-id", sessionId);
  }
  return sessionId;
}

export default function Home() {
  const [works, setWorks] = useState<Work[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Initialize session ID on client
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      // Apply active quick filter
      if (activeFilter) {
        const filter = QUICK_FILTERS.find((f) => f.label === activeFilter);
        if (filter) {
          if (filter.param === "search") {
            // Append filter value to search
            const combined = debouncedSearch
              ? `${debouncedSearch} ${filter.value}`
              : filter.value;
            params.set("search", combined);
          } else {
            params.set(filter.param, filter.value);
          }
        }
      }

      const res = await fetch(`/api/works?${params.toString()}`);
      const data = await res.json();
      setWorks(data.works || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch works:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeFilter]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const toggleFilter = (label: string) => {
    setActiveFilter((prev) => (prev === label ? null : label));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-light tracking-[0.2em] uppercase">
            General Public
          </h1>
          <a
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </a>
        </div>
      </header>

      {/* Search Section */}
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
        <h2 className="text-3xl font-light tracking-tight mb-1">
          Art Catalog
        </h2>
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
            placeholder='Search artwork... e.g. "jewel toned abstract landscapes"'
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

        {/* Quick Filters */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => toggleFilter(filter.label)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeFilter === filter.label
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Works Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
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
              {searchQuery || activeFilter
                ? "No works match your search."
                : "No works in the catalog yet."}
            </p>
            {(searchQuery || activeFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter(null);
                }}
                className="mt-3 text-sm text-foreground underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={(w) => setSelectedWorkId(w.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Work Detail Modal */}
      <WorkDetailModal
        workId={selectedWorkId}
        onClose={() => setSelectedWorkId(null)}
        sessionId={sessionId}
      />

      {/* Selection Bar */}
      {sessionId && <SelectionBar sessionId={sessionId} />}
    </div>
  );
}
