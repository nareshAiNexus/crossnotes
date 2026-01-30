export interface WikipediaSummary {
  title: string;
  extract: string;
  url?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Fetch a short Wikipedia summary for a query.
 * Uses Wikipedia's OpenSearch endpoint to resolve a title, then the REST summary API.
 *
 * Note: This runs client-side and does not require an API key.
 */
export async function fetchWikipediaSummary(query: string): Promise<WikipediaSummary | null> {
  const q = (query ?? "").trim();
  if (!q) return null;

  // OpenSearch (CORS-friendly with origin=*)
  const openSearchUrl =
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}` +
    `&limit=1&namespace=0&format=json&origin=*`;

  type OpenSearchResponse = [string, string[], string[], string[]];

  let title: string | undefined;
  let pageUrl: string | undefined;

  try {
    const os = await fetchJson<OpenSearchResponse>(openSearchUrl);
    title = os?.[1]?.[0];
    pageUrl = os?.[3]?.[0];
  } catch {
    // ignore
  }

  if (!title) return null;

  // REST summary endpoint
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  type SummaryResponse = {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  try {
    const sum = await fetchJson<SummaryResponse>(summaryUrl);
    const extract = (sum?.extract ?? "").trim();
    if (!extract) return null;

    return {
      title: (sum?.title ?? title).trim(),
      extract,
      url: sum?.content_urls?.desktop?.page ?? pageUrl,
    };
  } catch {
    return null;
  }
}
