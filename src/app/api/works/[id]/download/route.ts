import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, getImageKey } from "@/lib/s3";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/works/[id]/download
 * Returns a redirect to a signed S3 URL for the source image,
 * or proxies the image if it's not on S3.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const work = await prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        imageUrlSource: true,
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    if (!work.imageUrlSource) {
      return NextResponse.json(
        { error: "No source image available" },
        { status: 404 }
      );
    }

    // If S3 is configured and the URL looks like our S3/CDN pattern, generate a signed download URL
    if (
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      (work.imageUrlSource.includes(process.env.AWS_S3_BUCKET) ||
        (process.env.CLOUDFRONT_URL &&
          work.imageUrlSource.startsWith(process.env.CLOUDFRONT_URL)))
    ) {
      const key = getImageKey(work.id, "source");
      const signedUrl = await getSignedDownloadUrl(key);
      return NextResponse.redirect(signedUrl);
    }

    // Otherwise, proxy the image (for placeholder URLs or external URLs)
    const imgRes = await fetch(work.imageUrlSource);
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source image" },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const safeTitle = work.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}_source.jpg"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
