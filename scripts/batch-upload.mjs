#!/usr/bin/env node

/**
 * GP DAM — Batch Upload Script
 *
 * Reads a CSV + image folder, splits into batches, and uploads each batch
 * to the GP DAM server (Vercel or localhost) via the /api/upload endpoint.
 *
 * Usage:
 *   node scripts/batch-upload.mjs --csv path/to/import.csv --images path/to/images/ [options]
 *
 * Options:
 *   --csv <path>         Path to CSV file (required)
 *   --images <path>      Path to folder containing images (required)
 *   --url <url>          Server URL (default: https://gp-dam.vercel.app)
 *   --batch-size <n>     Images per batch (default: 15)
 *   --skip-ai            Skip AI tagging (faster import)
 *   --dry-run            Validate CSV + images without uploading
 *   --start-at <n>       Start at batch N (1-indexed, for resuming after failure)
 *   --admin-key <key>    Admin password if auth is enabled
 */

import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import JSZip from "jszip";

// ─── Parse CLI args ──────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    csv: { type: "string" },
    images: { type: "string" },
    url: { type: "string", default: "https://gp-dam.vercel.app" },
    "batch-size": { type: "string", default: "15" },
    "skip-ai": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "start-at": { type: "string", default: "1" },
    "admin-key": { type: "string", default: "" },
  },
});

const csvPath = args.csv;
const imagesDir = args.images;
const serverUrl = args.url.replace(/\/$/, "");
const batchSize = parseInt(args["batch-size"], 10);
const skipAi = args["skip-ai"];
const dryRun = args["dry-run"];
const startAt = parseInt(args["start-at"], 10);
const adminKey = args["admin-key"];

if (!csvPath || !imagesDir) {
  console.error(
    "\nUsage: node scripts/batch-upload.mjs --csv <path> --images <path> [--url <url>] [--batch-size <n>] [--skip-ai] [--dry-run] [--start-at <n>]\n"
  );
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

function logError(msg) {
  const ts = new Date().toLocaleTimeString();
  console.error(`[${ts}] ❌ ${msg}`);
}

function logSuccess(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ✅ ${msg}`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Parse CSV ───────────────────────────────────────────────────

log(`Reading CSV: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  logError(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

if (!fs.existsSync(imagesDir) || !fs.statSync(imagesDir).isDirectory()) {
  logError(`Images directory not found: ${imagesDir}`);
  process.exit(1);
}

const csvText = fs.readFileSync(csvPath, "utf-8");
const lines = csvText.split("\n").filter((l) => l.trim());
if (lines.length < 2) {
  logError("CSV has no data rows");
  process.exit(1);
}

const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
const rows = [];

for (let i = 1; i < lines.length; i++) {
  // Simple CSV parse — handles quoted fields with commas
  const values = [];
  let current = "";
  let inQuotes = false;
  for (const char of lines[i]) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const row = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx] || "";
  });
  rows.push(row);
}

log(`Parsed ${rows.length} rows from CSV`);

// ─── Match images to rows ────────────────────────────────────────

const imageFiles = fs.readdirSync(imagesDir).filter((f) => {
  return /\.(jpg|jpeg|png|webp|tiff?)$/i.test(f);
});

log(`Found ${imageFiles.length} images in ${imagesDir}`);

// Build lowercase lookup: lowercase filename → actual filename
const imageLookup = new Map();
for (const f of imageFiles) {
  imageLookup.set(f.toLowerCase(), f);
}

// Match each CSV row to an image
const matched = [];
const unmatched = [];

for (const row of rows) {
  const filename = (row.filename || "").trim();
  if (!filename) {
    unmatched.push({ row, reason: "no filename" });
    continue;
  }
  const actual = imageLookup.get(filename.toLowerCase());
  if (!actual) {
    unmatched.push({ row, reason: `image not found: ${filename}` });
    continue;
  }
  matched.push({ row, imageFile: actual, imagePath: path.join(imagesDir, actual) });
}

log(`Matched: ${matched.length} | Unmatched: ${unmatched.length}`);

if (unmatched.length > 0) {
  console.log("\n⚠️  Unmatched rows:");
  for (const { row, reason } of unmatched.slice(0, 10)) {
    console.log(`   - ${row.title || row.filename || "(no title)"}: ${reason}`);
  }
  if (unmatched.length > 10) {
    console.log(`   ... and ${unmatched.length - 10} more`);
  }
  console.log("");
}

if (matched.length === 0) {
  logError("No images matched to CSV rows. Check filenames.");
  process.exit(1);
}

// ─── Split into batches ──────────────────────────────────────────

const batches = [];
for (let i = 0; i < matched.length; i += batchSize) {
  batches.push(matched.slice(i, i + batchSize));
}

log(`Split into ${batches.length} batches of up to ${batchSize} images each`);

// ─── Summary ─────────────────────────────────────────────────────

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║             GP DAM Batch Upload                  ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log(`  Server:      ${serverUrl}`);
console.log(`  CSV:         ${csvPath}`);
console.log(`  Images:      ${imagesDir}`);
console.log(`  Total works: ${matched.length}`);
console.log(`  Batches:     ${batches.length} × ${batchSize}`);
console.log(`  AI tagging:  ${skipAi ? "SKIP" : "ENABLED"}`);
console.log(`  Start at:    batch ${startAt}`);
if (dryRun) console.log(`  MODE:        DRY RUN (no uploads)`);
console.log("");

if (dryRun) {
  log("Dry run complete — no uploads performed");
  process.exit(0);
}

