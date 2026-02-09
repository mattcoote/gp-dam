import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "..", "GP_DAM_Import_Template.xlsx");

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GP DAM";
  workbook.created = new Date();

  // ─── Main Import Sheet ──────────────────────────────────────
  const ws = workbook.addWorksheet("Import Template", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  // Column definitions
  const columns = [
    { header: "filename", key: "filename", width: 28, required: true, note: "Must match image filename in ZIP (e.g. coastal-dawn.jpg)" },
    { header: "title", key: "title", width: 30, required: true, note: "Artwork title" },
    { header: "artist_name", key: "artist_name", width: 24, required: true, note: "Artist display name" },
    { header: "work_type", key: "work_type", width: 18, required: true, note: "synograph, work_on_paper, work_on_canvas, photography, reductive" },
    { header: "gp_exclusive", key: "gp_exclusive", width: 14, required: false, note: "yes or no" },
    { header: "gp_sku", key: "gp_sku", width: 14, required: false, note: "Auto-generated if blank (GP originals only)" },
    { header: "dimensions", key: "dimensions", width: 16, required: false, note: "WxH or WxHxD in inches (e.g. 24x36 or 24x36x1.5)" },
    { header: "retailer_exclusive", key: "retailer_exclusive", width: 20, required: false, note: "RH, CB2, Rejuvenation, Anthropologie, etc." },
    { header: "artist_exclusive_to", key: "artist_exclusive_to", width: 20, required: false, note: "Retailer this artist is exclusive to" },
    { header: "source_type", key: "source_type", width: 18, required: false, note: "gp_original (default), rijksmuseum, getty, met, yale, national_gallery, cleveland" },
    { header: "source", key: "source", width: 22, required: false, note: "Human-readable label: General Public, Visual Contrast, etc." },
    { header: "max_print_width", key: "max_print_width", width: 16, required: false, note: "Max print width in inches (auto-computed from image if blank)" },
    { header: "max_print_height", key: "max_print_height", width: 16, required: false, note: "Max print height in inches (auto-computed from image if blank)" },
  ];

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // ─── Styles ──────────────────────────────────────────────────

  // Header row (row 1) — dark background, white bold text
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? "FF1A1A1A" : "FF555555" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF999999" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  });

  // Description row (row 2) — light gray, italic notes
  const descRow = ws.addRow(columns.map((c) => c.note));
  descRow.height = 40;
  descRow.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    cell.font = { italic: true, color: { argb: "FF777777" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF5F5F5" },
    };
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF1A1A1A" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  });

  // ─── Example Rows ───────────────────────────────────────────

  const examples = [
    {
      filename: "coastal-dawn.jpg",
      title: "Coastal Dawn",
      artist_name: "Sarah Chen",
      work_type: "synograph",
      gp_exclusive: "yes",
      gp_sku: "",
      dimensions: "24x36",
      retailer_exclusive: "",
      artist_exclusive_to: "",
      source_type: "gp_original",
      source: "General Public",
      max_print_width: "",
      max_print_height: "",
    },
    {
      filename: "urban-geometry-ii.jpg",
      title: "Urban Geometry II",
      artist_name: "Marcus Rivera",
      work_type: "photography",
      gp_exclusive: "no",
      gp_sku: "",
      dimensions: "30x40",
      retailer_exclusive: "RH",
      artist_exclusive_to: "",
      source_type: "gp_original",
      source: "Visual Contrast",
      max_print_width: "",
      max_print_height: "",
    },
    {
      filename: "botanical-study-no5.jpg",
      title: "Botanical Study No. 5",
      artist_name: "Emma Whitfield",
      work_type: "work_on_paper",
      gp_exclusive: "yes",
      gp_sku: "",
      dimensions: "18x24",
      retailer_exclusive: "",
      artist_exclusive_to: "",
      source_type: "gp_original",
      source: "General Public",
      max_print_width: "",
      max_print_height: "",
    },
  ];

  examples.forEach((ex) => {
    const row = ws.addRow(Object.values(ex));
    row.eachCell((cell) => {
      cell.font = { color: { argb: "FF999999" }, size: 10 };
      cell.alignment = { vertical: "middle" };
    });
  });

  // ─── Data Validation (dropdowns) ─────────────────────────────

  // work_type dropdown (column 4, rows 3-1000)
  for (let r = 3; r <= 1000; r++) {
    ws.getCell(r, 4).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"synograph,work_on_paper,work_on_canvas,photography,reductive"'],
      showErrorMessage: true,
      errorTitle: "Invalid Work Type",
      error: "Must be one of: synograph, work_on_paper, work_on_canvas, photography, reductive",
    };
  }

  // gp_exclusive dropdown (column 5, rows 3-1000)
  for (let r = 3; r <= 1000; r++) {
    ws.getCell(r, 5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"yes,no"'],
      showErrorMessage: true,
      errorTitle: "Invalid Value",
      error: "Must be yes or no",
    };
  }

  // source_type dropdown (column 10, rows 3-1000)
  for (let r = 3; r <= 1000; r++) {
    ws.getCell(r, 10).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"gp_original,rijksmuseum,getty,met,yale,national_gallery,cleveland"'],
      showErrorMessage: true,
      errorTitle: "Invalid Source Type",
      error: "Must be one of: gp_original, rijksmuseum, getty, met, yale, national_gallery, cleveland",
    };
  }

  // ─── Instructions Sheet ──────────────────────────────────────

  const instrWs = workbook.addWorksheet("Instructions");
  instrWs.columns = [
    { header: "", key: "label", width: 22 },
    { header: "", key: "value", width: 80 },
  ];

  const instructions = [
    ["GP DAM — CSV Import Template", ""],
    ["", ""],
    ["HOW TO USE", ""],
    ["1.", "Fill in the Import Template sheet with your artwork data"],
    ["2.", "Save as CSV (File > Save As > CSV UTF-8)"],
    ["3.", "Create a ZIP file containing all the image files referenced in the filename column"],
    ["4.", "Go to Admin > Bulk Import and upload the CSV + ZIP together"],
    ["", ""],
    ["REQUIRED COLUMNS", ""],
    ["filename", "Must exactly match the image filename inside the ZIP (e.g. coastal-dawn.jpg)"],
    ["title", "The artwork title as it should appear in the catalog"],
    ["artist_name", "Artist display name"],
    ["work_type", "One of: synograph, work_on_paper, work_on_canvas, photography, reductive"],
    ["", ""],
    ["OPTIONAL COLUMNS", ""],
    ["gp_exclusive", "yes/no — Whether this is a GP exclusive work (shown in GP Exclusive filter on catalog)"],
    ["gp_sku", "Leave blank for auto-generation (format: GP20260001). Skipped for public domain imports."],
    ["dimensions", "Physical dimensions in inches: WxH or WxHxD (e.g. 24x36 or 24x36x1.5)"],
    ["retailer_exclusive", "Retailer name if exclusive (e.g. RH, CB2, Rejuvenation, Anthropologie)"],
    ["artist_exclusive_to", "Retailer name if the artist is exclusive to them"],
    ["source_type", "Defaults to gp_original. Options: gp_original, rijksmuseum, getty, met, yale, national_gallery, cleveland"],
    ["source", "Human-readable source label (e.g. General Public, Visual Contrast)"],
    ["max_print_width", "Max printable width in inches. Auto-computed from image at 300 DPI if left blank."],
    ["max_print_height", "Max printable height in inches. Auto-computed from image at 300 DPI if left blank."],
    ["", ""],
    ["NOTES", ""],
    ["", "If you upload images WITHOUT a CSV, titles are derived from filenames (e.g. sunset-over-hills.jpg becomes Sunset Over Hills)"],
    ["", "The example rows (gray text) in the template should be deleted or overwritten before importing"],
    ["", "GP SKU is auto-generated for gp_original works only; public domain imports skip SKU generation"],
    ["", "AI tags and search embeddings are generated automatically during import"],
    ["", "Max print size is computed from the actual image pixels at 300 DPI if not provided in the CSV"],
  ];

  instructions.forEach(([label, value], i) => {
    const row = instrWs.addRow({ label, value });
    if (i === 0) {
      row.getCell(1).font = { bold: true, size: 14 };
      row.height = 24;
    } else if (["HOW TO USE", "REQUIRED COLUMNS", "OPTIONAL COLUMNS", "NOTES"].includes(label)) {
      row.getCell(1).font = { bold: true, size: 11, color: { argb: "FF1A1A1A" } };
      row.height = 22;
    } else if (label && !label.match(/^\d/)) {
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(2).font = { size: 10 };
    } else {
      row.getCell(1).font = { size: 10, color: { argb: "FF555555" } };
      row.getCell(2).font = { size: 10 };
    }
  });

  // ─── Save ───────────────────────────────────────────────────

  await workbook.xlsx.writeFile(outputPath);
  console.log(`Template saved to: ${outputPath}`);
}

generateTemplate().catch(console.error);
