/**
 * openFdaAdapter — real, free access to openFDA (https://api.fda.gov).
 * Free with or without an API key; an optional FDA_API_KEY env var raises
 * the rate limit but is never required for this adapter to function, same
 * honest-optional pattern as pubmedAdapter.ts's NCBI_API_KEY.
 *
 * Two real endpoint families: device 510(k) clearances (searchFdaDevice
 * Clearances) for the monthly full scan, and device/drug enforcement
 * reports — i.e. recalls — (searchFdaRecalls) for both the monthly full
 * scan and the weekly recalls_only check.
 *
 * Always `supported: true` on a successful call (including a call that
 * finds zero matching results — openFDA returns a 404 for "no results",
 * which this adapter treats as a real, valid empty result set, not a
 * failure). `supported: false` only on a genuine network/parse failure.
 */

const OPENFDA_BASE = 'https://api.fda.gov';

export type OpenFdaResult = {
  title: string;
  url: string;
  snippet: string;
  publisher_domain: 'api.fda.gov';
  published_at: string;
  identifier: string;
};

export type OpenFdaSearchResponse =
  | { supported: true; source: 'openfda'; results: OpenFdaResult[] }
  | { supported: false; message: string };

function apiKeyParam(): string {
  const key = Deno.env.get('FDA_API_KEY');
  return key ? `&api_key=${encodeURIComponent(key)}` : '';
}

async function fetchOpenFda(path: string, search: string, maxResults: number): Promise<any[]> {
  const url = `${OPENFDA_BASE}${path}?search=${encodeURIComponent(search)}&limit=${maxResults}${apiKeyParam()}`;
  const res = await fetch(url);
  if (res.status === 404) return []; // openFDA's own "no matching records" shape — a real, valid empty result
  if (!res.ok) throw new Error(`openFDA ${path} ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.results) ? json.results : [];
}

export async function searchFdaDeviceClearances(query: string, maxResults = 8): Promise<OpenFdaSearchResponse> {
  try {
    const items = await fetchOpenFda('/device/510k.json', `device_name:"${query}"`, maxResults);
    const results: OpenFdaResult[] = items.map((item) => ({
      title: `${item.device_name || 'Device'} — FDA 510(k) clearance`,
      url: item.k_number ? `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfPMN/pmn.cfm?ID=${item.k_number}` : OPENFDA_BASE,
      snippet: [item.decision_description, item.decision_date].filter(Boolean).join(' — '),
      publisher_domain: 'api.fda.gov',
      published_at: item.decision_date || '',
      identifier: item.k_number || '',
    }));
    return { supported: true, source: 'openfda', results };
  } catch (e) {
    return { supported: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function searchFdaRecalls(query: string, kind: 'device' | 'drug', maxResults = 8): Promise<OpenFdaSearchResponse> {
  try {
    const path = kind === 'device' ? '/device/enforcement.json' : '/drug/enforcement.json';
    const searchField = kind === 'device' ? 'product_description' : 'product_description';
    const items = await fetchOpenFda(path, `${searchField}:"${query}"`, maxResults);
    const results: OpenFdaResult[] = items.map((item) => ({
      title: `${kind === 'device' ? 'Device' : 'Drug'} recall — ${item.classification || 'Class unknown'}`,
      url: OPENFDA_BASE, // openFDA enforcement records have no individual public URL — the record IS the source
      snippet: [item.product_description, item.reason_for_recall].filter(Boolean).join(' — '),
      publisher_domain: 'api.fda.gov',
      published_at: item.recall_initiation_date || item.report_date || '',
      identifier: item.recall_number || item.event_id || '',
    }));
    return { supported: true, source: 'openfda', results };
  } catch (e) {
    return { supported: false, message: e instanceof Error ? e.message : String(e) };
  }
}
