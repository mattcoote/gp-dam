import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateArtworkTags, generateEmbedding } from "@/lib/openai";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workIds, batchSize = 5 } = body as {
      workIds?: string[];
      batchSize?: number;
    };

    // Fetch works to retag
    const where = workIds?.length ? { id: { in: workIds } } : { status: "active" as const };

    const works = await prisma.work.findMany({
      where,
      select: {
        id: true,
        title: true,
        workType: true,
        imageUrlPreview: true,
        imageUrlSource: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (works.length === 0) {
      return NextResponse.json({ error: "No works found to retag" }, { status: 404 });
    }

    const results: {
      id: string;
      title: string;
      success: boolean;
      heroTags?: string[];
      hiddenTags?: string[];
      medium?: string;
      workTypeChanged?: string;
      error?: string;
    }[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < works.length; i += batchSize) {
      const batch = works.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (work) => {
          const imageUrl = work.imageUrlPreview || work.imageUrlSource;
          if (!imageUrl) {
            return {
              id: work.id,
              title: work.title,
              success: false,
              error: "No image URL available",
            };
          }

          try {
            // Fetch image and convert to base64
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) {
              throw new Error(`Failed to fetch image: ${imgRes.status}`);
            }
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const base64 = imgBuffer.toString("base64");
            const dataUrl = `data:image/jpeg;base64,${base64}`;

            // Generate new tags
            const tags = await generateArtworkTags(dataUrl);

            // Generate new embedding from all tags
            const tagText = [...tags.heroTags, ...tags.hiddenTags].join(", ");
            const embeddingVector = await generateEmbedding(tagText);

            // Determine if work type should change based on medium
            let newWorkType: string | undefined;
            if (tags.medium && work.workType === "reductive") {
              const mediumToWorkType: Record<string, string> = {
                photograph: "photography",
                drawing: "work_on_paper",
                print: "work_on_paper",
                painting: "work_on_canvas",
              };
              if (mediumToWorkType[tags.medium]) {
                newWorkType = mediumToWorkType[tags.medium];
              }
            }

            // Update database
            if (embeddingVector) {
              await prisma.$executeRawUnsafe(
                `UPDATE works SET
                  ai_tags_hero = $1::text[],
                  ai_tags_hidden = $2::text[],
                  embedding = $3::vector,
                  ${newWorkType ? `work_type = $4::text,` : ""}
                  updated_at = NOW()
                WHERE id = ${newWorkType ? "$5" : "$4"}`,
                tags.heroTags,
                tags.hiddenTags,
                `[${embeddingVector.join(",")}]`,
                ...(newWorkType ? [newWorkType, work.id] : [work.id])
              );
            } else {
              const updateData: Record<string, unknown> = {
                aiTagsHero: tags.heroTags,
                aiTagsHidden: tags.hiddenTags,
              };
              if (newWorkType) {
                updateData.workType = newWorkType;
              }
              await prisma.work.update({
                where: { id: work.id },
                data: updateData,
              });
            }

            return {
              id: work.id,
              title: work.title,
              success: true,
              heroTags: tags.heroTags,
              hiddenTags: tags.hiddenTags,
              medium: tags.medium,
              workTypeChanged: newWorkType,
            };
          } catch (err) {
            return {
              id: work.id,
              title: work.title,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            };
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            id: "unknown",
            title: "unknown",
            success: false,
            error: result.reason?.message || "Promise rejected",
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const typeChanges = results.filter((r) => r.workTypeChanged);

    return NextResponse.json({
      message: `Retag complete: ${successCount} succeeded, ${failCount} failed`,
      total: works.length,
      successCount,
      failCount,
      typeChanges: typeChanges.map((r) => ({
        id: r.id,
        title: r.title,
        newType: r.workTypeChanged,
      })),
      results,
    });
  } catch (error) {
    console.error("Retag error:", error);
    return NextResponse.json(
      {
        error: "Retag failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
