import { NextRequest, NextResponse } from "next/server";
import { searchCma, getCmaPrintUrl } from "@/lib/cma";
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

    const searchData = await searchCma(query.trim(), { page, pageSize: PAGE_SIZE });

    // Check which are already imported
    const accessionNumbers = searchData.items.map((d) => d.accessionNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "cleveland",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    const results = searchData.items.map((d) => ({
      objectId: d.id,
      accessionNumber: d.accessionNumber,
      title: d.title,
      artist: d.artist,
      type: d.type,
      imageUrl: d.thumbnailUrl,
      sourceUrl: getCmaPrintUrl(d.accessionNumber),
      alreadyImported: importedSet.has(d.accessionNumber),
      imageWidth: d.imageWidth,
      imageHeight: d.imageHeight,
      maxPrintInches: {
        width: Math.round((d.imageWidth / 300) * 10) / 10,
        height: Math.round((d.imageHeight / 300) * 10) / 10,
      },
    }));

    return NextResponse.json({
      count: searchData.total,
      page,
      totalPages: Math.ceil(searchData.total / PAGE_SIZE),
      results,
    });
  } catch (error) {
    console.error("Cleveland search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
