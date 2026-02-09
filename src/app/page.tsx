"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, CheckSquare } from "lucide-react";
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
  maxPrintInches: { width: number; height: number } | null;
  sourceType: string;
  sourceLabel: string | null;
  imageUrlThumbnail: string | null;
  aiTagsHero: string[];
  retailerExclusive: string | null;
  gpExclusive: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const QUICK_FILTERS = [
  { label: "GP Exclusive", param: "gpExclusive", value: "true" },
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

  // Active selection (F1)
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);

  // Bulk select mode (F2)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedWorkIds, setSelectedWorkIds] = useState<Set<string>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Initialize session ID and active selection on client
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    const stored = localStorage.getItem("dam-active-selection-id");
    if (stored) setActiveSelectionId(stored);
  }, []);

  const updateActiveSelectionId = useCallback((id: string | null) => {
    setActiveSelectionId(id);
    if (id) {
      localStorage.setItem("dam-active-selection-id", id);
    } else {
      localStorage.removeItem("dam-active-selection-id");
    }
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

  // Bulk select helpers (F2)
  function toggleWorkSelection(workId: string) {
    setSelectedWorkIds((prev) => {
      const next = new Set(prev);
      if (next.has(workId)) {
        next.delete(workId);
      } else {
        next.add(workId);
      }
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedWorkIds(new Set());
  }

  async function bulkAddToSelection() {
    if (selectedWorkIds.size === 0) return;
    setIsBulkAdding(true);

    let selectionId = activeSelectionId;

    // Auto-create if no active selection
    if (!selectionId) {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Selection 1", sessionId }),
      });
      const data = await res.json();
      selectionId = data.selection.id;
      updateActiveSelectionId(selectionId);
    }

    // Add each work sequentially
    for (const workId of selectedWorkIds) {
      try {
        await fetch(`/api/selections/${selectionId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workId }),
        });
      } catch {
        // Skip duplicates / errors
      }
    }

    setIsBulkAdding(false);
    exitSelectMode();
  }

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
          <span className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-oswald)] text-sm font-bold uppercase tracking-wider">
            Art Catalog
          </span>
          <nav className="ml-auto flex items-center gap-6">
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
        {/* Select mode toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectMode
                ? "bg-black text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? "Cancel Selection" : "Select Multiple"}
          </button>
        </div>
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
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelect={(w) => {
                  if (selectMode) {
                    toggleWorkSelection(w.id);
                  } else {
                    setSelectedWorkId(w.id);
                  }
                }}
                selectMode={selectMode}
                isSelected={selectedWorkIds.has(work.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mb-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-2">
          <span className="font-[family-name:var(--font-oswald)] text-sm font-bold tracking-tight uppercase">
            General Public
          </span>
          <p className="text-xs text-muted-foreground">
            &copy;2026
          </p>
        </div>
      </footer>

      {/* Bulk Select Action Bar */}
      {selectMode && selectedWorkIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-6 pb-2">
          <div className="bg-black text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedWorkIds.size} selected
            </span>
            <button
              onClick={bulkAddToSelection}
              disabled={isBulkAdding}
              className="px-4 py-1.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {isBulkAdding ? "Adding..." : "Add to Selection"}
            </button>
            <button
              onClick={exitSelectMode}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Work Detail Modal */}
      <WorkDetailModal
        workId={selectedWorkId}
        onClose={() => setSelectedWorkId(null)}
        sessionId={sessionId}
        activeSelectionId={activeSelectionId}
        onSetActiveSelectionId={updateActiveSelectionId}
      />

      {/* Selection Bar */}
      {sessionId && (
        <SelectionBar
          sessionId={sessionId}
          activeSelectionId={activeSelectionId}
          onSetActiveSelectionId={updateActiveSelectionId}
        />
      )}
    </div>
  );
}
