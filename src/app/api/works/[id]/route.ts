import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        gpSku: true,
        title: true,
        artistName: true,
        sourceType: true,
        sourceLabel: true,
        workType: true,
        orientation: true,
        dimensionsInches: true,
        maxPrintInches: true,
        imageUrlThumbnail: true,
        imageUrlPreview: true,
        imageUrlSource: true,
        aiTagsHero: true,
        dominantColors: true,
        retailerExclusive: true,
        customResizeAvailable: true,
        status: true,
        createdAt: true,
      },
    });

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    return NextResponse.json(work);
  } catch (error) {
    console.error("Error fetching work:", error);
    return NextResponse.json(
      { error: "Failed to fetch work" },
      { status: 500 }
    );
  }
}

// PATCH /api/works/[id] — update work status or fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      status,
      title,
      artistName,
      retailerExclusive,
      artistExclusiveTo,
      workType,
      sourceType,
      dimensionsInches,
      orientation,
      aiTagsHero,
      aiTagsHidden,
      customResizeAvailable,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (artistName !== undefined) updateData.artistName = artistName;
    if (retailerExclusive !== undefined)
      updateData.retailerExclusive = retailerExclusive || null;
    if (artistExclusiveTo !== undefined)
      updateData.artistExclusiveTo = artistExclusiveTo || null;
    if (workType !== undefined) updateData.workType = workType;
    if (sourceType !== undefined) updateData.sourceType = sourceType;
    if (dimensionsInches !== undefined)
      updateData.dimensionsInches = dimensionsInches;
    if (orientation !== undefined) updateData.orientation = orientation;
    if (aiTagsHero !== undefined) updateData.aiTagsHero = aiTagsHero;
    if (aiTagsHidden !== undefined) updateData.aiTagsHidden = aiTagsHidden;
    if (customResizeAvailable !== undefined)
      updateData.customResizeAvailable = customResizeAvailable;

    const work = await prisma.work.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(work);
  } catch (error) {
    console.error("Error updating work:", error);
    return NextResponse.json(
      { error: "Failed to update work" },
      { status: 500 }
    );
  }
}

// DELETE /api/works/[id] — permanently delete a work
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // First remove from any selections
    await prisma.selectionItem.deleteMany({
      where: { workId: id },
    });

    // Then delete the work
    await prisma.work.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting work:", error);
    return NextResponse.json(
      { error: "Failed to delete work" },
      { status: 500 }
    );
  }
}