// ─── Upload batches ──────────────────────────────────────────────

const totalStart = Date.now();
let totalSuccess = 0;
let totalErrors = 0;
const failedWorks = [];

for (let b = 0; b < batches.length; b++) {
  const batchNum = b + 1;

  if (batchNum < startAt) {
    log(`Skipping batch ${batchNum}/${batches.length} (start-at=${startAt})`);
    continue;
  }

  const batch = batches[b];
  const batchStart = Date.now();

  log(`\n━━━ Batch ${batchNum}/${batches.length} (${batch.length} images) ━━━`);

  // Build CSV for this batch
  const batchCsvHeader = headers.join(",");
  const batchCsvRows = batch.map(({ row }) => {
    return headers
      .map((h) => {
        const val = row[h] || "";
        // Quote values that contain commas or quotes
        if (val.includes(",") || val.includes('"')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",");
  });
  const batchCsvText = [batchCsvHeader, ...batchCsvRows].join("\n");

  // Build ZIP for this batch
  const zip = new JSZip();
  let zipSize = 0;
  for (const { imageFile, imagePath } of batch) {
    const imageData = fs.readFileSync(imagePath);
    zip.file(imageFile, imageData);
    zipSize += imageData.length;
  }

  log(`  ZIP size (uncompressed): ${formatBytes(zipSize)}`);
  log(`  Compressing...`);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 1 }, // Fast compression — images don't compress much
  });

  log(`  ZIP size (compressed): ${formatBytes(zipBuffer.length)}`);
  log(`  Uploading to ${serverUrl}/api/upload ...`);

  // Build FormData
  const formData = new FormData();
  formData.append(
    "csv",
    new Blob([batchCsvText], { type: "text/csv" }),
    "batch.csv"
  );
  formData.append(
    "images",
    new Blob([zipBuffer], { type: "application/zip" }),
    "images.zip"
  );
  if (skipAi) formData.append("skipAiTagging", "true");

  try {
    const uploadStart = Date.now();
    const res = await fetch(`${serverUrl}/api/upload`, {
      method: "POST",
      body: formData,
      headers: adminKey
        ? { "x-admin-key": adminKey }
        : {},
    });

    const uploadDuration = Date.now() - uploadStart;

    if (!res.ok) {
      const errorText = await res.text();
      logError(
        `Batch ${batchNum} upload failed (HTTP ${res.status}): ${errorText.substring(0, 200)}`
      );
      // Mark all in batch as failed
      for (const { row } of batch) {
        totalErrors++;
        failedWorks.push({
          title: row.title,
          filename: row.filename,
          error: `HTTP ${res.status}`,
          batch: batchNum,
        });
      }
      continue;
    }

    const data = await res.json();

    log(
      `  Upload: ${formatDuration(uploadDuration)} | Success: ${data.successCount} | Failed: ${data.errorCount}`
    );

    totalSuccess += data.successCount || 0;
    totalErrors += data.errorCount || 0;

    // Log individual failures
    if (data.results) {
      for (const r of data.results) {
        if (!r.success) {
          failedWorks.push({
            title: r.title,
            filename: r.title,
            error: r.error,
            failedStep: r.failedStep,
            batch: batchNum,
          });
          logError(`  "${r.title}": ${r.error} (step: ${r.failedStep})`);
        } else {
          // Log step durations for successful imports
          if (r.steps) {
            const stepSummary = r.steps
              .map((s) => `${s.step}: ${formatDuration(s.durationMs)}`)
              .join(" | ");
            log(`  ✓ "${r.title}" — ${stepSummary}`);
          }
        }
      }
    }

    const batchDuration = Date.now() - batchStart;
    logSuccess(
      `Batch ${batchNum} complete in ${formatDuration(batchDuration)}`
    );

    // Estimate remaining time
    const completedBatches = batchNum - startAt + 1;
    const remainingBatches = batches.length - batchNum;
    if (remainingBatches > 0) {
      const avgBatchTime = (Date.now() - totalStart) / completedBatches;
      const eta = avgBatchTime * remainingBatches;
      log(`  ETA: ~${formatDuration(eta)} remaining (${remainingBatches} batches left)`);
    }
  } catch (err) {
    logError(
      `Batch ${batchNum} network error: ${err.message}`
    );
    for (const { row } of batch) {
      totalErrors++;
      failedWorks.push({
        title: row.title,
        filename: row.filename,
        error: err.message,
        batch: batchNum,
      });
    }
    // Wait before retrying next batch
    log("  Waiting 5s before next batch...");
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// ─── Final summary ───────────────────────────────────────────────

const totalDuration = Date.now() - totalStart;

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║               Upload Complete                     ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log(`  Total time:  ${formatDuration(totalDuration)}`);
console.log(`  Succeeded:   ${totalSuccess}`);
console.log(`  Failed:      ${totalErrors}`);
console.log(`  Total:       ${totalSuccess + totalErrors} / ${matched.length}`);

if (failedWorks.length > 0) {
  console.log("\n  Failed works:");
  for (const fw of failedWorks) {
    console.log(
      `    - [Batch ${fw.batch}] "${fw.title}": ${fw.error}${fw.failedStep ? ` (${fw.failedStep})` : ""}`
    );
  }

  // Write failures to a file for easy retry
  const failurePath = csvPath.replace(/\.csv$/i, "_failures.json");
  fs.writeFileSync(failurePath, JSON.stringify(failedWorks, null, 2));
  console.log(`\n  Failures saved to: ${failurePath}`);
}

console.log("");
