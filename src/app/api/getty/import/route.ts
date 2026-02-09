import { NextRequest, NextResponse } from "next/server";
import { getGettyObjectDetail, getGettyFullUrl } from "@/lib/getty";
import { prisma } from "@/lib/prisma";
import { CsvRow, ImportResult, processWorkImport } from "@/lib/import";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as {
      items: { objectId: string; accessionNumber: string }[];
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
        sourceType: "getty",
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
        // Fetch full object detail
        const detail = await getGettyObjectDetail(item.objectId);

        if (!detail) {
          results.push({
            success: false,
            gpSku: "N/A",
            title: item.accessionNumber,
            artistName: "",
            error: "Could not resolve object details or no image available",
          });
          errorCount++;
          continue;
        }

        // Fetch full-res image from IIIF
        const imageUrl = getGettyFullUrl(detail.imageUrl);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          results.push({
            success: false,
            gpSku: "N/A",
            title: detail.title,
            artistName: detail.artist,
            error: `Failed to fetch image: ${imgRes.status}`,
          });
          errorCount++;
          continue;
        }
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Build CsvRow for processWorkImport
        const row: CsvRow = {
          filename: `${detail.accessionNumber.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`,
          title: detail.title,
          artist_name: detail.artist || "Unknown Artist",
          work_type: "reductive",
          source_type: "getty",
          source_id: detail.accessionNumber,
          source: "Getty Museum",
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
    console.error("Getty import error:", error);
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
