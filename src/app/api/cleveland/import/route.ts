import { NextRequest, NextResponse } from "next/server";
import { getCmaPrintUrl } from "@/lib/cma";
import { prisma } from "@/lib/prisma";
import { CsvRow, ImportResult, processWorkImport } from "@/lib/import";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as {
      items: { objectId: number; accessionNumber: string }[];
    };

    if (!items?.length) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    // Check which are already imported
    const accessionNumbers = items.map((i) => i.accessionNumber);
    const existing = await prisma.work.findMany({
      where: {
        sourceType: "cleveland",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      if (importedSet.has(item.accessionNumber)) {
        results.push({
          success: true,
          gpSku: "—",
          title: item.accessionNumber,
          artistName: "",
          error: "Already imported",
        });
        skippedCount++;
        continue;
      }

      try {
        // Fetch print-tier image (3400px JPEG)
        const imageUrl = getCmaPrintUrl(item.accessionNumber);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          results.push({
            success: false,
            gpSku: "N/A",
            title: item.accessionNumber,
            artistName: "",
            error: `Failed to fetch image: ${imgRes.status}`,
          });
          errorCount++;
          continue;
        }
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Fetch artwork details from the API to get title/artist
        const detailRes = await fetch(
          `https://openaccess-api.clevelandart.org/api/artworks/${item.objectId}`
        );
        const detail = detailRes.ok ? await detailRes.json() : null;
        const artworkData = detail?.data;

        const title = artworkData?.title || item.accessionNumber;
        const artistDesc =
          artworkData?.creators?.[0]?.description || "Unknown Artist";
        const artist = artistDesc.replace(/\s*\(.*\)\s*$/, "").trim();

        const row: CsvRow = {
          filename: `${item.accessionNumber.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`,
          title,
          artist_name: artist,
          work_type: "reductive",
          source_type: "cleveland",
          source_id: item.accessionNumber,
          source: "Cleveland Museum of Art",
        };

        const result = await processWorkImport(row, imageBuffer);
        results.push(result);
        if (result.success) successCount++;
        else errorCount++;
      } catch (err) {
        results.push({
          success: false,
          gpSku: "N/A",
          title: item.accessionNumber,
          artistName: "",
          error: err instanceof Error ? err.message : "Import failed",
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: `Import complete: ${successCount} imported, ${skippedCount} already existed, ${errorCount} failed`,
      total: items.length,
      successCount,
      skippedCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Cleveland import error:", error);
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
