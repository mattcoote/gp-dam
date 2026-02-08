import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/selections/[id] — get a single selection with items
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

    return NextResponse.json({ selection });
  } catch (error) {
    console.error("Error fetching selection:", error);
    return NextResponse.json(
      { error: "Failed to fetch selection" },
      { status: 500 }
    );
  }
}

// PATCH /api/selections/[id] — update selection name/notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, notes } = body;

    const selection = await prisma.selection.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        items: {
          include: { work: true },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ selection });
  } catch (error) {
    console.error("Error updating selection:", error);
    return NextResponse.json(
      { error: "Failed to update selection" },
      { status: 500 }
    );
  }
}

// DELETE /api/selections/[id] — delete a selection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.selection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting selection:", error);
    return NextResponse.json(
      { error: "Failed to delete selection" },
      { status: 500 }
    );
  }
}
