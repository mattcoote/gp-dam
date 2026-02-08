import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

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

    // Build PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: selection.name,
        Author: "General Public",
        Creator: "GP DAM",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Helper to fetch image as buffer
    async function fetchImageBuffer(url: string): Promise<Buffer | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      } catch {
        return null;
      }
    }

    // Title page
    doc.fontSize(10).fillColor("#999").text("GENERAL PUBLIC", { align: "center" });
    doc.moveDown(4);
    doc.fontSize(28).fillColor("#111").text(selection.name, { align: "center" });
    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor("#666")
      .text(
        `${selection.items.length} work${selection.items.length !== 1 ? "s" : ""}`,
        { align: "center" }
      );

    if (selection.notes) {
      doc.moveDown(2);
      doc
        .fontSize(11)
        .fillColor("#888")
        .text(selection.notes, { align: "center", width: 400 });
    }

    doc.moveDown(3);
    doc
      .fontSize(9)
      .fillColor("#bbb")
      .text(
        `Generated ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" }
      );

    // Each work on its own page
    for (const item of selection.items) {
      const work = item.work;
      doc.addPage();

      // Try to load image
      const imageUrl = work.imageUrlPreview || work.imageUrlThumbnail;
      if (imageUrl && !imageUrl.includes("placehold.co")) {
        const imgBuffer = await fetchImageBuffer(imageUrl);
        if (imgBuffer) {
          try {
            doc.image(imgBuffer, 50, 50, {
              fit: [495, 400],
              align: "center",
              valign: "center",
            });
            doc.moveDown(2);
          } catch {
            // Image failed, skip
          }
        }
      }

      // Work details
      const detailsY = imageUrl && !imageUrl.includes("placehold.co") ? 470 : 50;
      doc.y = detailsY;

      doc.fontSize(18).fillColor("#111").text(work.title);
      doc.fontSize(12).fillColor("#666").text(work.artistName);
      doc.moveDown(1);

      // Metadata table
      const meta: [string, string][] = [];
      if (work.gpSku) meta.push(["SKU", work.gpSku]);
      meta.push(["Type", work.workType.replace(/_/g, " ")]);

      const dims = work.dimensionsInches as {
        width: number;
        height: number;
      } | null;
      if (dims) {
        meta.push(["Dimensions", `${dims.width}" × ${dims.height}"`]);
      }
      if (work.retailerExclusive) {
        meta.push(["Exclusive", `${work.retailerExclusive}`]);
      }

      doc.fontSize(10);
      for (const [label, value] of meta) {
        doc.fillColor("#999").text(label, { continued: true });
        doc.fillColor("#333").text(`    ${value}`);
      }

      // Tags
      if (work.aiTagsHero.length > 0) {
        doc.moveDown(1);
        doc.fontSize(9).fillColor("#999").text("Tags");
        doc
          .fontSize(9)
          .fillColor("#666")
          .text(work.aiTagsHero.join("  •  "), { width: 400 });
      }

      // Item notes
      if (item.notes) {
        doc.moveDown(1);
        doc.fontSize(9).fillColor("#999").text("Note");
        doc.fontSize(10).fillColor("#444").text(item.notes, { width: 400 });
      }
    }

    // Footer on last page
    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor("#ccc")
      .text("General Public • Art Print Company", { align: "center" });

    doc.end();

    // Wait for the PDF to be fully generated
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    const filename = `${selection.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
