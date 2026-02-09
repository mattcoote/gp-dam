import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkStatus, WorkType, Orientation, Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "24", 10);
  const search = searchParams.get("search") || "";
  const workType = searchParams.get("workType") as WorkType | null;
  const orientation = searchParams.get("orientation") as Orientation | null;
  const artist = searchParams.get("artist") || "";
  const gpExclusive = searchParams.get("gpExclusive");
  const statusParam = searchParams.get("status");
  const status = statusParam === "all" ? undefined : ((statusParam as WorkStatus) || "active");

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.WorkWhereInput = {
    ...(status ? { status } : {}),
  };

  // Filter by work type
  if (workType) {
    where.workType = workType;
  }

  // Filter by orientation
  if (orientation) {
    where.orientation = orientation;
  }

  // Filter by artist
  if (artist) {
    where.artistName = { contains: artist, mode: "insensitive" };
  }

  // Filter by GP exclusive
  if (gpExclusive === "true") {
    where.gpExclusive = true;
  }

  // Keyword search across tags, title, and artist
  if (search) {
    const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
    where.OR = searchTerms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { artistName: { contains: term, mode: "insensitive" as const } },
        { aiTagsHero: { has: term } },
        { aiTagsHidden: { has: term } },
      ],
    }));
  }

  try {
    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          gpSku: true,
          title: true,
          artistName: true,
          workType: true,
          orientation: true,
          dimensionsInches: true,
          maxPrintInches: true,
          sourceType: true,
          sourceLabel: true,
          imageUrlThumbnail: true,
          imageUrlPreview: true,
          aiTagsHero: true,
          retailerExclusive: true,
          gpExclusive: true,
          dominantColors: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.work.count({ where }),
    ]);

    return NextResponse.json({
      works,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching works:", error);
    return NextResponse.json(
      { error: "Failed to fetch works" },
      { status: 500 }
    );
  }
}
