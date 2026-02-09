import { NextRequest, NextResponse } from "next/server";
import { searchNga, getNgaThumbnailUrl, getNgaFullUrl, getNgaIiifDimensions } from "@/lib/nga";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

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

    // Search the in-memory NGA index (lazy-loads CSV data on first call)
    const searchData = await searchNga(query.trim(), { page, pageSize: PAGE_SIZE });

    // Check which are already imported
    const accessionNumbers = searchData.items.map((d) => d.accessionNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "national_gallery",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    // Fetch actual IIIF dimensions for each result (CSV reports original scan dims
    // which can be much larger than what the IIIF server actually serves)
    const iiifDims = await Promise.all(
      searchData.items.map((d) => getNgaIiifDimensions(d.iiifBaseUrl))
    );

    const results = searchData.items.map((d, i) => {
      // Use actual IIIF dimensions if available, fall back to CSV-reported
      const actualDims = iiifDims[i];
      const imageWidth = actualDims?.width || d.imageWidth;
      const imageHeight = actualDims?.height || d.imageHeight;

      return {
        objectId: d.objectId,
        accessionNumber: d.accessionNumber,
        title: d.title,
        artist: d.artist,
        classification: d.classification,
        imageUrl: getNgaThumbnailUrl(d.iiifBaseUrl, 600),
        sourceUrl: getNgaFullUrl(d.iiifBaseUrl),
        alreadyImported: importedSet.has(d.accessionNumber),
        imageWidth,
        imageHeight,
        maxPrintInches: {
          width: Math.round((imageWidth / 300) * 10) / 10,
          height: Math.round((imageHeight / 300) * 10) / 10,
        },
      };
    });

    return NextResponse.json({
      count: searchData.total,
      page,
      totalPages: Math.ceil(searchData.total / PAGE_SIZE),
      results,
    });
  } catch (error) {
    console.error("NGA search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
