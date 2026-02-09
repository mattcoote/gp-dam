const CMA_API_BASE = "https://openaccess-api.clevelandart.org/api";

// ─── Types ──────────────────────────────────────────────────

export interface CmaArtwork {
  id: number;
  accessionNumber: string;
  title: string;
  artist: string;
  type: string;
  thumbnailUrl: string;
  printUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export interface CmaSearchResponse {
  total: number;
  items: CmaArtwork[];
}

// ─── Search ─────────────────────────────────────────────────

export async function searchCma(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<CmaSearchResponse> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const params = new URLSearchParams({
    q: query,
    cc0: "1",
    has_image: "1",
    limit: String(pageSize),
    skip: String(skip),
  });

  const res = await fetch(`${CMA_API_BASE}/artworks/?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`CMA API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const total: number = data.info?.total || 0;

  const items: CmaArtwork[] = (data.data || [])
    .filter((a: Record<string, unknown>) => a.images)
    .map((a: Record<string, unknown>) => {
      const images = a.images as Record<
        string,
        { url?: string; width?: string; height?: string } | null
      >;
      const print = images?.print;
      const web = images?.web;

      const width = parseInt(String(print?.width || web?.width || "0"), 10);
      const height = parseInt(String(print?.height || web?.height || "0"), 10);

      const creators = a.creators as { description?: string }[] | undefined;
      const artistDesc = creators?.[0]?.description || "Unknown Artist";
      // Clean: "Claude Monet (French, 1840-1926)" → "Claude Monet"
      const artist = artistDesc.replace(/\s*\(.*\)\s*$/, "").trim();

      return {
        id: a.id as number,
        accessionNumber: a.accession_number as string,
        title: (a.title as string) || "Untitled",
        artist,
        type: (a.type as string) || "",
        thumbnailUrl: web?.url || "",
        printUrl: print?.url || "",
        imageWidth: width,
        imageHeight: height,
      };
    });

  return { total, items };
}

// ─── Image Helpers ──────────────────────────────────────────

export function getCmaPrintUrl(accessionNumber: string): string {
  return `https://openaccess-cdn.clevelandart.org/${accessionNumber}/${accessionNumber}_print.jpg`;
}
