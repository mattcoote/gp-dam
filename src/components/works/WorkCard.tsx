"use client";

import { useState } from "react";
import { Check } from "lucide-react";

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
  };
  onSelect?: (work: WorkCardProps["work"]) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  compact?: boolean;
}

export default function WorkCard({
  work,
  onSelect,
  selectMode = false,
  isSelected = false,
  compact = false,
}: WorkCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const dims = work.dimensionsInches as { width: number; height: number } | null;
  const maxPrint = work.maxPrintInches as { width: number; height: number } | null;

  return (
    <button
      onClick={() => onSelect?.(work)}
      className={`group text-left w-full focus:outline-none ${
        selectMode && isSelected ? "ring-2 ring-black ring-offset-2 rounded-lg" : ""
      }`}
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

        {/* Select mode checkbox */}
        {selectMode && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-black border-black text-white"
                  : "bg-white/80 border-gray-300 backdrop-blur-sm"
              }`}
            >
              {isSelected && <Check className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Badges */}
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
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
      {!compact && maxPrint && (
        <p className="text-[10px] text-muted-foreground">
          Max print: {maxPrint.width}&quot; &times; {maxPrint.height}&quot;
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
