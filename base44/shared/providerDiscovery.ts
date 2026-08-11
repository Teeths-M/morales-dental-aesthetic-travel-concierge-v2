/**
 * providerDiscovery — dormant web-search adapter, modeled directly on
 * registryLookup.ts's own { supported: boolean, ... } shape.
 *
 * This file has ZERO callers anywhere in the app. It is not granted to
 * M-Care's agent (no tool_configs entry, no m_care.jsonc mention), and it is
 * not wired into any live function — the same way registryLookup.ts itself
 * sat completely unwired until Phase 31 connected it.
 *
 * WHY IT EXISTS LIKE THIS: M-Care's own repeated instruction this session was
 * "no simulated tool execution, no fake search results" — so this cannot
 * pretend to search the open web without a real key. Instead it does exactly
 * what registryLookup.ts already does for an unsupported country: report an
 * honest `{ supported: false, message }` until real infrastructure exists.
 * The moment a SERPER_API_KEY is added as a Base44 secret, searchForProviders
 * starts returning real results with zero further code changes — but nothing
 * here should be wired into a live function or an agent tool grant until that
 * key exists and the real response shape has been verified against Serper's
 * current docs (written without a live key to test against).
 */

export type ProviderSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type ProviderSearchResponse =
  | { supported: false; message: string }
  | { supported: true; source: 'serper'; results: ProviderSearchResult[] };

export async function searchForProviders(query: string): Promise<ProviderSearchResponse> {
  const apiKey = Deno.env.get('SERPER_API_KEY');
  if (!apiKey) {
    return {
      supported: false,
      message: 'No SERPER_API_KEY configured — provider discovery is not live yet. Add a Serper API key as a Base44 secret to activate this.',
    };
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { supported: false, message: `Serper search request failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    const organic = Array.isArray(data?.organic) ? data.organic : [];
    return {
      supported: true,
      source: 'serper',
      results: organic.slice(0, 10).map((r: any) => ({
        title: String(r?.title || ''),
        url: String(r?.link || ''),
        snippet: String(r?.snippet || ''),
      })),
    };
  } catch {
    return { supported: false, message: 'Serper search request failed.' };
  }
}
