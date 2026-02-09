const SEARCH_URL = "https://data.rijksmuseum.nl/search/collection";
const OAI_URL = "https://data.rijksmuseum.nl/oai";

// ─── Types ──────────────────────────────────────────────────

export interface RijksSearchResult {
  objectId: string; // e.g. "https://id.rijksmuseum.nl/200108369"
}

export interface RijksSearchResponse {
  totalItems: number;
  items: RijksSearchResult[];
  nextPageToken?: string;
}

export interface RijksObjectDetail {
  objectId: string;
  objectNumber: string; // e.g. "SK-A-2344"
  title: string;
  creator: string;
  iiifId: string; // e.g. "QkOGy" → image at iiif.micr.io/{iiifId}/full/...
  imageWidth?: number;
  imageHeight?: number;
}

// ─── Search API ─────────────────────────────────────────────

export async function searchRijksmuseum(
  query: string,
  options: {
    type?: string;
    pageToken?: string;
  } = {}
): Promise<RijksSearchResponse> {
  const params = new URLSearchParams({
    imageAvailable: "true",
  });

  // The search API has separate fields: title, creator, description, type
  // Use title for general search; also add creator for broader matching
  params.set("title", query);
  if (options.type) params.set("type", options.type);
  if (options.pageToken) params.set("pageToken", options.pageToken);

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Rijksmuseum Search API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Parse Linked Art Search response
  const totalItems = data.partOf?.totalItems || 0;
  const items: RijksSearchResult[] = (data.orderedItems || []).map(
    (item: { id: string }) => ({
      objectId: item.id,
    })
  );

  // Extract pageToken from next link if present
  let nextPageToken: string | undefined;
  const nextUrl = data.next?.id;
  if (nextUrl) {
    const url = new URL(nextUrl);
    nextPageToken = url.searchParams.get("pageToken") || undefined;
  }

  return { totalItems, items, nextPageToken };
}

// ─── OAI-PMH Record Resolver ───────────────────────────────

export async function getObjectDetail(
  objectId: string
): Promise<RijksObjectDetail | null> {
  const params = new URLSearchParams({
    verb: "GetRecord",
    identifier: objectId,
    metadataPrefix: "edm",
  });

  const res = await fetch(`${OAI_URL}?${params.toString()}`);
  if (!res.ok) return null;

  const xml = await res.text();

  // Extract title (English preferred)
  const titleEnMatch = xml.match(
    /<dc:title xml:lang="en">([^<]+)/
  );
  const titleAnyMatch = xml.match(/<dc:title[^>]*>([^<]+)/);
  const title = titleEnMatch?.[1] || titleAnyMatch?.[1] || "Untitled";

  // Extract creator name from skos:prefLabel (English preferred)
  const creatorEnMatch = xml.match(
    /<skos:prefLabel xml:lang="en">([^<]+)<\/skos:prefLabel>/
  );
  const creatorAnyMatch = xml.match(
    /<skos:prefLabel[^>]*>([^<]+)<\/skos:prefLabel>/
  );
  const creator =
    creatorEnMatch?.[1] || creatorAnyMatch?.[1] || "Unknown Artist";

  // Extract object number from dc:identifier
  const objectNumberMatch = xml.match(
    /<dc:identifier>([^<]+)/
  );
  const objectNumber = objectNumberMatch?.[1] || "";

  // Extract IIIF image ID from micr.io URL
  const iiifMatch = xml.match(/iiif\.micr\.io\/([^/"]+)/);
  const iiifId = iiifMatch?.[1] || "";

  if (!iiifId) return null;

  // Fetch image dimensions from IIIF info.json
  const dims = await getIiifDimensions(iiifId);

  return {
    objectId,
    objectNumber,
    title,
    creator,
    iiifId,
    imageWidth: dims?.width,
    imageHeight: dims?.height,
  };
}

// ─── Helpers ────────────────────────────────────────────────

export function getIiifThumbnailUrl(iiifId: string, width = 400): string {
  return `https://iiif.micr.io/${iiifId}/full/${width},/0/default.jpg`;
}

export function getIiifFullUrl(iiifId: string): string {
  return `https://iiif.micr.io/${iiifId}/full/max/0/default.jpg`;
}

export async function getIiifDimensions(
  iiifId: string
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(`https://iiif.micr.io/${iiifId}/info.json`);
    if (!res.ok) return null;
    const data = await res.json();
    return { width: data.width, height: data.height };
  } catch {
    return null;
  }
}
