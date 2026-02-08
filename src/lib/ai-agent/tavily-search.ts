type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

type TavilyResponse = {
  results: TavilyResult[];
};

type CacheEntry = {
  results: TavilyResult[];
  timestamp: number;
};

const TAVILY_API_URL = "https://api.tavily.com/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESULTS = 3;

const cache = new Map<string, CacheEntry>();

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

export async function searchTavily(
  query: string
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[Tavily] TAVILY_API_KEY not set, skipping web search");
    return [];
  }

  const enrichedQuery = `${query} SRI Ecuador tributario`;
  const cacheKey = enrichedQuery.toLowerCase().trim();

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  // Clean expired entries periodically
  if (cache.size > 50) {
    cleanExpiredCache();
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: enrichedQuery,
        max_results: MAX_RESULTS,
        include_domains: [
          "sri.gob.ec",
          "deloitte.com",
          "kpmg.com",
          "ey.com",
          "pwc.com",
        ],
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("[Tavily] API error:", response.status);
      return [];
    }

    const data: TavilyResponse = await response.json();
    const results = (data.results ?? []).slice(0, MAX_RESULTS);

    // Update cache
    cache.set(cacheKey, { results, timestamp: Date.now() });

    return results;
  } catch (error) {
    console.error("[Tavily] Search failed:", error);
    return [];
  }
}
