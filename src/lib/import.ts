import { prisma } from "./prisma";
import { generateGpSku } from "./sku";
import { uploadToS3, getImageKey } from "./s3";
import { generateArtworkTags, generateEmbedding } from "./openai";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export interface CsvRow {
  gp_sku?: string;
  filename: string;
  title: string;
  artist_name: string;
  work_type: string;
  dimensions?: string;
  retailer_exclusive?: string;
  artist_exclusive_to?: string;
  source_type?: string;
  source_id?: string;
  source?: string; // Human-readable source label: "General Public", "Visual Contrast", etc.
  max_print_width?: number; // Computed from source image pixels / 300 DPI
  max_print_height?: number;
  gp_exclusive?: string; // "yes"/"true"/"1" = GP exclusive
  available_sizes?: string; // Comma-separated: "8x10, 11x14, 24x36"
}

export interface ImportStepLog {
  step: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  detail?: string;
}

export interface ImportResult {
  success: boolean;
  gpSku: string;
  title: string;
  artistName: string;
  error?: string;
  failedStep?: string;
  steps?: ImportStepLog[];
  totalDurationMs?: number;
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
  "met",
  "yale",
  "national_gallery",
  "cleveland",
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

function parseAvailableSizes(sizesStr: string | undefined): string[] {
  if (!sizesStr) return [];
  return sizesStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function determineOrientation(dims: {
  width: number;
  height: number;
} | null): "portrait" | "landscape" | "square" {
  if (!dims) return "portrait";
  if (Math.abs(dims.width - dims.height) < 1) return "square";
  return dims.width > dims.height ? "landscape" : "portrait";
}

export function validateCsvRow(
  row: CsvRow,
  index: number
): string | null {
  if (!row.filename?.trim()) return `Row ${index + 1}: filename is required`;
  if (!row.title?.trim()) return `Row ${index + 1}: title is required`;
  if (!row.artist_name?.trim())
    return `Row ${index + 1}: artist_name is required`;
  if (!row.work_type?.trim()) return `Row ${index + 1}: work_type is required`;
  if (!VALID_WORK_TYPES.includes(row.work_type.trim().toLowerCase())) {
    return `Row ${index + 1}: invalid work_type "${row.work_type}". Must be one of: ${VALID_WORK_TYPES.join(", ")}`;
  }
  if (
    row.source_type &&
    !VALID_SOURCE_TYPES.includes(row.source_type.trim().toLowerCase())
  ) {
    return `Row ${index + 1}: invalid source_type "${row.source_type}". Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`;
  }
  return null;
}

export async function processWorkImport(
  row: CsvRow,
  imageBuffer: Buffer,
  options: { skipAiTagging?: boolean } = {}
): Promise<ImportResult> {
  const importStart = Date.now();
  const steps: ImportStepLog[] = [];
  const workId = uuidv4();
  const sourceType = (row.source_type || "gp_original").trim().toLowerCase();
  const isPublicDomain = sourceType !== "gp_original";
  const gpSku = row.gp_sku?.trim() || null;
  const dims = parseDimensions(row.dimensions);
  const orientation = determineOrientation(dims);
  const gpExclusive = ["yes", "true", "1"].includes(
    (row.gp_exclusive || "").trim().toLowerCase()
  );
  const availableSizes = parseAvailableSizes(row.available_sizes);

  let maxPrintInches: { width: number; height: number } | null = null;
  if (row.max_print_width && row.max_print_height) {
    maxPrintInches = {
      width: Math.round(row.max_print_width * 10) / 10,
      height: Math.round(row.max_print_height * 10) / 10,
    };
  }

  try {
    // Step 1: Image processing (sharp resize + max print calc)
    let stepStart = Date.now();
    let sourceBuffer: Buffer;
    let thumbnailBuffer: Buffer;
    let previewBuffer: Buffer;
    try {
      if (!maxPrintInches) {
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.width && metadata.height) {
          maxPrintInches = {
            width: Math.round((metadata.width / 300) * 10) / 10,
            height: Math.round((metadata.height / 300) * 10) / 10,
          };
        }
      }
      sourceBuffer = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
      thumbnailBuffer = await sharp(imageBuffer)
        .resize(600, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      previewBuffer = await sharp(imageBuffer)
        .resize(1200, null, { withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      steps.push({
        step: "Image processing",
        status: "success",
        durationMs: Date.now() - stepStart,
        detail: maxPrintInches
          ? `${maxPrintInches.width}" × ${maxPrintInches.height}" max print`
          : undefined,
      });
    } catch (err) {
      steps.push({
        step: "Image processing",
        status: "failed",
        durationMs: Date.now() - stepStart,
        detail: err instanceof Error ? err.message : "Unknown error",
      });
      return {
        success: false,
        gpSku: gpSku || "N/A",
        title: row.title.trim(),
        artistName: row.artist_name.trim(),
        error: `Image processing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        failedStep: "Image processing",
        steps,
        totalDurationMs: Date.now() - importStart,
      };
    }

    // Step 2: S3 upload
    stepStart = Date.now();
    let imageUrlSource: string;
    let imageUrlThumbnail: string;
    let imageUrlPreview: string;
    try {
      if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
        [imageUrlSource, imageUrlThumbnail, imageUrlPreview] =
          await Promise.all([
            uploadToS3(
              getImageKey(workId, "source"),
              sourceBuffer,
              "image/jpeg"
            ),
            uploadToS3(
              getImageKey(workId, "thumbnail"),
              thumbnailBuffer,
              "image/jpeg"
            ),
            uploadToS3(
              getImageKey(workId, "preview"),
              previewBuffer,
              "image/jpeg"
            ),
          ]);
        steps.push({
          step: "S3 upload",
          status: "success",
          durationMs: Date.now() - stepStart,
          detail: "3 variants uploaded",
        });
      } else {
        const encodedTitle = encodeURIComponent(row.title.trim());
        imageUrlSource = `https://placehold.co/1200x1600/f5f5f5/999?text=${encodedTitle}`;
        imageUrlThumbnail = `https://placehold.co/300x400/f5f5f5/999?text=${encodedTitle}`;
        imageUrlPreview = `https://placehold.co/1200x1600/f5f5f5/999?text=${encodedTitle}`;
        steps.push({
          step: "S3 upload",
          status: "skipped",
          durationMs: Date.now() - stepStart,
          detail: "No S3 configured — using placeholders",
        });
      }
    } catch (err) {
      steps.push({
        step: "S3 upload",
        status: "failed",
        durationMs: Date.now() - stepStart,
        detail: err instanceof Error ? err.message : "Unknown error",
      });
      return {
        success: false,
        gpSku: gpSku || "N/A",
        title: row.title.trim(),
        artistName: row.artist_name.trim(),
        error: `S3 upload failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        failedStep: "S3 upload",
        steps,
        totalDurationMs: Date.now() - importStart,
      };
    }

    // Step 3: AI tagging + embedding
    stepStart = Date.now();
    let aiTagsHero: string[] = [];
    let aiTagsHidden: string[] = [];
    let embeddingVector: number[] | null = null;

    if (process.env.OPENAI_API_KEY && !options.skipAiTagging) {
      try {
        const base64 = previewBuffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        const tags = await generateArtworkTags(dataUrl);
        aiTagsHero = tags.heroTags;
        aiTagsHidden = tags.hiddenTags;

        // Auto-detect work type from AI medium detection (only override if default "reductive")
        if (tags.medium && row.work_type.trim().toLowerCase() === "reductive") {
          const mediumToWorkType: Record<string, string> = {
            photograph: "photography",
            drawing: "work_on_paper",
            print: "work_on_paper",
            painting: "work_on_canvas",
          };
          if (mediumToWorkType[tags.medium]) {
            row.work_type = mediumToWorkType[tags.medium];
          }
        }

        const tagText = [...aiTagsHero, ...aiTagsHidden].join(", ");
        embeddingVector = await generateEmbedding(tagText);
        steps.push({
          step: "AI tagging",
          status: "success",
          durationMs: Date.now() - stepStart,
          detail: `${aiTagsHero.length} hero + ${aiTagsHidden.length} hidden tags${tags.medium ? `, medium: ${tags.medium}` : ""}`,
        });
      } catch (aiError) {
        console.error(`AI tagging failed for ${row.title}:`, aiError);
        steps.push({
          step: "AI tagging",
          status: "failed",
          durationMs: Date.now() - stepStart,
          detail: `Non-fatal: ${aiError instanceof Error ? aiError.message : "Unknown error"}`,
        });
        // Continue without AI tags
      }
    } else {
      steps.push({
        step: "AI tagging",
        status: "skipped",
        durationMs: Date.now() - stepStart,
        detail: options.skipAiTagging ? "Skipped by user" : "No API key",
      });
    }

    // Step 4: Color extraction
    stepStart = Date.now();
    let dominantColors: { r: number; g: number; b: number }[] = [];
    try {
      const { dominant } = await sharp(imageBuffer).stats();
      dominantColors = [{ r: dominant.r, g: dominant.g, b: dominant.b }];
      steps.push({
        step: "Color extraction",
        status: "success",
        durationMs: Date.now() - stepStart,
      });
    } catch {
      steps.push({
        step: "Color extraction",
        status: "skipped",
        durationMs: Date.now() - stepStart,
        detail: "Could not extract colors",
      });
    }

    // Step 5: Database insert
    stepStart = Date.now();
    try {
      if (embeddingVector) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO works (
            id, gp_sku, title, artist_name, source_type, source_id, source_label,
            dimensions_inches, max_print_inches, orientation, work_type,
            retailer_exclusive, artist_exclusive_to, gp_exclusive,
            image_url_thumbnail, image_url_preview, image_url_source,
            ai_tags_hero, ai_tags_hidden, dominant_colors, embedding,
            available_sizes, status, created_at, updated_at
          ) VALUES (
            $1::uuid, $2, $3, $4, $5::"SourceType", $6, $7,
            $8::jsonb, $9::jsonb, $10::"Orientation", $11::"WorkType",
            $12, $13, $14,
            $15, $16, $17,
            $18::text[], $19::text[], $20::jsonb, $21::vector,
            $22::text[], 'active'::"WorkStatus", NOW(), NOW()
          )`,
          workId,
          gpSku || null,
          row.title.trim(),
          row.artist_name.trim(),
          sourceType,
          row.source_id?.trim() || null,
          row.source?.trim() || null,
          dims ? JSON.stringify(dims) : null,
          maxPrintInches ? JSON.stringify(maxPrintInches) : null,
          orientation,
          row.work_type.trim().toLowerCase(),
          row.retailer_exclusive?.trim() || null,
          row.artist_exclusive_to?.trim() || null,
          gpExclusive,
          imageUrlThumbnail,
          imageUrlPreview,
          imageUrlSource,
          aiTagsHero,
          aiTagsHidden,
          JSON.stringify(dominantColors),
          `[${embeddingVector.join(",")}]`,
          availableSizes
        );
      } else {
        await prisma.work.create({
          data: {
            id: workId,
            gpSku: gpSku || undefined,
            title: row.title.trim(),
            artistName: row.artist_name.trim(),
            sourceType: sourceType as "gp_original",
            sourceId: row.source_id?.trim() || null,
            sourceLabel: row.source?.trim() || null,
            workType: row.work_type.trim().toLowerCase() as "synograph",
            dimensionsInches: dims || undefined,
            maxPrintInches: maxPrintInches || undefined,
            orientation,
            retailerExclusive: row.retailer_exclusive?.trim() || null,
            artistExclusiveTo: row.artist_exclusive_to?.trim() || null,
            gpExclusive,
            availableSizes,
            imageUrlThumbnail,
            imageUrlPreview,
            imageUrlSource,
            aiTagsHero,
            aiTagsHidden,
            dominantColors:
              dominantColors.length > 0 ? dominantColors : undefined,
            status: "active",
          },
        });
      }
      steps.push({
        step: "Database insert",
        status: "success",
        durationMs: Date.now() - stepStart,
      });
    } catch (err) {
      steps.push({
        step: "Database insert",
        status: "failed",
        durationMs: Date.now() - stepStart,
        detail: err instanceof Error ? err.message : "Unknown error",
      });
      return {
        success: false,
        gpSku: gpSku || "N/A",
        title: row.title.trim(),
        artistName: row.artist_name.trim(),
        error: `Database insert failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        failedStep: "Database insert",
        steps,
        totalDurationMs: Date.now() - importStart,
      };
    }

    return {
      success: true,
      gpSku: gpSku || "—",
      title: row.title.trim(),
      artistName: row.artist_name.trim(),
      steps,
      totalDurationMs: Date.now() - importStart,
    };
  } catch (error) {
    console.error(`Failed to import "${row.title}":`, error);
    return {
      success: false,
      gpSku: gpSku || "N/A",
      title: row.title.trim(),
      artistName: row.artist_name.trim(),
      error: error instanceof Error ? error.message : "Unknown error",
      failedStep: "Unknown",
      steps,
      totalDurationMs: Date.now() - importStart,
    };
  }
}
