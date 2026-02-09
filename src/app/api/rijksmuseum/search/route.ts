import { NextRequest, NextResponse } from "next/server";
import {
  searchRijksmuseum,
  getObjectDetail,
  getIiifThumbnailUrl,
  getIiifFullUrl,
  type RijksObjectDetail,
} from "@/lib/rijksmuseum";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const pageToken = searchParams.get("pageToken") || undefined;
    const type = searchParams.get("type") || "painting";

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Step 1: Search for object IDs
    const searchData = await searchRijksmuseum(query.trim(), {
      type,
      pageToken,
    });

    // The search returns up to 100 items; we'll resolve the first 20 for display
    const itemsToResolve = searchData.items.slice(0, 20);

    // Step 2: Resolve each object to get title, creator, IIIF image
    const details = await Promise.all(
      itemsToResolve.map((item) => getObjectDetail(item.objectId))
    );

    // Filter out nulls (objects without images)
    const validDetails = details.filter(
      (d): d is NonNullable<typeof d> => d !== null
    );

    // Filter for printable size: longest side must be >= 3600px (12" at 300 DPI)
    const MIN_PRINT_PX = 3600;
    const printableDetails = validDetails.filter((d: RijksObjectDetail) => {
      if (!d.imageWidth || !d.imageHeight) return false;
      return Math.max(d.imageWidth, d.imageHeight) >= MIN_PRINT_PX;
    });

    // Step 3: Check which are already imported
    const objectNumbers = printableDetails.map((d) => d.objectNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "rijksmuseum",
        sourceId: { in: objectNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    const results = printableDetails.map((d) => ({
      objectId: d.objectId,
      objectNumber: d.objectNumber,
      title: d.title,
      artist: d.creator,
      imageUrl: getIiifThumbnailUrl(d.iiifId, 600),
      sourceUrl: getIiifFullUrl(d.iiifId),
      iiifId: d.iiifId,
      alreadyImported: importedSet.has(d.objectNumber),
      imageWidth: d.imageWidth!,
      imageHeight: d.imageHeight!,
      maxPrintInches: {
        width: Math.round((d.imageWidth! / 300) * 10) / 10,
        height: Math.round((d.imageHeight! / 300) * 10) / 10,
      },
    }));

    return NextResponse.json({
      count: searchData.totalItems,
      nextPageToken: searchData.nextPageToken,
      results,
    });
  } catch (error) {
    console.error("Rijksmuseum search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
