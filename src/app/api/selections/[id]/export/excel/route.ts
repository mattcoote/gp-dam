import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const selection = await prisma.selection.findUnique({
      where: { id },
      include: {
        items: {
          include: { work: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!selection) {
      return NextResponse.json(
        { error: "Selection not found" },
        { status: 404 }
      );
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "General Public DAM";
    workbook.created = new Date();

    const safeName = selection.name.replace(/[*?:\\/\[\]]/g, "-").substring(0, 31);
    const sheet = workbook.addWorksheet(safeName, {
      properties: {
        defaultColWidth: 20,
      },
    });

    // Header row styling
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111111" },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };

    // Define columns
    sheet.columns = [
      { header: "#", key: "position", width: 5 },
      { header: "GP SKU", key: "gpSku", width: 15 },
      { header: "Title", key: "title", width: 30 },
      { header: "Artist", key: "artist", width: 25 },
      { header: "Type", key: "workType", width: 18 },
      { header: "Dimensions", key: "dimensions", width: 15 },
      { header: "Orientation", key: "orientation", width: 12 },
      { header: "Exclusive To", key: "exclusive", width: 15 },
      { header: "Available Sizes", key: "availableSizes", width: 24 },
      { header: "Tags", key: "tags", width: 40 },
      { header: "Note", key: "note", width: 30 },
      { header: "Preview URL", key: "previewUrl", width: 50 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 30;

    // Add data rows
    for (const item of selection.items) {
      const work = item.work;
      const dims = work.dimensionsInches as {
        width: number;
        height: number;
      } | null;

      const row = sheet.addRow({
        position: item.position + 1,
        gpSku: work.gpSku || "",
        title: work.title,
        artist: work.artistName,
        workType: work.workType.replace(/_/g, " "),
        dimensions: dims ? `${dims.width}" × ${dims.height}"` : "",
        orientation: work.orientation || "",
        exclusive: work.retailerExclusive || "",
        availableSizes: (work.availableSizes as string[] || []).join(", "),
        tags: work.aiTagsHero.join(", "),
        note: item.notes || "",
        previewUrl: work.imageUrlPreview || "",
      });

      row.alignment = { vertical: "middle", wrapText: true };
      row.height = 25;

      // Alternate row colors
      if (item.position % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F8F8" },
          };
        });
      }

      // Style exclusive column with amber if present
      if (work.retailerExclusive) {
        const exclusiveCell = row.getCell("exclusive");
        exclusiveCell.font = { color: { argb: "FFB45309" }, bold: true };
      }
    }

    // Summary row
    sheet.addRow({});
    const summaryRow = sheet.addRow({
      position: "",
      gpSku: "",
      title: `${selection.name} — ${selection.items.length} works`,
      artist: "",
      workType: "",
      dimensions: "",
      orientation: "",
      exclusive: "",
      tags: "",
      note: selection.notes || "",
    });
    summaryRow.font = { italic: true, color: { argb: "FF999999" } };

    // Auto-filter
    sheet.autoFilter = {
      from: "A1",
      to: `L${selection.items.length + 1}`,
    };

    // Freeze header row
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `${selection.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.xlsx`;

    return new NextResponse(new Uint8Array(Buffer.from(buffer)), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}
