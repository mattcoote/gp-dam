import { NextRequest, NextResponse } from "next/server";
import { searchYale, getYaleObjectDetail, getYaleThumbnailUrl, getYaleImageUrl } from "@/lib/yale";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MIN_PRINT_PX = 3600; // 12" at 300 DPI

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Step 1: Search for object URIs
    const searchData = await searchYale(query.trim(), { page, pageLength: 20 });

    // Step 2: Resolve each object to get full details + image info
    const details = await Promise.all(
      searchData.items.map((item) => getYaleObjectDetail(item.objectId))
    );

    // Filter out nulls and non-public-domain
    const validDetails = details.filter(
      (d): d is NonNullable<typeof d> => d !== null && d.isPublicDomain
    );

    // Filter for printable size: longest side must be >= 3600px (12" at 300 DPI)
    const printableDetails = validDetails.filter((d) => {
      if (!d.imageWidth || !d.imageHeight) return false;
      return Math.max(d.imageWidth, d.imageHeight) >= MIN_PRINT_PX;
    });

    // Step 3: Check which are already imported
    const accessionNumbers = printableDetails.map((d) => d.accessionNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "yale",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    const results = printableDetails.map((d) => ({
      objectId: d.objectId,
      accessionNumber: d.accessionNumber,
      title: d.title,
      artist: d.artist,
      imageUrl: d.thumbnailUrl
        ? getYaleThumbnailUrl(d.thumbnailUrl)
        : getYaleImageUrl(d.imageServiceUrl, 600),
      imageServiceUrl: d.imageServiceUrl,
      sourceUrl: getYaleImageUrl(d.imageServiceUrl),
      alreadyImported: importedSet.has(d.accessionNumber),
      imageWidth: d.imageWidth!,
      imageHeight: d.imageHeight!,
      maxPrintInches: {
        width: Math.round((d.imageWidth! / 300) * 10) / 10,
        height: Math.round((d.imageHeight! / 300) * 10) / 10,
      },
    }));

    return NextResponse.json({
      count: searchData.totalItems,
      page,
      totalPages: Math.ceil(searchData.totalItems / 20),
      results,
    });
  } catch (error) {
    console.error("Yale search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
