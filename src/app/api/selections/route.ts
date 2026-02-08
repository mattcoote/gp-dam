import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/selections — list all selections (for current session/user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") || request.cookies.get("dam-session")?.value;

    if (!sessionId) {
      return NextResponse.json({ selections: [] });
    }

    const selections = await prisma.selection.findMany({
      where: { sessionId },
      include: {
        items: {
          include: { work: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ selections });
  } catch (error) {
    console.error("Error fetching selections:", error);
    return NextResponse.json(
      { error: "Failed to fetch selections" },
      { status: 500 }
    );
  }
}

// POST /api/selections — create a new selection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sessionId, workId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const selection = await prisma.selection.create({
      data: {
        name: name || "Untitled Selection",
        sessionId,
        items: workId
          ? {
              create: {
                workId,
                position: 0,
              },
            }
          : undefined,
      },
      include: {
        items: {
          include: { work: true },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ selection }, { status: 201 });
  } catch (error) {
    console.error("Error creating selection:", error);
    return NextResponse.json(
      { error: "Failed to create selection" },
      { status: 500 }
    );
  }
}
