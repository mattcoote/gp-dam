import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const results = await prisma.work.findMany({
      where: { status: "active" },
      select: { artistName: true },
      distinct: ["artistName"],
      orderBy: { artistName: "asc" },
    });

    const artists = results
      .map((r) => r.artistName)
      .filter((name) => name && name.trim() !== "")
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ artists });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json({ artists: [] });
  }
}
