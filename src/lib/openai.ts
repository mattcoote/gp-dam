import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateArtworkTags(
  imageUrl: string
): Promise<{ heroTags: string[]; hiddenTags: string[]; medium?: string }> {
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
            text: `Analyze this artwork image and provide tags in JSON format:
{
  "heroTags": ["tag1", "tag2", ...],
  "hiddenTags": ["tag1", "tag2", ...],
  "medium": "painting" | "photograph" | "print" | "drawing" | "sculpture" | "mixed_media" | "digital"
}

MEDIUM DETECTION (CRITICAL):
First, determine the medium. If this is a photograph (captured by a camera — including film, digital, vintage, daguerreotype, Polaroid, etc.), set medium to "photograph". Look for photographic qualities: realistic lighting, lens depth of field, grain/noise, photographic paper texture, real-world subjects captured rather than rendered. Paintings, illustrations, and digitally created images are NOT photographs.

heroTags: Exactly 10 primary descriptive tags visible to users. Include:
- The detected medium as one of the 10 tags (e.g., "photography", "painting", "drawing", "print", "sculpture", "mixed media", "digital art")
- Subject matter (e.g., "landscape", "portrait", "still life", "cityscape", "nude", "seascape")
- Dominant mood / emotional quality (e.g., "serene", "dramatic", "melancholic")
- Style descriptors (e.g., "abstract", "figurative", "minimalist")

hiddenTags: 50 extended search tags for discovery. You MUST cover ALL of these categories:

1. ARTIST STYLE REFERENCES — Which famous artists does this remind you of? Include 3-5 artist references using the format "looks like [Artist Name]" (e.g., "looks like Monet", "looks like Matisse", "looks like Jeff Koons", "looks like Ansel Adams", "looks like Rothko"). Consider both obvious stylistic matches and more subtle connections.

2. ART MOVEMENT / STYLE — Which art movements or historical styles does this relate to? Include 3-5 movement tags (e.g., "impressionism", "brutalism", "art deco", "pop art", "romanticism", "surrealism", "abstract expressionism", "minimalism", "baroque", "ukiyo-e", "fauvism", "post-impressionism", "photorealism", "cubism").

3. COLOR PALETTE — Specific color descriptors (e.g., "jewel tones", "earth tones", "pastel", "muted", "vibrant", "monochromatic", "warm palette", "cool palette", "teal", "crimson", "ochre", "navy").

4. COMPOSITION — Compositional details (e.g., "symmetrical", "rule of thirds", "central focus", "panoramic", "close-up", "aerial view", "negative space").

5. TECHNIQUE — Artistic technique or method (e.g., "impasto", "watercolor wash", "cross-hatching", "collage", "long exposure", "chiaroscuro", "pointillism", "glazing").

6. HISTORICAL PERIOD — When this appears to be from or reference (e.g., "19th century", "mid-century modern", "contemporary", "renaissance", "ancient", "1960s").

7. CULTURAL CONTEXT — Cultural or geographic associations (e.g., "Japanese", "French", "African", "Nordic", "Mediterranean", "American West").

8. EMOTIONAL TONE — Feelings evoked (e.g., "contemplative", "joyful", "mysterious", "nostalgic", "peaceful", "energetic", "haunting", "whimsical").

9. SETTING / ENVIRONMENT — What is depicted or suggested (e.g., "countryside", "urban", "interior", "garden", "ocean", "mountains", "forest", "desert").

10. ROOM FIT — Where this art would look good (e.g., "living room", "office", "bedroom", "hotel lobby", "restaurant", "gallery wall", "nursery").

11. SEASONAL / TIME — Any temporal associations (e.g., "autumn", "winter", "golden hour", "twilight", "spring blooms").

12. ABSTRACT CONCEPTS — Broader themes (e.g., "solitude", "nature", "luxury", "simplicity", "movement", "decay", "growth", "heritage").

Return ONLY valid JSON, no markdown or explanation.`,
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      heroTags: parsed.heroTags || [],
      hiddenTags: parsed.hiddenTags || [],
      medium: parsed.medium || undefined,
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
