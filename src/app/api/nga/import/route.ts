import { NextRequest, NextResponse } from "next/server";
import { loadNgaData, getNgaFullUrl } from "@/lib/nga";
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
        sourceType: "national_gallery",
        sourceId: { in: accessionNumbers },
      },
      select: { sourceId: true },
    });
    const importedSet = new Set(existing.map((w) => w.sourceId));

    // Load NGA index to look up IIIF URLs
    const index = await loadNgaData();
    const indexMap = new Map(index.map((e) => [e.objectId, e]));

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
        const entry = indexMap.get(item.objectId);
        if (!entry) {
          results.push({
            success: false,
            gpSku: "N/A",
            title: item.accessionNumber,
            artistName: "",
            error: "Object not found in NGA index",
          });
          errorCount++;
          continue;
        }

        // Fetch full-res image via IIIF
        const imageUrl = getNgaFullUrl(entry.iiifBaseUrl);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          results.push({
            success: false,
            gpSku: "N/A",
            title: entry.title,
            artistName: entry.artist,
            error: `Failed to fetch image: ${imgRes.status}`,
          });
          errorCount++;
          continue;
        }
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

        const row: CsvRow = {
          filename: `${entry.accessionNumber.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`,
          title: entry.title,
          artist_name: entry.artist || "Unknown Artist",
          work_type: "reductive",
          source_type: "national_gallery",
          source_id: entry.accessionNumber,
          source: "National Gallery of Art",
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
    console.error("NGA import error:", error);
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
