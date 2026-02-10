"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";

interface WorkCardProps {
  work: {
    id: string;
    gpSku: string | null;
    title: string;
    artistName: string;
    workType: string;
    orientation: string | null;
    dimensionsInches: { width: number; height: number } | null;
    maxPrintInches?: { width: number; height: number } | null;
    sourceType?: string;
    sourceLabel?: string | null;
    imageUrlThumbnail: string | null;
    aiTagsHero: string[];
    retailerExclusive: string | null;
    gpExclusive?: boolean;
    availableSizes?: string[];
  };
  onSelect?: (work: WorkCardProps["work"]) => void;
  compact?: boolean;
  showBadges?: boolean;
}

export default function WorkCard({
  work,
  onSelect,
  compact = false,
  showBadges = true,
}: WorkCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { addItem, removeItem, isInCart } = useCart();

  const dims = work.dimensionsInches as { width: number; height: number } | null;
  const inCart = isInCart(work.id);

  function handleCartToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (inCart) {
      removeItem(work.id);
    } else {
      addItem({
        workId: work.id,
        title: work.title,
        artistName: work.artistName,
        imageUrlThumbnail: work.imageUrlThumbnail,
      });
    }
  }

  return (
    <button
      onClick={() => onSelect?.(work)}
      className="group text-left w-full focus:outline-none"
    >
      {/* Image */}
      <div className={`relative overflow-hidden rounded-lg bg-muted ${compact ? "mb-2" : "mb-3"}`}>
        {work.imageUrlThumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.imageUrlThumbnail}
            alt={work.title}
            className={`w-full h-auto block transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {!imageLoaded && (
          <div className="aspect-[3/4] bg-muted animate-pulse" />
        )}

        {/* Cart toggle button */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${
            inCart ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div
            onClick={handleCartToggle}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-sm ${
              inCart
                ? "bg-black text-white"
                : "bg-white/90 text-gray-600 hover:bg-white hover:text-black backdrop-blur-sm"
            }`}
            title={inCart ? "Remove from selection" : "Add to selection"}
          >
            {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Badges */}
        {showBadges && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {work.gpExclusive && (
              <div className="rounded-full bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white uppercase tracking-wider">
                GP Exclusive
              </div>
            )}
            {work.retailerExclusive && (
              <div className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                {work.retailerExclusive}
              </div>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      </div>

      {/* Info */}
      <h3 className={`font-medium leading-tight truncate ${compact ? "text-xs" : "text-sm"}`}>
        {work.title}
      </h3>
      <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>{work.artistName}</p>
      {!compact && dims && (
        <p className="text-xs text-muted-foreground">
          {dims.width} x {dims.height}&quot;
        </p>
      )}
{!compact && work.availableSizes && work.availableSizes.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Sizes: {work.availableSizes.join(", ")}
        </p>
      )}
      {!compact && work.sourceLabel && (
        <p className="text-[10px] text-muted-foreground">
          {work.sourceLabel}
        </p>
      )}
    </button>
  );
}
