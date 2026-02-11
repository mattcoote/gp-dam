import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequire } from "node:module";
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

    // Use createRequire to force CJS loading — Vercel's Turbopack
    // externalizes pptxgenjs but fails to load the ESM entry point
    const require = createRequire(import.meta.url);
    const PptxGenJS = require("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.author = "General Public";
    pptx.title = selection.name;
    pptx.subject = "Art Selection";
    pptx.layout = "LAYOUT_WIDE";

    const PRIMARY = "111111";
    const SECONDARY = "666666";
    const LIGHT = "999999";
    const AMBER = "B45309";

    // Helper to fetch image as base64
    async function fetchImageBase64(url: string): Promise<string | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return `data:${contentType};base64,${buffer.toString("base64")}`;
      } catch {
        return null;
      }
    }

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText("GENERAL PUBLIC", {
      x: 0,
      y: 1.5,
      w: "100%",
      fontSize: 14,
      fontFace: "Arial",
      color: LIGHT,
      align: "center",
      bold: true,
    });
    titleSlide.addText(selection.name, {
      x: 0,
      y: 2.5,
      w: "100%",
      fontSize: 36,
      fontFace: "Arial",
      color: PRIMARY,
      align: "center",
      bold: true,
    });
    titleSlide.addText(
      `${selection.items.length} work${selection.items.length !== 1 ? "s" : ""}`,
      {
        x: 0,
        y: 3.5,
        w: "100%",
        fontSize: 14,
        fontFace: "Arial",
        color: SECONDARY,
        align: "center",
      }
    );

    if (selection.notes) {
      titleSlide.addText(selection.notes, {
        x: 2,
        y: 4.5,
        w: 9.33,
        fontSize: 11,
        fontFace: "Arial",
        color: LIGHT,
        align: "center",
      });
    }

    titleSlide.addText(
      `Generated ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      {
        x: 0,
        y: 6.5,
        w: "100%",
        fontSize: 9,
        fontFace: "Arial",
        color: LIGHT,
        align: "center",
      }
    );

    // One slide per work
    for (const item of selection.items) {
      const work = item.work;
      const slide = pptx.addSlide();

      // Image on the left
      const imageUrl = work.imageUrlPreview || work.imageUrlThumbnail;
      if (imageUrl && !imageUrl.includes("placehold.co")) {
        const base64 = await fetchImageBase64(imageUrl);
        if (base64) {
          slide.addImage({
            data: base64,
            x: 0.5,
            y: 0.5,
            w: 7,
            h: 6.5,
            sizing: { type: "contain", w: 7, h: 6.5 },
          });
        }
      }

      // Details on the right
      const detailX = 8;
      const detailW = 4.8;

      slide.addText(work.title, {
        x: detailX,
        y: 0.5,
        w: detailW,
        fontSize: 20,
        fontFace: "Arial",
        color: PRIMARY,
        bold: true,
      });

      slide.addText(work.artistName, {
        x: detailX,
        y: 1.3,
        w: detailW,
        fontSize: 14,
        fontFace: "Arial",
        color: SECONDARY,
      });

      // Metadata
      const dims = work.dimensionsInches as {
        width: number;
        height: number;
      } | null;
      const metaLines: string[] = [];
      if (work.gpSku) metaLines.push(`SKU: ${work.gpSku}`);
      metaLines.push(`Type: ${work.workType.replace(/_/g, " ")}`);
      if (dims) metaLines.push(`Dimensions: ${dims.width}" x ${dims.height}"`);
      if (work.retailerExclusive)
        metaLines.push(`Exclusive: ${work.retailerExclusive}`);
      const availableSizes = work.availableSizes as string[] | null;
      if (availableSizes && availableSizes.length > 0)
        metaLines.push(`Sizes: ${availableSizes.join(", ")}`);

      slide.addText(metaLines.join("\n"), {
        x: detailX,
        y: 2.2,
        w: detailW,
        fontSize: 11,
        fontFace: "Arial",
        color: SECONDARY,
        lineSpacingMultiple: 1.5,
      });

      // Tags
      if (work.aiTagsHero.length > 0) {
        const hasExtraLines = work.retailerExclusive || (availableSizes && availableSizes.length > 0);
        const tagsY = hasExtraLines ? 4.2 : 3.8;
        slide.addText("Tags", {
          x: detailX,
          y: tagsY,
          w: detailW,
          fontSize: 9,
          fontFace: "Arial",
          color: LIGHT,
          bold: true,
        });
        slide.addText(work.aiTagsHero.join("  |  "), {
          x: detailX,
          y: tagsY + 0.3,
          w: detailW,
          fontSize: 9,
          fontFace: "Arial",
          color: SECONDARY,
        });
      }

      // Item notes
      if (item.notes) {
        slide.addText("Note", {
          x: detailX,
          y: 5.5,
          w: detailW,
          fontSize: 9,
          fontFace: "Arial",
          color: LIGHT,
          bold: true,
        });
        slide.addText(item.notes, {
          x: detailX,
          y: 5.8,
          w: detailW,
          fontSize: 10,
          fontFace: "Arial",
          color: PRIMARY,
        });
      }

      // Footer
      slide.addText("General Public \u2022 Art Print Company", {
        x: 0,
        y: 7.0,
        w: "100%",
        fontSize: 8,
        fontFace: "Arial",
        color: LIGHT,
        align: "center",
      });
    }

    const pptxBuffer = (await pptx.write({
      outputType: "nodebuffer",
    })) as Buffer;

    const filename = `${selection.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pptx`;

    return new NextResponse(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PPT export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PowerPoint" },
      { status: 500 }
    );
  }
}
