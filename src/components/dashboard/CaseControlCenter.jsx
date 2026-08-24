import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ChevronDown, ChevronUp, Activity, Eye, Lightbulb, ClipboardList, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import StatusBadge from '@/components/ui-system/StatusBadge';

/**
 * CaseControlCenter — the real "M-Care is working on this" surface: a Risk
 * severity view combining signals that already exist elsewhere in this app
 * (getCaseRiskSummary), and a real Agent Run history a traveler can expand
 * for a one-click Observed -> reasoning -> evidence -> proposed action ->
 * required approval explanation (logAgentRun, RULE 38). Nothing here is
 * synthesized in the frontend — every line comes straight from a real
 * backend record's own fields. Mounted next to CareRoomPanel, matching its
 * dark theme (this section of the dashboard is dark, unlike the light
 * VaultDocumentsPanel/MedicationsPanel further down the app).
 */

const TIER_LABEL = { auto: 'Automatic', needs_consent: 'Needed your OK', human_only: 'Human decision' };

function panelColors() {
  return { bg: 'rgba(255,255,255,0.03)', border: '#2A3F4A', text: '#fff', sub: 'rgba(255,255,255,0.55)', accent: '#D4AF37' };
}

function RiskItemRow({ item, c }) {
  return (
    <div style={{ padding: '10px 0', borderTop: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>{item.label}</span>
        <StatusBadge status={item.severity} size="sm" />
      </div>
      <p style={{ color: c.sub, fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{item.why_it_matters}</p>
      <p style={{ color: c.text, fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{item.next_step}</p>
      {item.deadline && (
        <p style={{ color: c.sub, fontSize: 11, marginTop: 4 }}>By {item.deadline}</p>
      )}
    </div>
  );
}

function RiskSummarySection({ caseId, c }) {
  const { data, isLoading } = useQuery({
    queryKey: ['case-risk-summary', caseId],
    enabled: !!caseId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseRiskSummary', { case_id: caseId }).catch(() => null);
      return res?.data || null;
    },
  });

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, background: c.bg, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.sub, fontSize: 12, fontWeight: 700 }}>
          <ShieldAlert size="13" /> Case Risk Summary
        </div>
        {data?.overall_severity && <StatusBadge status={data.overall_severity} size="sm" />}
      </div>
      {isLoading ? (
        <p style={{ color: c.sub, fontSize: 12, marginTop: 8 }}>Checking...</p>
      ) : !data || data.risk_items.length === 0 ? (
        <p style={{ color: c.sub, fontSize: 12, marginTop: 8 }}>Nothing to check yet.</p>
      ) : (
        <div>
          {data.risk_items.map((item, i) => <RiskItemRow key={i} item={item} c={c} />)}
        </div>
      )}
    </div>
  );
}

function AgentRunRow({ run, c }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${c.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>{run.goal}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={run.outcome} size="sm" />
          {open ? <ChevronUp size="14" color={c.sub} /> : <ChevronDown size="14" color={c.sub} />}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {run.records_checked?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c.accent, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <Eye size="12" /> OBSERVED
              </div>
              {run.records_checked.map((r, i) => (
                <p key={i} style={{ color: c.sub, fontSize: 12, lineHeight: 1.5 }}>{r.purpose}</p>
              ))}
            </div>
          )}
          {run.findings?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c.accent, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <Lightbulb size="12" /> REASONING &amp; EVIDENCE
              </div>
              {run.findings.map((f, i) => (
                <p key={i} style={{ color: c.text, fontSize: 12, lineHeight: 1.5 }}>
                  {f.summary}
                  {f.confidence != null && <span style={{ color: c.sub }}> ({f.confidence}% confidence)</span>}
                  {f.source_url && <span style={{ color: c.sub }}> - {f.source_url}</span>}
                </p>
              ))}
            </div>
          )}
          {(run.actions_taken?.length > 0 || run.actions_proposed?.length > 0) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c.accent, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <ClipboardList size="12" /> PROPOSED ACTION
              </div>
              {(run.actions_taken?.length ? run.actions_taken : run.actions_proposed).map((a, i) => (
                <p key={i} style={{ color: c.text, fontSize: 12, lineHeight: 1.5 }}>
                  {a.description} <span style={{ color: c.sub }}>({TIER_LABEL[a.tier] || a.tier})</span>
                </p>
              ))}
            </div>
          )}
          {run.actions_blocked?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c.accent, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <Lock size="12" /> REQUIRED APPROVAL
              </div>
              {run.actions_blocked.map((a, i) => (
                <p key={i} style={{ color: c.text, fontSize: 12, lineHeight: 1.5 }}>
                  {a.description} <span style={{ color: c.sub }}>- {a.reason}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentRunHistorySection({ caseId, c }) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['agent-runs', caseId],
    enabled: !!caseId,
    staleTime: 30 * 1000,
    queryFn: () => base44.entities.AgentRun.filter({ case_id: caseId }, '-completed_at', 20).catch(() => []),
  });

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, background: c.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.sub, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        <Activity size="13" /> What M-Care Has Checked
      </div>
      {isLoading ? (
        <p style={{ color: c.sub, fontSize: 12, marginTop: 8 }}>Loading...</p>
      ) : runs.length === 0 ? (
        <p style={{ color: c.sub, fontSize: 12, marginTop: 8 }}>Nothing logged yet — ask M-Care to help with something on this case and it'll show up here.</p>
      ) : (
        <div>
          {runs.map((run) => <AgentRunRow key={run.id} run={run} c={c} />)}
        </div>
      )}
    </div>
  );
}

export default function CaseControlCenter({ userEmail }) {
  const { data: caseRecord } = useActiveCaseRecord(userEmail);
  const c = panelColors();

  if (!caseRecord) return null;

  return (
    <div className="mt-6">
      <RiskSummarySection caseId={caseRecord.id} c={c} />
      <AgentRunHistorySection caseId={caseRecord.id} c={c} />
    </div>
  );
}
