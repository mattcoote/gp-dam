import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateArtworkTags(
  imageUrl: string
): Promise<{ heroTags: string[]; hiddenTags: string[] }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
          {
            type: "text",
            text: `Analyze this artwork and provide tags in JSON format:
{
  "heroTags": ["tag1", "tag2", ...],
  "hiddenTags": ["tag1", "tag2", ...]
}

heroTags: Exactly 10 primary descriptive tags visible to users. Cover subject matter, style, and dominant mood.

hiddenTags: 50 extended search tags for discovery. Cover: color palette specifics, composition details, artistic technique, historical period, cultural context, similar art movements, emotional tone, setting/environment, materials suggested, potential room/space fit (e.g., "living room", "office"), seasonal associations, and abstract concepts.

Return ONLY valid JSON, no markdown or explanation.`,
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      heroTags: parsed.heroTags || [],
      hiddenTags: parsed.hiddenTags || [],
    };
  } catch {
    console.error("Failed to parse AI tags:", content);
    return { heroTags: [], hiddenTags: [] };
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}
