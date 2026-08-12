/**
 * providerDiscovery — Tavily-backed web-discovery adapter, modeled on
 * registryLookup.ts's own { supported: boolean, ... } shape.
 *
 * Rewritten from an earlier dormant Serper adapter built the same session —
 * Tavily's free tier (1,000 credits/month, no card required) is the better
 * fit for this project's "keep burn low, no card up front" standard than
 * either Serper (card not required either, but Tavily's response shape is
 * purpose-built for agent/LLM search rather than raw SERP scraping, which
 * matches this use case better) or Brave (free tier now requires a card and
 * bills uncapped by default).
 *
 * Same non-negotiable discipline as every dormant adapter this session: an
 * honest { supported: false, message } when TAVILY_API_KEY is unset or a
 * call fails — never a fabricated or silently-empty "success." A result
 * from this file is a SEARCH HIT, never a verified fact. Callers must run
 * it through identity resolution (providerCandidateMatch.ts), then
 * verification (registryLookup.ts, when a real license number exists), then
 * confidence scoring before treating it as anything more than a lead — see
 * discoverProviderCandidates/entry.ts for the full pipeline.
 *
 * Response shape (`results[].title/url/content/score`) and auth mechanism
 * (Authorization: Bearer <key>, NOT an api_key field in the JSON body) were
 * cross-checked against Tavily's current docs + a second independent source
 * right before this comment was written — an earlier version of this file
 * put api_key in the request body, which is wrong and would have silently
 * 401'd on a real key. Once a real TAVILY_API_KEY exists, Publish this
 * alongside discoverProviderCandidates before adding it to m_care.jsonc's
 * tool_configs — an unpublished tool grant made M-Care go completely silent
 * once already (see CLAUDE.md's Phase 10).
 */

export type ProviderSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: 'tavily';
  relevance: number;
  timestamp: string;
};

export type ProviderSearchResponse =
  | { supported: false; message: string }
  | { supported: true; source: 'tavily'; results: ProviderSearchResult[] };

export async function searchForProviders(query: string): Promise<ProviderSearchResponse> {
  const apiKey = Deno.env.get('TAVILY_API_KEY');
  if (!apiKey) {
    return {
      supported: false,
      message: 'No TAVILY_API_KEY configured — provider discovery is not live yet. Add a Tavily API key as a Base44 secret to activate this.',
    };
  }

  const timestamp = new Date().toISOString();

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: 10,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { supported: false, message: `Tavily search request failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return {
      supported: true,
      source: 'tavily',
      results: results.slice(0, 10).map((r: any) => ({
        title: String(r?.title || ''),
        url: String(r?.url || ''),
        snippet: String(r?.content || ''),
        source: 'tavily' as const,
        relevance: typeof r?.score === 'number' ? r.score : 0,
        timestamp,
      })),
    };
  } catch {
    return { supported: false, message: 'Tavily search request failed.' };
  }
}
