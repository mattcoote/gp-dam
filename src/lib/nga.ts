const OBJECTS_CSV_URL =
  "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/objects.csv";
const IMAGES_CSV_URL =
  "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv";

const MIN_PRINT_PX = 3600; // 12" at 300 DPI

// ─── Types ──────────────────────────────────────────────────

export interface NgaIndexEntry {
  objectId: number;
  accessionNumber: string;
  title: string;
  artist: string;
  classification: string;
  iiifBaseUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export interface NgaSearchResponse {
  total: number;
  items: NgaIndexEntry[];
}

// ─── CSV Parser ─────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects.
 * Handles quoted fields with commas and escaped quotes.
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ─── Data Loading ───────────────────────────────────────────

let cachedIndex: NgaIndexEntry[] | null = null;
let loadingPromise: Promise<NgaIndexEntry[]> | null = null;

async function buildIndex(): Promise<NgaIndexEntry[]> {
  console.log("NGA: Downloading open data CSVs...");
  const start = Date.now();

  const [objectsText, imagesText] = await Promise.all([
    fetch(OBJECTS_CSV_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch objects.csv: ${r.status}`);
      return r.text();
    }),
    fetch(IMAGES_CSV_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch published_images.csv: ${r.status}`);
      return r.text();
    }),
  ]);

  console.log(`NGA: Downloaded in ${Date.now() - start}ms, parsing...`);

  const objects = parseCsv(objectsText);
  const images = parseCsv(imagesText);

  // Build image lookup: objectId → primary image info
  const imageMap = new Map<
    string,
    { uuid: string; iiifUrl: string; width: number; height: number }
  >();

  for (const img of images) {
    if (img.viewtype !== "primary") continue;
    const objectId = img.depictstmsobjectid;
    if (!objectId) continue;
    // Only keep first primary image per object
    if (imageMap.has(objectId)) continue;

    const width = parseInt(img.width, 10) || 0;
    const height = parseInt(img.height, 10) || 0;

    imageMap.set(objectId, {
      uuid: img.uuid,
      iiifUrl: img.iiifurl,
      width,
      height,
    });
  }

  // Build search index by joining objects with images
  const index: NgaIndexEntry[] = [];

  for (const obj of objects) {
    const img = imageMap.get(obj.objectid);
    if (!img) continue; // No primary image

    // Filter for printable size
    if (Math.max(img.width, img.height) < MIN_PRINT_PX) continue;

    const accessionNumber = obj.accessionnum || "";
    if (!accessionNumber) continue;

    index.push({
      objectId: parseInt(obj.objectid, 10),
      accessionNumber,
      title: obj.title || "Untitled",
      artist: obj.attribution || "Unknown Artist",
      classification: obj.classification || "",
      iiifBaseUrl: img.iiifUrl,
      imageWidth: img.width,
      imageHeight: img.height,
    });
  }

  console.log(
    `NGA: Index built in ${Date.now() - start}ms — ${index.length} printable works with images`
  );

  return index;
}

/**
 * Load the NGA data index, downloading and parsing CSVs on first call.
 * Cached for the server lifecycle.
 */
export async function loadNgaData(): Promise<NgaIndexEntry[]> {
  if (cachedIndex) return cachedIndex;

  // Prevent duplicate downloads during concurrent requests
  if (!loadingPromise) {
    loadingPromise = buildIndex().then((index) => {
      cachedIndex = index;
      loadingPromise = null;
      return index;
    });
  }

  return loadingPromise;
}

// ─── Search ─────────────────────────────────────────────────

export async function searchNga(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<NgaSearchResponse> {
  const index = await loadNgaData();
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Match entries where all terms appear in title or artist
  const matches = index.filter((entry) => {
    const searchText = `${entry.title} ${entry.artist}`.toLowerCase();
    return terms.every((term) => searchText.includes(term));
  });

  const startIdx = (page - 1) * pageSize;
  const items = matches.slice(startIdx, startIdx + pageSize);

  return { total: matches.length, items };
}

// ─── Image Helpers ──────────────────────────────────────────

export function getNgaThumbnailUrl(iiifBaseUrl: string, size = 600): string {
  return `${iiifBaseUrl}/full/!${size},${size}/0/default.jpg`;
}

export function getNgaFullUrl(iiifBaseUrl: string): string {
  return `${iiifBaseUrl}/full/full/0/default.jpg`;
}

/**
 * Fetch the actual max dimensions from the IIIF info.json endpoint.
 * The NGA's published_images.csv reports original scan dimensions which
 * can be much larger than what the IIIF server actually serves.
 * Returns null if the info.json cannot be fetched.
 */
export async function getNgaIiifDimensions(
  iiifBaseUrl: string
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(`${iiifBaseUrl}/info.json`, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const info = await res.json();
    if (info.width && info.height) {
      return { width: info.width, height: info.height };
    }
    return null;
  } catch {
    return null;
  }
}
