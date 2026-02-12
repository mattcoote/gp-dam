import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface MetadataRow {
  gp_sku?: string;
  filename?: string;
  title?: string;
  artist_name?: string;
  work_type?: string;
  dimensions?: string;
  retailer_exclusive?: string;
  retailer_url?: string;
  artist_exclusive_to?: string;
  source_type?: string;
  gp_exclusive?: string;
}

const VALID_WORK_TYPES = [
  "synograph",
  "work_on_paper",
  "work_on_canvas",
  "photography",
  "reductive",
];

const VALID_SOURCE_TYPES = [
  "gp_original",
  "rijksmuseum",
  "getty",
  "national_gallery",
];

function parseDimensions(
  dimStr: string | undefined
): { width: number; height: number; depth?: number } | null {
  if (!dimStr) return null;
  const parts = dimStr
    .toLowerCase()
    .replace(/["\s]/g, "")
    .split("x")
    .map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return null;
  return {
    width: parts[0],
    height: parts[1],
    ...(parts[2] ? { depth: parts[2] } : {}),
  };
}

function determineOrientation(dims: {
  width: number;
  height: number;
} | null): "portrait" | "landscape" | "square" {
  if (!dims) return "portrait";
  if (Math.abs(dims.width - dims.height) < 1) return "square";
  return dims.width > dims.height ? "landscape" : "portrait";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get("csv") as File | null;

    if (!csvFile) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    const csvText = await csvFile.text();
    const parsed = Papa.parse<MetadataRow>(csvText, {
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

    const rows = parsed.data;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Each row must have at least gp_sku or filename to match
    const validationErrors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.gp_sku?.trim() && !row.filename?.trim()) {
        validationErrors.push(
          `Row ${i + 1}: either gp_sku or filename is required to match an existing work`
        );
      }
      if (
        row.work_type?.trim() &&
        !VALID_WORK_TYPES.includes(row.work_type.trim().toLowerCase())
      ) {
        validationErrors.push(
          `Row ${i + 1}: invalid work_type "${row.work_type}"`
        );
      }
      if (
        row.source_type?.trim() &&
        !VALID_SOURCE_TYPES.includes(row.source_type.trim().toLowerCase())
      ) {
        validationErrors.push(
          `Row ${i + 1}: invalid source_type "${row.source_type}"`
        );
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Load all works for filename matching
    const allWorks = await prisma.work.findMany({
      select: {
        id: true,
        gpSku: true,
        title: true,
        artistName: true,
        imageUrlSource: true,
      },
    });

    const results: {
      success: boolean;
      row: number;
      matchedBy: string;
      gpSku: string | null;
      title: string;
      error?: string;
      fieldsUpdated: string[];
    }[] = [];

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let matchedWork: (typeof allWorks)[0] | undefined;
      let matchedBy = "";

      // Try matching by GP SKU first
      if (row.gp_sku?.trim()) {
        matchedWork = allWorks.find(
          (w) =>
            w.gpSku?.toLowerCase() === row.gp_sku!.trim().toLowerCase()
        );
        if (matchedWork) matchedBy = "gp_sku";
      }

      // Fallback to filename matching (match against S3 URL or title)
      if (!matchedWork && row.filename?.trim()) {
        const targetName = row.filename
          .trim()
          .toLowerCase()
          .replace(/\.[^.]+$/, "");

        matchedWork = allWorks.find((w) => {
          // Check if the S3 source URL contains the filename
          if (w.imageUrlSource) {
            const urlLower = w.imageUrlSource.toLowerCase();
            if (urlLower.includes(targetName)) return true;
          }
          // Also match against title (for images-only imports that derived title from filename)
          const titleNorm = w.title
            .toLowerCase()
            .replace(/[-_]+/g, " ")
            .trim();
          const fileNorm = targetName.replace(/[-_]+/g, " ").trim();
          return titleNorm === fileNorm;
        });
        if (matchedWork) matchedBy = "filename";
      }

      if (!matchedWork) {
        results.push({
          success: false,
          row: i + 1,
          matchedBy: "",
          gpSku: row.gp_sku?.trim() || null,
          title: row.title?.trim() || row.filename?.trim() || "Unknown",
          error: `No matching work found for ${row.gp_sku ? `SKU "${row.gp_sku}"` : ""}${row.gp_sku && row.filename ? " or " : ""}${row.filename ? `filename "${row.filename}"` : ""}`,
          fieldsUpdated: [],
        });
        notFoundCount++;
        continue;
      }

      // Build update data from non-empty CSV fields
      const updateData: Record<string, unknown> = {};
      const fieldsUpdated: string[] = [];

      if (row.title?.trim()) {
        updateData.title = row.title.trim();
        fieldsUpdated.push("title");
      }
      if (row.artist_name?.trim()) {
        updateData.artistName = row.artist_name.trim();
        fieldsUpdated.push("artist_name");
      }
      if (row.work_type?.trim()) {
        updateData.workType = row.work_type.trim().toLowerCase();
        fieldsUpdated.push("work_type");
      }
      if (row.source_type?.trim()) {
        updateData.sourceType = row.source_type.trim().toLowerCase();
        fieldsUpdated.push("source_type");
      }
      if (row.retailer_exclusive !== undefined && row.retailer_exclusive !== "") {
        updateData.retailerExclusive = row.retailer_exclusive.trim() || null;
        fieldsUpdated.push("retailer_exclusive");
      }
      if (row.retailer_url !== undefined && row.retailer_url !== "") {
        updateData.retailerUrl = row.retailer_url.trim() || null;
        fieldsUpdated.push("retailer_url");
      }
      if (row.artist_exclusive_to !== undefined && row.artist_exclusive_to !== "") {
        updateData.artistExclusiveTo = row.artist_exclusive_to.trim() || null;
        fieldsUpdated.push("artist_exclusive_to");
      }
      if (row.gp_exclusive !== undefined && row.gp_exclusive !== "") {
        updateData.gpExclusive = ["yes", "true", "1"].includes(
          row.gp_exclusive.trim().toLowerCase()
        );
        fieldsUpdated.push("gp_exclusive");
      }
      if (row.dimensions?.trim()) {
        const dims = parseDimensions(row.dimensions);
        if (dims) {
          updateData.dimensionsInches = dims;
          updateData.orientation = determineOrientation(dims);
          fieldsUpdated.push("dimensions");
        }
      }
      if (row.gp_sku?.trim() && !matchedWork.gpSku) {
        updateData.gpSku = row.gp_sku.trim();
        fieldsUpdated.push("gp_sku");
      }

      if (fieldsUpdated.length === 0) {
        results.push({
          success: true,
          row: i + 1,
          matchedBy,
          gpSku: matchedWork.gpSku,
          title: matchedWork.title,
          error: "No fields to update",
          fieldsUpdated: [],
        });
        continue;
      }

      try {
        await prisma.work.update({
          where: { id: matchedWork.id },
          data: updateData,
        });

        results.push({
          success: true,
          row: i + 1,
          matchedBy,
          gpSku: matchedWork.gpSku,
          title: (row.title?.trim() || matchedWork.title),
          fieldsUpdated,
        });
        updatedCount++;
      } catch (err) {
        results.push({
          success: false,
          row: i + 1,
          matchedBy,
          gpSku: matchedWork.gpSku,
          title: matchedWork.title,
          error: err instanceof Error ? err.message : "Update failed",
          fieldsUpdated: [],
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: `Metadata update complete: ${updatedCount} updated, ${notFoundCount} not found, ${errorCount} errors`,
      total: rows.length,
      updatedCount,
      notFoundCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Metadata update error:", error);
    return NextResponse.json(
      {
        error: "Metadata update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
