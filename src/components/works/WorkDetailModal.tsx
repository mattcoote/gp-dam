"use client";

import { X, ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/components/cart/CartContext";

interface WorkDetail {
  id: string;
  gpSku: string | null;
  title: string;
  artistName: string;
  sourceType: string;
  sourceLabel: string | null;
  workType: string;
  orientation: string | null;
  dimensionsInches: { width: number; height: number; depth?: number } | null;
  maxPrintInches: { width: number; height: number } | null;
  imageUrlPreview: string | null;
  imageUrlThumbnail: string | null;
  aiTagsHero: string[];
  retailerExclusive: string | null;
  customResizeAvailable: boolean;
}

interface WorkDetailModalProps {
  workId: string | null;
  onClose: () => void;
  workIds?: string[];
  onNavigate?: (workId: string) => void;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  synograph: "Synograph",
  work_on_paper: "Work on Paper",
  work_on_canvas: "Work on Canvas",
  photography: "Photography",
  reductive: "Reductive",
};

export default function WorkDetailModal({
  workId,
  onClose,
  workIds = [],
  onNavigate,
}: WorkDetailModalProps) {
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { addItem, removeItem, isInCart } = useCart();

  const currentIndex = workId ? workIds.indexOf(workId) : -1;
  const canNavigate = workIds.length > 1 && onNavigate;

  const goToPrev = useCallback(() => {
    if (!canNavigate || currentIndex < 0) return;
    const prevIndex = currentIndex === 0 ? workIds.length - 1 : currentIndex - 1;
    onNavigate!(workIds[prevIndex]);
  }, [canNavigate, currentIndex, workIds, onNavigate]);

  const goToNext = useCallback(() => {
    if (!canNavigate || currentIndex < 0) return;
    const nextIndex = currentIndex === workIds.length - 1 ? 0 : currentIndex + 1;
    onNavigate!(workIds[nextIndex]);
  }, [canNavigate, currentIndex, workIds, onNavigate]);

  useEffect(() => {
    if (!workId) {
      setWork(null);
      return;
    }

    setLoading(true);
    fetch(`/api/works/${workId}`)
      .then((r) => r.json())
      .then((data) => {
        setWork(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workId]);

  useEffect(() => {
    if (!workId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [workId, onClose, goToPrev, goToNext]);

  if (!workId) return null;

  const dims = work?.dimensionsInches as {
    width: number;
    height: number;
    depth?: number;
  } | null;
  const maxPrint = work?.maxPrintInches as {
    width: number;
    height: number;
  } | null;

  const inCart = work ? isInCart(work.id) : false;

  function handleCartToggle() {
    if (!work) return;
    if (inCart) {
      removeItem(work.id);
    } else {
      addItem({
        workId: work.id,
        title: work.title,
        artistName: work.artistName,
        imageUrlThumbnail: work.imageUrlThumbnail || null,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-foreground hover:bg-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Arrow nav buttons */}
        {canNavigate && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 p-2 text-foreground hover:bg-white transition-colors shadow-md"
              title="Previous work"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 p-2 text-foreground hover:bg-white transition-colors shadow-md"
              title="Next work"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {loading || !work ? (
          <div className="flex items-center justify-center h-96">
            <div className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="flex-1 bg-muted p-8 flex items-center justify-center min-h-[300px] relative">
              {work.imageUrlPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={work.imageUrlPreview}
                  alt={work.title}
                  className="max-h-[60vh] w-auto object-contain"
                />
              ) : (
                <div className="text-muted-foreground text-sm">
                  No image available
                </div>
              )}

              {/* Position indicator */}
              {canNavigate && currentIndex >= 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  {currentIndex + 1} / {workIds.length}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="w-full md:w-80 p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-medium">{work.title}</h2>
                <p className="text-muted-foreground">{work.artistName}</p>
              </div>

              <div className="space-y-2 text-sm">
                {dims && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>
                      {dims.width} x {dims.height}
                      {dims.depth ? ` x ${dims.depth}` : ""}&quot;
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>
                    {WORK_TYPE_LABELS[work.workType] || work.workType}
                  </span>
                </div>
                {maxPrint && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Print</span>
                    <span>
                      {maxPrint.width}&quot; &times; {maxPrint.height}&quot;
                    </span>
                  </div>
                )}
                {work.sourceLabel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span>{work.sourceLabel}</span>
                  </div>
                )}
                {work.gpSku && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono text-xs">{work.gpSku}</span>
                  </div>
                )}
                {work.retailerExclusive && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Retailer</span>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {work.retailerExclusive} Exclusive
                    </span>
                  </div>
                )}
                {work.customResizeAvailable && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Custom sizing available
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {work.aiTagsHero.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cart action */}
              <div className="flex flex-col gap-2 mt-auto pt-4">
                <button
                  onClick={handleCartToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inCart
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {inCart ? (
                    <>
                      <Check className="w-4 h-4" /> In Selection
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add to Selection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
