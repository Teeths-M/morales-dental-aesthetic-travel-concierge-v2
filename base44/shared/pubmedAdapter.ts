/**
 * pubmedAdapter — real, free, keyless access to PubMed's E-utilities
 * (https://eutils.ncbi.nlm.nih.gov/entrez/eutils/). No account is required
 * to use this at all: 3 requests/second without a key, 10/second with a
 * free optional NCBI API key (NCBI_API_KEY env var, appended when set —
 * never required for this adapter to function).
 *
 * Two real calls per query: esearch.fcgi (title -> PMIDs) then
 * esummary.fcgi (PMIDs -> title/date/journal) — esummary is deliberately
 * used instead of a full efetch, since only lightweight metadata is needed
 * here (the full article body is never stored anywhere in this pipeline).
 *
 * Always `supported: true` on a successful call — this API needs no
 * account, so there's no "unconfigured" state the way a paid-vendor adapter
 * (providerDiscovery.ts's Tavily) has. `supported: false` only on a genuine
 * network/parse failure, matching every other adapter's honest-failure
 * shape in this repo.
 */

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export type PubMedResult = {
  title: string;
  url: string;
  snippet: string;
  publisher_domain: 'pubmed.ncbi.nlm.nih.gov';
  published_at: string;
  identifier: string;
};

export type PubMedSearchResponse =
  | { supported: true; source: 'pubmed'; results: PubMedResult[] }
  | { supported: false; message: string };

function apiKeyParam(): string {
  const key = Deno.env.get('NCBI_API_KEY');
  return key ? `&api_key=${encodeURIComponent(key)}` : '';
}

export async function searchPubMed(query: string, maxResults = 8): Promise<PubMedSearchResponse> {
  try {
    const esearchUrl = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}&term=${encodeURIComponent(query)}${apiKeyParam()}&tool=morales-mcare&email=research@morales-app.example`;
    const esearchRes = await fetch(esearchUrl);
    if (!esearchRes.ok) {
      return { supported: false, message: `PubMed esearch ${esearchRes.status}` };
    }
    const esearchJson = await esearchRes.json();
    const idList: string[] = esearchJson?.esearchresult?.idlist || [];
    if (idList.length === 0) {
      return { supported: true, source: 'pubmed', results: [] };
    }

    const esummaryUrl = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${idList.join(',')}${apiKeyParam()}&tool=morales-mcare&email=research@morales-app.example`;
    const esummaryRes = await fetch(esummaryUrl);
    if (!esummaryRes.ok) {
      return { supported: false, message: `PubMed esummary ${esummaryRes.status}` };
    }
    const esummaryJson = await esummaryRes.json();
    const uids: string[] = esummaryJson?.result?.uids || idList;

    const results: PubMedResult[] = uids.map((uid: string) => {
      const item = esummaryJson?.result?.[uid] || {};
      const title = (item.title || '').toString().replace(/\.$/, '');
      const journal = (item.source || '').toString();
      const pubdate = (item.pubdate || '').toString();
      return {
        title: title || `PubMed article ${uid}`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
        snippet: [journal, pubdate].filter(Boolean).join(' — '),
        publisher_domain: 'pubmed.ncbi.nlm.nih.gov',
        published_at: pubdate,
        identifier: uid,
      };
    });

    return { supported: true, source: 'pubmed', results };
  } catch (e) {
    return { supported: false, message: e instanceof Error ? e.message : String(e) };
  }
}
