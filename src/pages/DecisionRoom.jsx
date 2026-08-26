import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/ui-system/StatusBadge';
import ConsultationSummary from '@/components/care-team/ConsultationSummary';
import { CheckCircle2 } from 'lucide-react';

/**
 * DecisionRoom — the spec's DecisionRoom module/page. Clinician's plan,
 * cost, risks, alternatives, unanswered questions, and a no-pressure
 * 4-choice next-steps menu, fed by getDecisionRoomSummary.
 * "Meet the real care team. Understand every step. Proceed only when you
 * are confident." — the feature's real trust tagline, used verbatim.
 */
const NEXT_STEPS = [
  { value: 'request_another_consult', label: 'Request another consult' },
  { value: 'ask_a_question', label: 'Ask a question' },
  { value: 'proceed_to_planning', label: 'Proceed to planning' },
  { value: 'not_now', label: 'Not now' },
];

export default function DecisionRoom() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [vc, setVc] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [recorded, setRecorded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vcRes, summaryRes] = await Promise.all([
        base44.entities.VirtualConsultation.get(consultationId),
        base44.functions.invoke('getDecisionRoomSummary', { virtual_consultation_id: consultationId }),
      ]);
      setVc(vcRes);
      setSummary(summaryRes?.data || summaryRes);
    } catch (_) { /* honest empty state below */ }
    setLoading(false);
  }, [consultationId]);

  useEffect(() => { load(); }, [load]);

  const chooseNextStep = async (nextStep) => {
    try {
      const res = await base44.functions.invoke('recordDecisionRoomNextStep', {
        virtual_consultation_id: consultationId,
        next_step: nextStep,
        question_text: nextStep === 'ask_a_question' ? questionText : undefined,
      });
      setRecorded(res?.data || res);
    } catch (_) { /* best-effort */ }
  };

  if (loading) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>Loading your Decision Room…</div>;
  if (!vc || !summary) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>This consultation couldn't be loaded.</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#D4AF37', marginBottom: 6 }}>Decision Room</p>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
        Meet the real care team.
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px' }}>
        Understand every step. Proceed only when you are confident.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <StatusBadge status={summary.risk?.overall_severity || 'monitor'} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Overall risk level for this journey so far</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ConsultationSummary virtualConsultation={vc} />
      </div>

      {summary.risk?.risk_items?.length > 0 && (
        <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Risks & readiness</p>
          {summary.risk.risk_items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < summary.risk.risk_items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, color: '#fff', fontWeight: 600 }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{item.next_step}</p>
              </div>
              <StatusBadge status={item.severity} size="sm" />
            </div>
          ))}
        </div>
      )}
      {summary.risk?.note && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: '-14px 0 24px' }}>{summary.risk.note}</p>
      )}

      {summary.comparison?.length > 0 && (
        <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Other verified options</p>
          {summary.comparison.map((d) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', color: 'rgba(255,255,255,0.7)' }}>
              <span>{d.name} — {d.clinic_city}, {d.clinic_country}</span>
              <span>★ {d.rating || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {summary.unanswered_questions?.length > 0 && (
        <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Unanswered questions</p>
          {summary.unanswered_questions.map((q) => (
            <p key={q.id} style={{ margin: '0 0 8px', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{q.body}</p>
          ))}
        </div>
      )}

      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#fff' }}>What would you like to do next?</p>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>No pressure — pick whatever's right for you.</p>

        {recorded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22C55E', fontSize: 13 }}>
            <CheckCircle2 size="16" /> Got it — we've recorded your choice.
          </div>
        ) : (
          <>
            <textarea
              placeholder="If asking a question, type it here…"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              style={{ width: '100%', minHeight: 60, marginBottom: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid #2A3F4A', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {NEXT_STEPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => chooseNextStep(s.value)}
                  style={{ background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', borderRadius: 10, padding: '10px 16px', fontSize: 12.5, cursor: 'pointer' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
      >
        ← Back to my dashboard
      </button>
    </div>
  );
}
