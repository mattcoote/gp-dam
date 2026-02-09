import { NextRequest, NextResponse } from "next/server";
import { searchMet, getMetObjectDetail } from "@/lib/met";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
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

    // Step 1: Search for object IDs
    const searchData = await searchMet(query.trim());

    // Paginate the IDs
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageIDs = searchData.objectIDs.slice(startIdx, startIdx + PAGE_SIZE);

    // Step 2: Resolve each object to get full details
    const details = await Promise.all(
      pageIDs.map((id) => getMetObjectDetail(id))
    );

    // Filter out nulls and non-printable images
    const validDetails = details.filter(
      (d): d is NonNullable<typeof d> => d !== null
    );

    const printableDetails = validDetails.filter((d) => {
      if (!d.imageWidth || !d.imageHeight) return false;
      return Math.max(d.imageWidth, d.imageHeight) >= MIN_PRINT_PX;
    });

    // Step 3: Check which are already imported
    const accessionNumbers = printableDetails.map((d) => d.accessionNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "met",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    const results = printableDetails.map((d) => ({
      objectID: d.objectID,
      accessionNumber: d.accessionNumber,
      title: d.title,
      artist: d.artistDisplayName,
      imageUrl: d.primaryImageSmall,
      fullImageUrl: d.primaryImage,
      sourceUrl: d.primaryImage,
      alreadyImported: importedSet.has(d.accessionNumber),
      imageWidth: d.imageWidth!,
      imageHeight: d.imageHeight!,
      maxPrintInches: {
        width: Math.round((d.imageWidth! / 300) * 10) / 10,
        height: Math.round((d.imageHeight! / 300) * 10) / 10,
      },
    }));

    return NextResponse.json({
      count: searchData.total,
      page,
      totalPages: Math.ceil(searchData.total / PAGE_SIZE),
      results,
    });
  } catch (error) {
    console.error("Met search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
