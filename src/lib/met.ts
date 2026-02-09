const BASE_URL = "https://collectionapi.metmuseum.org/public/collection/v1";

// ─── Types ──────────────────────────────────────────────────

export interface MetSearchResponse {
  total: number;
  objectIDs: number[];
}

export interface MetObjectDetail {
  objectID: number;
  title: string;
  artistDisplayName: string;
  accessionNumber: string;
  primaryImage: string;
  primaryImageSmall: string;
  isPublicDomain: boolean;
  objectDate: string;
  medium: string;
  imageWidth?: number;
  imageHeight?: number;
}

// ─── Search ─────────────────────────────────────────────────

export async function searchMet(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ total: number; objectIDs: number[] }> {
  const params = new URLSearchParams({
    q: query,
    isPublicDomain: "true",
    hasImages: "true",
  });

  const res = await fetch(`${BASE_URL}/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Met API search error: ${res.status} ${res.statusText}`);
  }

  const data: MetSearchResponse = await res.json();
  return {
    total: data.total || 0,
    objectIDs: data.objectIDs || [],
  };
}

// ─── Object Detail ──────────────────────────────────────────

export async function getMetObjectDetail(
  objectID: number
): Promise<MetObjectDetail | null> {
  const res = await fetch(`${BASE_URL}/objects/${objectID}`);
  if (!res.ok) return null;

  const data = await res.json();

  if (!data.isPublicDomain || !data.primaryImage) return null;

  // Fetch image dimensions from JPEG header (partial download)
  const dims = await getJpegDimensions(data.primaryImage);

  return {
    objectID: data.objectID,
    title: data.title || "Untitled",
    artistDisplayName: data.artistDisplayName || "Unknown Artist",
    accessionNumber: data.accessionNumber || "",
    primaryImage: data.primaryImage,
    primaryImageSmall: data.primaryImageSmall || data.primaryImage,
    isPublicDomain: data.isPublicDomain,
    objectDate: data.objectDate || "",
    medium: data.medium || "",
    imageWidth: dims?.width,
    imageHeight: dims?.height,
  };
}

// ─── Image Helpers ──────────────────────────────────────────

/**
 * Parse JPEG dimensions from just the first 32KB of the file.
 * Reads the SOF0/SOF2 marker to extract width and height.
 */
export async function getJpegDimensions(
  imageUrl: string
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { Range: "bytes=0-32767" },
    });
    if (!res.ok && res.status !== 206) return null;

    const buf = Buffer.from(await res.arrayBuffer());

    // Find SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
    for (let i = 0; i < buf.length - 10; i++) {
      if (buf[i] === 0xff && (buf[i + 1] === 0xc0 || buf[i + 1] === 0xc2)) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
