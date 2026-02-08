import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/selections/share/[token] — get a shared selection by share token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const selection = await prisma.selection.findUnique({
      where: { shareToken: token },
      include: {
        items: {
          include: {
            work: {
              select: {
                id: true,
                gpSku: true,
                title: true,
                artistName: true,
                workType: true,
                orientation: true,
                dimensionsInches: true,
                imageUrlThumbnail: true,
                imageUrlPreview: true,
                aiTagsHero: true,
                retailerExclusive: true,
                dominantColors: true,
              },
            },
          },
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

    return NextResponse.json({
      selection: {
        id: selection.id,
        name: selection.name,
        notes: selection.notes,
        shareToken: selection.shareToken,
        createdAt: selection.createdAt,
        items: selection.items,
      },
    });
  } catch (error) {
    console.error("Error fetching shared selection:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared selection" },
      { status: 500 }
    );
  }
}
