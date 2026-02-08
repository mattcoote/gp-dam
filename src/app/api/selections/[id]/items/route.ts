import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/selections/[id]/items — add a work to a selection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workId, notes } = body;

    if (!workId) {
      return NextResponse.json(
        { error: "workId is required" },
        { status: 400 }
      );
    }

    // Get the current max position
    const maxPosition = await prisma.selectionItem.aggregate({
      where: { selectionId: id },
      _max: { position: true },
    });

    const nextPosition = (maxPosition._max.position ?? -1) + 1;

    const item = await prisma.selectionItem.create({
      data: {
        selectionId: id,
        workId,
        position: nextPosition,
        notes: notes || null,
      },
      include: { work: true },
    });

    // Touch the selection's updatedAt
    await prisma.selection.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    // Handle duplicate entry
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This work is already in this selection" },
        { status: 409 }
      );
    }
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Failed to add item to selection" },
      { status: 500 }
    );
  }
}
