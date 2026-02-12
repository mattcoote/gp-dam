import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkStatus, WorkType, Orientation, Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "48", 10);
  const search = searchParams.get("search") || "";
  const workTypeParam = searchParams.get("workType") || "";
  const orientationParam = searchParams.get("orientation") || "";
  const sourceTypeParam = searchParams.get("sourceType") || "";
  const retailerExclusiveParam = searchParams.get("retailerExclusive") || "";
  const artist = searchParams.get("artist") || "";
  const gpExclusive = searchParams.get("gpExclusive");
  const statusParam = searchParams.get("status");
  const status = statusParam === "all" ? undefined : ((statusParam as WorkStatus) || "active");
  const sortBy = searchParams.get("sortBy") || "newest";

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.WorkWhereInput = {
    ...(status ? { status } : {}),
  };

  // Filter by work type (supports comma-separated multi-select)
  if (workTypeParam) {
    const types = workTypeParam.split(",").filter(Boolean) as WorkType[];
    where.workType = types.length > 1 ? { in: types } : types[0];
  }

  // Filter by orientation (supports comma-separated multi-select)
  if (orientationParam) {
    const orients = orientationParam.split(",").filter(Boolean) as Orientation[];
    where.orientation = orients.length > 1 ? { in: orients } : orients[0];
  }

  // Filter by source type (supports comma-separated multi-select)
  if (sourceTypeParam) {
    const sources = sourceTypeParam.split(",").filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.sourceType = sources.length > 1 ? { in: sources as any } : (sources[0] as any);
  }

  // Filter by retailer exclusive (supports comma-separated multi-select)
  if (retailerExclusiveParam) {
    const retailers = retailerExclusiveParam.split(",").filter(Boolean);
    where.retailerExclusive = retailers.length > 1 ? { in: retailers } : retailers[0];
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
  // Uses substring matching within tag arrays so "jewel" matches a tag "jewel tones"
  if (search) {
    const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);

    // For each search term, find work IDs where the term appears as a substring
    // within any tag (hero or hidden), title, or artist name.
    // We use raw SQL for tag substring matching since Prisma's `has` only does exact element matches.
    try {
      const matchingIdSets = await Promise.all(
        searchTerms.map(async (term) => {
          const pattern = `%${term}%`;
          const results: { id: string }[] = await prisma.$queryRaw`
            SELECT id FROM works
            WHERE (status = 'active' OR ${!status}::boolean)
            AND (
              title ILIKE ${pattern}
              OR artist_name ILIKE ${pattern}
              OR array_to_string(ai_tags_hero, '||') ILIKE ${pattern}
              OR array_to_string(ai_tags_hidden, '||') ILIKE ${pattern}
            )
          `;
          return new Set(results.map((r) => r.id));
        })
      );

      // AND logic: work must match ALL search terms
      if (matchingIdSets.length > 0) {
        let intersectedIds = matchingIdSets[0];
        for (let i = 1; i < matchingIdSets.length; i++) {
          intersectedIds = new Set(
            [...intersectedIds].filter((id) => matchingIdSets[i].has(id))
          );
        }
        const idArray = [...intersectedIds];
        if (idArray.length === 0) {
          // No matches — return empty
          return NextResponse.json({
            works: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
        where.id = { in: idArray };
      }
    } catch (error) {
      console.error("Tag search error, falling back to basic search:", error);
      // Fallback to basic Prisma search if raw SQL fails
      where.AND = searchTerms.map((term) => ({
        OR: [
          { title: { contains: term, mode: "insensitive" as const } },
          { artistName: { contains: term, mode: "insensitive" as const } },
          { aiTagsHero: { has: term } },
          { aiTagsHidden: { has: term } },
        ],
      }));
    }
  }

  try {
    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy === "oldest" ? { createdAt: "asc" } : sortBy === "title" ? { title: "asc" } : { createdAt: "desc" },
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
          availableSizes: true,
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
