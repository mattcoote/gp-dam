const LUX_BASE = "https://lux.collections.yale.edu";

// ─── Types ──────────────────────────────────────────────────

export interface YaleSearchResult {
  objectId: string; // UUID extracted from URI
  objectUri: string; // Full URI
}

export interface YaleSearchResponse {
  totalItems: number;
  items: YaleSearchResult[];
  nextPage?: string;
}

export interface YaleObjectDetail {
  objectId: string;
  accessionNumber: string;
  title: string;
  artist: string;
  manifestUrl: string;
  thumbnailUrl: string;
  imageServiceUrl: string; // IIIF Image Service base URL
  imageWidth?: number;
  imageHeight?: number;
  isPublicDomain: boolean;
}

// ─── Search ─────────────────────────────────────────────────

export async function searchYale(
  query: string,
  options: { page?: number; pageLength?: number } = {}
): Promise<YaleSearchResponse> {
  const page = options.page || 1;
  const pageLength = options.pageLength || 20;

  const q = JSON.stringify({
    AND: [
      { text: query, _lang: "en" },
      { hasDigitalImage: 1 },
      { memberOf: { name: "Yale University Art Gallery" } },
    ],
  });

  const params = new URLSearchParams({
    q,
    page: String(page),
    pageLength: String(pageLength),
  });

  const res = await fetch(`${LUX_BASE}/api/search/item?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Yale LUX search error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const items: YaleSearchResult[] = (data.orderedItems || []).map(
    (item: { id: string }) => ({
      objectId: extractUuid(item.id),
      objectUri: item.id,
    })
  );

  const totalItems = data.partOf?.[0]?.totalItems || 0;
  const nextPage = data.next?.id;

  return { totalItems, items, nextPage };
}

// ─── Object Detail ──────────────────────────────────────────

export async function getYaleObjectDetail(
  uuid: string
): Promise<YaleObjectDetail | null> {
  const res = await fetch(`${LUX_BASE}/data/object/${uuid}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();

  // Extract title (Primary Name)
  let title = data._label || "Untitled";
  for (const item of data.identified_by || []) {
    if (item.type === "Name") {
      const isPrimary = (item.classified_as || []).some(
        (c: { _label?: string }) =>
          c._label?.includes("Primary") || c._label?.includes("Preferred")
      );
      if (isPrimary && item.content) {
        title = item.content;
        break;
      }
    }
  }

  // Extract accession number
  let accessionNumber = "";
  for (const item of data.identified_by || []) {
    if (item.type === "Identifier") {
      const isAccession = (item.classified_as || []).some(
        (c: { id?: string; _label?: string }) =>
          c._label?.includes("Accession") ||
          c.id?.includes("300312355") // AAT for accession number
      );
      if (isAccession && item.content) {
        accessionNumber = item.content;
        break;
      }
    }
  }

  if (!accessionNumber) return null;

  // Extract artist from produced_by
  let artist = "Unknown Artist";
  const production = data.produced_by;
  if (production) {
    // Try parts first (most objects use this)
    for (const part of production.part || []) {
      const agents = part.carried_out_by || [];
      if (agents.length > 0) {
        artist = agents[0]._label || artist;
        // Clean up: remove role prefix "Artist: " and parenthetical bio info
        artist = artist.replace(/^[A-Za-z]+:\s*/, "");
        artist = artist.replace(/\s*\(.*\)\s*$/, "").trim();
        break;
      }
    }
    // Fallback: direct carried_out_by
    if (artist === "Unknown Artist" && production.carried_out_by?.length) {
      artist = production.carried_out_by[0]._label || artist;
      artist = artist.replace(/^[A-Za-z]+:\s*/, "");
      artist = artist.replace(/\s*\(.*\)\s*$/, "").trim();
    }
  }

  // Extract IIIF manifest URL from subject_of
  let manifestUrl = "";
  for (const sub of data.subject_of || []) {
    for (const dig of sub.digitally_carried_by || []) {
      const conformsTo = dig.conforms_to || [];
      const isIiif = conformsTo.some(
        (c: { id?: string }) =>
          c.id?.includes("iiif.io/api/presentation")
      );
      if (isIiif) {
        for (const ap of dig.access_point || []) {
          if (ap.id) {
            manifestUrl = ap.id;
            break;
          }
        }
      }
      if (manifestUrl) break;
    }
    if (manifestUrl) break;
  }

  // Extract thumbnail URL
  let thumbnailUrl = "";
  for (const rep of data.representation || []) {
    for (const dig of rep.digitally_shown_by || []) {
      for (const ap of dig.access_point || []) {
        if (ap.id && ap.id.includes("thumbnail")) {
          thumbnailUrl = ap.id;
          break;
        }
      }
      // Fallback: any access point as thumbnail
      if (!thumbnailUrl) {
        for (const ap of dig.access_point || []) {
          if (ap.id) {
            thumbnailUrl = ap.id;
            break;
          }
        }
      }
      if (thumbnailUrl) break;
    }
    if (thumbnailUrl) break;
  }

  if (!manifestUrl) return null;

  // Fetch IIIF manifest to get image service URL, dimensions, and rights
  const manifest = await fetchYaleManifest(manifestUrl);
  if (!manifest) return null;

  return {
    objectId: uuid,
    accessionNumber,
    title,
    artist,
    manifestUrl,
    thumbnailUrl,
    imageServiceUrl: manifest.imageServiceUrl,
    imageWidth: manifest.width,
    imageHeight: manifest.height,
    isPublicDomain: manifest.isPublicDomain,
  };
}

// ─── IIIF Manifest ──────────────────────────────────────────

interface ManifestInfo {
  imageServiceUrl: string;
  width: number;
  height: number;
  isPublicDomain: boolean;
}

async function fetchYaleManifest(
  manifestUrl: string
): Promise<ManifestInfo | null> {
  try {
    const res = await fetch(manifestUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json();

    // Check rights
    const rights = data.rights || "";
    const isPublicDomain =
      rights.includes("publicdomain") ||
      rights.includes("zero/1.0") ||
      rights.includes("cc0");

    // Extract first canvas → annotation → image body
    const canvas = data.items?.[0];
    if (!canvas) return null;

    const width = canvas.width || 0;
    const height = canvas.height || 0;

    // Navigate: canvas.items[0].items[0].body (Annotation body)
    const annotationPage = canvas.items?.[0];
    const annotation = annotationPage?.items?.[0];
    const body = annotation?.body;

    if (!body) return null;

    // Image service URL from body.service
    let imageServiceUrl = "";
    const services = body.service || [];
    for (const svc of services) {
      if (svc.id) {
        imageServiceUrl = svc.id;
        break;
      }
      if (svc["@id"]) {
        imageServiceUrl = svc["@id"];
        break;
      }
    }

    // Fallback: derive from body.id (image URL)
    if (!imageServiceUrl && body.id) {
      // body.id like: https://images.collections.yale.edu/iiif/2/yuag:abc/full/full/0/default.jpg
      const match = body.id.match(
        /(https:\/\/images\.collections\.yale\.edu\/iiif\/2\/[^/]+)/
      );
      if (match) {
        imageServiceUrl = match[1];
      }
    }

    if (!imageServiceUrl) return null;

    return { imageServiceUrl, width, height, isPublicDomain };
  } catch {
    return null;
  }
}

// ─── Image Helpers ──────────────────────────────────────────

function extractUuid(uri: string): string {
  return uri.split("/").pop() || "";
}

export function getYaleThumbnailUrl(thumbnailUrl: string): string {
  // The thumbnail URL is already usable as-is
  return thumbnailUrl;
}

export function getYaleImageUrl(imageServiceUrl: string, width?: number): string {
  if (width) {
    return `${imageServiceUrl}/full/${width},/0/default.jpg`;
  }
  return `${imageServiceUrl}/full/full/0/default.jpg`;
}
