const SPARQL_URL = "https://data.getty.edu/museum/collection/sparql";
const OBJECT_URL = "https://data.getty.edu/museum/collection/object";

// ─── Types ──────────────────────────────────────────────────

export interface GettySearchResult {
  objectId: string; // UUID extracted from URI
  objectUri: string; // Full URI
  label: string; // Title + accession from SPARQL
  artistName: string;
}

export interface GettySearchResponse {
  totalCount: number;
  items: GettySearchResult[];
}

export interface GettyObjectDetail {
  objectId: string; // UUID
  accessionNumber: string;
  title: string;
  artist: string;
  imageUrl: string; // Full IIIF image URL
  isOpenContent: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

// ─── SPARQL Search ──────────────────────────────────────────

function buildSearchQuery(keyword: string, limit: number, offset: number): string {
  const escaped = keyword.replace(/"/g, '\\"').toLowerCase();
  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?object ?label ?artistName WHERE {
  ?object rdf:type crm:E22_Human-Made_Object .
  ?object rdfs:label ?label .
  OPTIONAL {
    ?object crm:P108i_was_produced_by ?production .
    ?production crm:P14_carried_out_by ?artist .
    ?artist rdfs:label ?artistName .
    FILTER(!CONTAINS(?artistName, "("))
  }
  FILTER(CONTAINS(LCASE(?label), "${escaped}"))
}
LIMIT ${limit} OFFSET ${offset}
`;
}

function buildCountQuery(keyword: string): string {
  const escaped = keyword.replace(/"/g, '\\"').toLowerCase();
  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT (COUNT(DISTINCT ?object) AS ?count) WHERE {
  ?object rdf:type crm:E22_Human-Made_Object .
  ?object rdfs:label ?label .
  FILTER(CONTAINS(LCASE(?label), "${escaped}"))
}
`;
}

async function executeSparql(query: string): Promise<Record<string, unknown>> {
  const res = await fetch(SPARQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
    body: `query=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Getty SPARQL error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function extractUuid(uri: string): string {
  return uri.split("/").pop() || "";
}

export async function searchGetty(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<GettySearchResponse> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Run search + count in parallel
  const [searchData, countData] = await Promise.all([
    executeSparql(buildSearchQuery(query, pageSize, offset)),
    executeSparql(buildCountQuery(query)),
  ]);

  const bindings = (searchData as { results?: { bindings?: Record<string, { value: string }>[] } })
    .results?.bindings || [];

  const items: GettySearchResult[] = bindings.map(
    (b: Record<string, { value: string }>) => ({
      objectId: extractUuid(b.object.value),
      objectUri: b.object.value,
      label: b.label?.value || "Untitled",
      artistName: b.artistName?.value || "Unknown Artist",
    })
  );

  const countBindings = (countData as { results?: { bindings?: Record<string, { value: string }>[] } })
    .results?.bindings || [];
  const totalCount = parseInt(countBindings[0]?.count?.value || "0", 10);

  return { totalCount, items };
}

// ─── Object Detail ──────────────────────────────────────────

export async function getGettyObjectDetail(
  uuid: string
): Promise<GettyObjectDetail | null> {
  const res = await fetch(`${OBJECT_URL}/${uuid}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();

  // Extract title (Preferred Term name)
  let title = "Untitled";
  for (const item of data.identified_by || []) {
    if (item.type === "Name") {
      const isPreferred = (item.classified_as || []).some(
        (c: { _label?: string }) => c._label?.includes("Preferred")
      );
      if (isPreferred) {
        title = item.content || title;
        break;
      }
    }
  }
  // Fallback to any Name if no Preferred found
  if (title === "Untitled") {
    for (const item of data.identified_by || []) {
      if (item.type === "Name" && item.content) {
        title = item.content;
        break;
      }
    }
  }

  // Extract accession number
  let accessionNumber = "";
  for (const item of data.identified_by || []) {
    if (item._label === "Accession Number") {
      accessionNumber = item.content || "";
      break;
    }
  }

  // Extract artist
  const artist =
    data.produced_by?.carried_out_by?.[0]?._label || "Unknown Artist";

  // Extract IIIF image URL from representation
  const imageUrl = data.representation?.[0]?.id || "";

  // Check rights (Open Content = CC0)
  let isOpenContent = false;
  for (const st of data.subject_to || []) {
    for (const ca of st.classified_as || []) {
      const id = ca.id || "";
      if (id.includes("creativecommons") && id.includes("publicdomain")) {
        isOpenContent = true;
        break;
      }
    }
    if (isOpenContent) break;
  }

  if (!imageUrl) return null;

  // Fetch image dimensions from IIIF info.json
  const dims = await getGettyImageDimensions(imageUrl);

  return {
    objectId: uuid,
    accessionNumber,
    title,
    artist,
    imageUrl,
    isOpenContent,
    imageWidth: dims?.width,
    imageHeight: dims?.height,
  };
}

// ─── IIIF Helpers ───────────────────────────────────────────

export async function getGettyImageDimensions(
  imageUrl: string
): Promise<{ width: number; height: number } | null> {
  try {
    // imageUrl: https://media.getty.edu/iiif/image/{uuid}/full/full/0/default.jpg
    // info.json: https://media.getty.edu/iiif/image/{uuid}/info.json
    const infoUrl = imageUrl.replace(/\/full\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/, "/info.json");
    const res = await fetch(infoUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return { width: data.width, height: data.height };
  } catch {
    return null;
  }
}

export function getGettyThumbnailUrl(imageUrl: string, width = 600): string {
  // imageUrl is like: https://media.getty.edu/iiif/image/{uuid}/full/full/0/default.jpg
  // Replace /full/full/ with /full/{width},/
  return imageUrl.replace(/\/full\/full\//, `/full/${width},/`);
}

export function getGettyFullUrl(imageUrl: string): string {
  // Ensure the URL uses /full/full/ for max resolution
  return imageUrl.replace(/\/full\/[^/]+\//, "/full/full/");
}
