import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const results = await prisma.work.findMany({
      where: {
        status: "active",
        retailerExclusive: { not: null },
      },
      select: { retailerExclusive: true },
      distinct: ["retailerExclusive"],
    });

    const retailers = results
      .map((r) => r.retailerExclusive)
      .filter((name): name is string => !!name && name.trim() !== "")
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ retailers });
  } catch (error) {
    console.error("Error fetching retailers:", error);
    return NextResponse.json({ retailers: [] });
  }
}
