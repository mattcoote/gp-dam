import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/selections/[id]/items/[itemId] — update item notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { notes } = body;

    const item = await prisma.selectionItem.update({
      where: { id: itemId },
      data: { notes: notes ?? null },
      include: { work: true },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/selections/[id]/items/[itemId] — remove item from selection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    await prisma.selectionItem.delete({ where: { id: itemId } });

    // Reorder remaining items to close gaps
    const remaining = await prisma.selectionItem.findMany({
      where: { selectionId: id },
      orderBy: { position: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await prisma.selectionItem.update({
          where: { id: remaining[i].id },
          data: { position: i },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing item:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
