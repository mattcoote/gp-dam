"use client";

import { useState } from "react";

interface WorkCardProps {
  work: {
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
  };
  onSelect?: (work: WorkCardProps["work"]) => void;
}

export default function WorkCard({ work, onSelect }: WorkCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const aspectRatio =
    work.orientation === "landscape"
      ? "aspect-[4/3]"
      : work.orientation === "square"
        ? "aspect-square"
        : "aspect-[3/4]";

  const dims = work.dimensionsInches as { width: number; height: number } | null;

  return (
    <button
      onClick={() => onSelect?.(work)}
      className="group text-left w-full focus:outline-none"
    >
      {/* Image */}
      <div
        className={`${aspectRatio} relative overflow-hidden rounded-lg bg-muted mb-3`}
      >
        {work.imageUrlThumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.imageUrlThumbnail}
            alt={work.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        {/* Exclusive badge */}
        {work.retailerExclusive && (
          <div className="absolute top-2 right-2 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700 uppercase tracking-wider">
            {work.retailerExclusive}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      {/* Info */}
      <h3 className="text-sm font-medium leading-tight truncate">
        {work.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">{work.artistName}</p>
      {dims && (
        <p className="text-xs text-muted-foreground">
          {dims.width} x {dims.height}&quot;
        </p>
      )}
    </button>
  );
}
