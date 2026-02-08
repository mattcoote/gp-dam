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
}

export interface ImportResult {
  success: boolean;
  gpSku: string;
  title: string;
  artistName: string;
  error?: string;
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
  const workId = uuidv4();
  const gpSku = row.gp_sku?.trim() || (await generateGpSku());
  const dims = parseDimensions(row.dimensions);
  const orientation = determineOrientation(dims);

  try {
    // Generate image variants with sharp
    const sourceBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const previewBuffer = await sharp(imageBuffer)
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload to S3
    let imageUrlSource: string;
    let imageUrlThumbnail: string;
    let imageUrlPreview: string;

    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      [imageUrlSource, imageUrlThumbnail, imageUrlPreview] = await Promise.all([
        uploadToS3(getImageKey(workId, "source"), sourceBuffer, "image/jpeg"),
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
    } else {
      // No S3 configured — use placeholder URLs
      const encodedTitle = encodeURIComponent(row.title.trim());
      imageUrlSource = `https://placehold.co/1200x1600/f5f5f5/999?text=${encodedTitle}`;
      imageUrlThumbnail = `https://placehold.co/300x400/f5f5f5/999?text=${encodedTitle}`;
      imageUrlPreview = `https://placehold.co/1200x1600/f5f5f5/999?text=${encodedTitle}`;
    }

    // AI tagging (if OpenAI key is set and not skipped)
    let aiTagsHero: string[] = [];
    let aiTagsHidden: string[] = [];
    let embeddingVector: number[] | null = null;

    if (process.env.OPENAI_API_KEY && !options.skipAiTagging) {
      try {
        // Convert image to base64 data URL for GPT-4V
        const base64 = previewBuffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        const tags = await generateArtworkTags(dataUrl);
        aiTagsHero = tags.heroTags;
        aiTagsHidden = tags.hiddenTags;

        // Generate embedding from concatenated tags
        const tagText = [...aiTagsHero, ...aiTagsHidden].join(", ");
        embeddingVector = await generateEmbedding(tagText);
      } catch (aiError) {
        console.error(`AI tagging failed for ${row.title}:`, aiError);
        // Continue without AI tags — can be regenerated later
      }
    }

    // Extract dominant colors
    let dominantColors: { r: number; g: number; b: number }[] = [];
    try {
      const { dominant } = await sharp(imageBuffer).stats();
      dominantColors = [
        { r: dominant.r, g: dominant.g, b: dominant.b },
      ];
    } catch {
      // Color extraction is optional
    }

    // Insert into database
    if (embeddingVector) {
      // Use raw SQL for embedding vector insert (Prisma doesn't support vector type directly)
      await prisma.$executeRawUnsafe(
        `INSERT INTO works (
          id, gp_sku, title, artist_name, source_type, work_type,
          dimensions_inches, orientation, retailer_exclusive, artist_exclusive_to,
          image_url_thumbnail, image_url_preview, image_url_source,
          ai_tags_hero, ai_tags_hidden, dominant_colors, embedding,
          status, created_at, updated_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5::"SourceType", $6::"WorkType",
          $7::jsonb, $8::"Orientation", $9, $10,
          $11, $12, $13,
          $14::text[], $15::text[], $16::jsonb, $17::vector,
          'active'::"WorkStatus", NOW(), NOW()
        )`,
        workId,
        gpSku,
        row.title.trim(),
        row.artist_name.trim(),
        (row.source_type || "gp_original").trim().toLowerCase(),
        row.work_type.trim().toLowerCase(),
        dims ? JSON.stringify(dims) : null,
        orientation,
        row.retailer_exclusive?.trim() || null,
        row.artist_exclusive_to?.trim() || null,
        imageUrlThumbnail,
        imageUrlPreview,
        imageUrlSource,
        aiTagsHero,
        aiTagsHidden,
        JSON.stringify(dominantColors),
        `[${embeddingVector.join(",")}]`
      );
    } else {
      // No embedding — use Prisma directly
      await prisma.work.create({
        data: {
          id: workId,
          gpSku,
          title: row.title.trim(),
          artistName: row.artist_name.trim(),
          sourceType: (row.source_type || "gp_original")
            .trim()
            .toLowerCase() as "gp_original",
          workType: row.work_type.trim().toLowerCase() as "synograph",
          dimensionsInches: dims || undefined,
          orientation,
          retailerExclusive: row.retailer_exclusive?.trim() || null,
          artistExclusiveTo: row.artist_exclusive_to?.trim() || null,
          imageUrlThumbnail,
          imageUrlPreview,
          imageUrlSource,
          aiTagsHero,
          aiTagsHidden,
          dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
          status: "active",
        },
      });
    }

    return {
      success: true,
      gpSku,
      title: row.title.trim(),
      artistName: row.artist_name.trim(),
    };
  } catch (error) {
    console.error(`Failed to import "${row.title}":`, error);
    return {
      success: false,
      gpSku,
      title: row.title.trim(),
      artistName: row.artist_name.trim(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
