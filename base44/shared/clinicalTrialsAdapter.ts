/**
 * clinicalTrialsAdapter — real, free access to the ClinicalTrials.gov API v2
 * (https://clinicaltrials.gov/api/v2/studies). No API key at all, ever, for
 * any caller — unlike PubMed/openFDA there is no optional-key upgrade path
 * because none exists on this API.
 *
 * Always `supported: true` on a successful call; `supported: false` only on
 * a genuine network/parse failure — same honest-failure shape as every
 * other adapter in this repo.
 */

const CTGOV_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export type ClinicalTrialResult = {
  title: string;
  url: string;
  snippet: string;
  publisher_domain: 'clinicaltrials.gov';
  published_at: string;
  identifier: string;
  status: string;
  phase: string;
};

export type ClinicalTrialsSearchResponse =
  | { supported: true; source: 'clinicaltrials'; results: ClinicalTrialResult[] }
  | { supported: false; message: string };

export async function searchClinicalTrials(query: string, maxResults = 8): Promise<ClinicalTrialsSearchResponse> {
  try {
    const url = `${CTGOV_BASE}?query.term=${encodeURIComponent(query)}&pageSize=${maxResults}&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      return { supported: false, message: `ClinicalTrials.gov ${res.status}` };
    }
    const json = await res.json();
    const studies: any[] = Array.isArray(json?.studies) ? json.studies : [];

    const results: ClinicalTrialResult[] = studies.map((study) => {
      const id = study?.protocolSection?.identificationModule || {};
      const status = study?.protocolSection?.statusModule || {};
      const design = study?.protocolSection?.designModule || {};
      const nctId = id.nctId || '';
      const phases: string[] = Array.isArray(design.phases) ? design.phases : [];
      return {
        title: id.briefTitle || nctId || 'Clinical trial',
        url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : CTGOV_BASE,
        snippet: [status.overallStatus, phases.join(', ')].filter(Boolean).join(' — '),
        publisher_domain: 'clinicaltrials.gov',
        published_at: status.studyFirstPostDateStruct?.date || '',
        identifier: nctId,
        status: status.overallStatus || 'unknown',
        phase: phases.join(', ') || 'unknown',
      };
    });

    return { supported: true, source: 'clinicaltrials', results };
  } catch (e) {
    return { supported: false, message: e instanceof Error ? e.message : String(e) };
  }
}
