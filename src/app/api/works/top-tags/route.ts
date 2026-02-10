import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all hero tags from active works and count frequency
    const works = await prisma.work.findMany({
      where: { status: "active" },
      select: { aiTagsHero: true },
    });

    const tagCounts = new Map<string, number>();
    for (const work of works) {
      for (const tag of work.aiTagsHero) {
        const normalized = tag.toLowerCase().trim();
        if (normalized) {
          tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
        }
      }
    }

    // Sort by frequency, take top 20
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({
        tag,
        // Title case for display
        label: tag
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        count,
      }));

    return NextResponse.json({ topTags });
  } catch (error) {
    console.error("Error fetching top tags:", error);
    return NextResponse.json({ topTags: [] });
  }
}
