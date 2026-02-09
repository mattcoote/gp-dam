import { NextRequest, NextResponse } from "next/server";
import { getIiifFullUrl } from "@/lib/rijksmuseum";
import { getGettyFullUrl } from "@/lib/getty";
import { getNgaFullUrl, loadNgaData } from "@/lib/nga";
import { getCmaPrintUrl } from "@/lib/cma";
import { getYaleImageUrl } from "@/lib/yale";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/public-domain/download
 * Downloads a source image directly from the museum API.
 * Query params:
 *   - source: "rijksmuseum" | "getty" | "met" | "yale" | "nga" | "cleveland"
 *   - id: source-specific identifier (objectNumber, accessionNumber, etc.)
 *   - iiifId: for Rijksmuseum (IIIF image ID)
 *   - imageUrl: for Getty/Met (direct image URL)
 *   - iiifBaseUrl: for NGA (IIIF base URL)
 *   - imageServiceUrl: for Yale (IIIF image service URL)
 *   - title: for filename
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const id = searchParams.get("id");
    const title = searchParams.get("title") || "artwork";

    if (!source || !id) {
      return NextResponse.json(
        { error: "source and id are required" },
        { status: 400 }
      );
    }

    let imageUrl: string;

    switch (source) {
      case "rijksmuseum": {
        const iiifId = searchParams.get("iiifId");
        if (!iiifId) {
          return NextResponse.json(
            { error: "iiifId is required for Rijksmuseum" },
            { status: 400 }
          );
        }
        imageUrl = getIiifFullUrl(iiifId);
        break;
      }

      case "getty": {
        const gettyImageUrl = searchParams.get("imageUrl");
        if (!gettyImageUrl) {
          return NextResponse.json(
            { error: "imageUrl is required for Getty" },
            { status: 400 }
          );
        }
        imageUrl = getGettyFullUrl(gettyImageUrl);
        break;
      }

      case "met": {
        const metImageUrl = searchParams.get("imageUrl");
        if (!metImageUrl) {
          return NextResponse.json(
            { error: "imageUrl is required for Met" },
            { status: 400 }
          );
        }
        // The Met's primaryImage field is already the full-res URL
        imageUrl = metImageUrl;
        break;
      }

      case "yale": {
        const imageServiceUrl = searchParams.get("imageServiceUrl");
        if (!imageServiceUrl) {
          return NextResponse.json(
            { error: "imageServiceUrl is required for Yale" },
            { status: 400 }
          );
        }
        imageUrl = getYaleImageUrl(imageServiceUrl);
        break;
      }

      case "nga": {
        // Look up the IIIF base URL from the NGA index
        const objectId = parseInt(id, 10);
        const index = await loadNgaData();
        const entry = index.find((e) => e.objectId === objectId);
        if (!entry) {
          return NextResponse.json(
            { error: "NGA object not found" },
            { status: 404 }
          );
        }
        imageUrl = getNgaFullUrl(entry.iiifBaseUrl);
        break;
      }

      case "cleveland": {
        const accessionNumber = searchParams.get("accessionNumber") || id;
        imageUrl = getCmaPrintUrl(accessionNumber);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown source: ${source}` },
          { status: 400 }
        );
    }

    // Fetch the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imgRes.status}` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const ext = contentType.includes("png") ? "png" : contentType.includes("tif") ? "tif" : "jpg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}_source.${ext}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Public domain download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
