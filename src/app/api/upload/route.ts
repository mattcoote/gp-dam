import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import {
  CsvRow,
  ImportResult,
  validateCsvRow,
  processWorkImport,
} from "@/lib/import";
import JSZip from "jszip";

export const maxDuration = 300; // 5 min timeout for large imports
export const dynamic = "force-dynamic";

function filenameToTitle(filename: string): string {
  // Strip extension, replace hyphens/underscores with spaces, title case
  const name = filename.replace(/\.[^.]+$/, "");
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get("csv") as File | null;
    const zipFile = formData.get("images") as File | null;
    const skipAiTagging = formData.get("skipAiTagging") === "true";

    if (!csvFile && !zipFile) {
      return NextResponse.json(
        { error: "Either a CSV file or an images ZIP is required" },
        { status: 400 }
      );
    }

    // Extract images from ZIP if provided
    const imageMap = new Map<string, Buffer>();
    // Keep original casing for title derivation
    const originalFilenames = new Map<string, string>();
    if (zipFile) {
      const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
      const zip = await JSZip.loadAsync(zipBuffer);

      for (const [path, file] of Object.entries(zip.files)) {
        if (file.dir) continue;
        const originalName = path.split("/").pop()!;
        const lowerName = originalName.toLowerCase();
        if (/\.(jpg|jpeg|png|webp|tiff?)$/i.test(lowerName)) {
          const buffer = Buffer.from(await file.async("arraybuffer"));
          imageMap.set(lowerName, buffer);
          originalFilenames.set(lowerName, originalName);
        }
      }
    }

    let rows: CsvRow[];

    if (csvFile) {
      // CSV provided — use existing CSV-driven flow
      const csvText = await csvFile.text();
      const parsed = Papa.parse<CsvRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) =>
          header.trim().toLowerCase().replace(/\s+/g, "_"),
      });

      if (parsed.errors.length > 0) {
        return NextResponse.json(
          {
            error: "CSV parsing errors",
            details: parsed.errors.map((e) => `Row ${e.row}: ${e.message}`),
          },
          { status: 400 }
        );
      }

      rows = parsed.data;
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "CSV file is empty" },
          { status: 400 }
        );
      }

      // Validate all rows first
      const validationErrors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const error = validateCsvRow(rows[i], i);
        if (error) validationErrors.push(error);
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: "Validation failed", details: validationErrors },
          { status: 400 }
        );
      }
    } else {
      // Images-only mode — generate rows from filenames
      if (imageMap.size === 0) {
        return NextResponse.json(
          { error: "No image files found in ZIP" },
          { status: 400 }
        );
      }

      rows = [];
      for (const [lowerName, originalName] of originalFilenames.entries()) {
        rows.push({
          filename: lowerName,
          title: filenameToTitle(originalName),
          artist_name: "Unknown Artist",
          work_type: "synograph",
        });
      }
    }

    // Process each work
    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const filename = row.filename.trim().toLowerCase();
      const imageBuffer = imageMap.get(filename);

      if (!imageBuffer) {
        results.push({
          success: false,
          gpSku: row.gp_sku || "N/A",
          title: row.title,
          artistName: row.artist_name,
          error: `Image file "${row.filename}" not found in ZIP`,
          failedStep: "File matching",
          steps: [{ step: "File matching", status: "failed", durationMs: 0, detail: `"${row.filename}" not found in ZIP` }],
          totalDurationMs: 0,
        });
        errorCount++;
        continue;
      }

      const result = await processWorkImport(row, imageBuffer, {
        skipAiTagging,
      });
      results.push(result);
      if (result.success) successCount++;
      else errorCount++;
    }

    return NextResponse.json({
      message: `Import complete: ${successCount} succeeded, ${errorCount} failed`,
      total: rows.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
