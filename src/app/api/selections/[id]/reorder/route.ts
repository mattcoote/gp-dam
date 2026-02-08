import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/selections/[id]/reorder — reorder items in a selection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemIds } = body as { itemIds: string[] };

    if (!Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: "itemIds must be an array of item IDs in desired order" },
        { status: 400 }
      );
    }

    // Update each item's position
    await Promise.all(
      itemIds.map((itemId, index) =>
        prisma.selectionItem.update({
          where: { id: itemId },
          data: { position: index },
        })
      )
    );

    // Touch the selection's updatedAt
    await prisma.selection.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering items:", error);
    return NextResponse.json(
      { error: "Failed to reorder items" },
      { status: 500 }
    );
  }
}
