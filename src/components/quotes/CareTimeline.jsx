import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, AlertTriangle, ListChecks } from 'lucide-react';

/**
 * CareTimeline — the "shared truth" summary for a Care Room, so nobody has
 * to scroll the raw thread to see what's actually agreed. Deliberately
 * built only from deterministic, already-real facts (CaseRecord fields +
 * QuoteMessage confirmation state) rather than re-summarizing free text —
 * a scanned/guessed summary of a conversation is exactly the kind of
 * unreliable shortcut this app avoids elsewhere.
 *
 * Props: caseRecord (the real CaseRecord object, not just an id).
 */
export default function CareTimeline({ caseRecord, theme = 'light' }) {
  const dark = theme === 'dark';
  const caseId = caseRecord?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ['case-messages', caseId, undefined],
    enabled: !!caseId,
    refetchInterval: 20000,
    queryFn: () => base44.entities.QuoteMessage.filter({ case_id: caseId }, 'created_at', 50).catch(() => []),
  });

  if (!caseRecord) return null;

  const c = dark
    ? { bg: 'rgba(255,255,255,0.03)', border: '#2A3F4A', text: '#fff', sub: 'rgba(255,255,255,0.55)' }
    : { bg: '#f8fafc', border: '#e2e8f0', text: '#0f172a', sub: '#64748b' };

  const confirmations = messages.filter((m) => m.requires_confirmation);
  const conflicts = messages.filter((m) => m.from_party === 'm_care' && m.body?.startsWith('Heads up'));

  const items = [
    { label: 'Doctor confirmed', done: caseRecord.doctor_confirmation_status === 'CONFIRMED' },
    ...(caseRecord.procedures?.length ? [{ label: `Procedure: ${caseRecord.procedures.join(', ')}`, done: true }] : []),
    ...(caseRecord.procedure_date ? [{ label: `Appointment: ${caseRecord.procedure_date}`, done: true }] : []),
    ...confirmations.map((m) => ({
      label: m.body.replace(/\s*Please confirm you understood\.?$/, ''),
      done: !!m.confirmed,
    })),
  ];

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, background: c.bg, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: c.sub, fontSize: 12, fontWeight: 700 }}>
        <ListChecks size="13" /> Care Timeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            {item.done ? (
              <CheckCircle2 size="14" style={{ color: '#4ade80', marginTop: 1, flexShrink: 0 }} />
            ) : (
              <Circle size="14" style={{ color: c.sub, marginTop: 1, flexShrink: 0 }} />
            )}
            <span style={{ color: c.text, fontSize: 12.5, lineHeight: 1.4 }}>{item.label}</span>
          </div>
        ))}
        {conflicts.map((m, i) => (
          <div key={`conflict-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <AlertTriangle size="14" style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0 }} />
            <span style={{ color: c.text, fontSize: 12.5, lineHeight: 1.4 }}>{m.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
