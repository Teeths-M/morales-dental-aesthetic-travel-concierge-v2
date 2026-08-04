const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// Scores available doctors by procedure match, experience, and location fit.
// Extracted from autoReassignDoctorOnDecline so every auto-backup path (the
// WorkflowEvent-based decline reassignment and the CaseRecord-based SLA/decline/
// withdraw backup in findDoctorBackup.ts) shares one real implementation
// instead of two copies that can silently drift apart.
export async function pickBestDoctor(doctors: Record<string, unknown>[], procedure: string): Promise<Record<string, unknown>> {
  if (!ANTHROPIC_KEY || doctors.length <= 1) return doctors[0];
  const summary = doctors.slice(0, 10)
    .map((d, i) => `${i}: ${d.full_name} | ${d.clinic_city}, ${d.clinic_country} | ${d.years_experience}yrs exp | ${d.rating}★`)
    .join('\n');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 10, messages: [{ role: 'user', content: `Patient needs: "${procedure}". Which doctor index (0-${Math.min(doctors.length - 1, 9)}) is the best fit? Reply with a single digit only.\n${summary}` }] }),
    });
    if (!r.ok) return doctors[0];
    const d = await r.json();
    const idx = parseInt((d.content?.[0]?.text || '').trim(), 10);
    return (Number.isFinite(idx) && idx >= 0 && idx < doctors.length) ? doctors[idx] : doctors[0];
  } catch { return doctors[0]; }
}
