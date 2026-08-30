import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { emitOpenMcare } from '@/lib/openMcareEvent';
import StatusBadge from '@/components/ui-system/StatusBadge';
import { ExternalLink, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';

/**
 * EvidenceWatch — the patient-facing "Medical Evidence Watch" feed. A calm
 * list of human-reviewed medical/regulatory findings relevant to medical
 * travel — never a diagnosis, never a treatment recommendation, never shown
 * here until an admin has explicitly approved it (getEvidenceWatchFeed only
 * ever returns status:'approved' rows). Public, matching /procedures's own
 * accessibility — a real "what's new in medical research" feed is useful
 * pre-signup trust-building content too, not gated behind an account.
 *
 * Deliberately NOT delivered via JourneyEvent — a general research finding
 * isn't tied to any one traveler's own case/booking, so it lives here as a
 * standalone feed instead, with an M-Care quick-action linking to it.
 */

const STAGE_TEXT = {
  lab_preclinical: 'Early research — not yet a treatment',
  human_study: 'Early research — not yet a treatment',
  clinical_trial_recruiting: 'Clinical trial — availability depends on eligibility',
  trial_completed: 'Clinical trial — availability depends on eligibility',
  regulator_cleared_approved: 'Regulator-approved device — verify local availability',
  commercially_available: 'Regulator-approved device — verify local availability',
  recall_safety_alert: 'Regulator safety alert — read the full advisory',
};

const TIER_LABEL = {
  tier_1: 'Regulator / research authority',
  tier_2: 'Established reporting',
  tier_3: 'Social / discovery lead',
};

function DiscoveryCard({ item }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [handoffSent, setHandoffSent] = useState(false);
  const [handoffSending, setHandoffSending] = useState(false);

  const askMCare = () => {
    emitOpenMcare(
      `Can you explain what "${item.title}" means? It's currently at the "${STAGE_TEXT[item.evidence_stage] || 'under review'}" stage, related to ${item.condition_or_procedure || 'a medical procedure'}.`,
    );
  };

  const discussWithClinician = async () => {
    const email = user?.email || contactEmail.trim();
    if (!email) return;
    setHandoffSending(true);
    await base44.functions
      .invoke('flagIntakeHandoff', {
        user_email: email,
        user_name: user?.full_name,
        reason: `A traveler would like to discuss a Medical Evidence Watch item with a qualified clinician: "${item.title}".`,
      })
      .catch(() => {});
    setHandoffSending(false);
    setHandoffSent(true);
  };

  return (
    <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{item.title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {item.country && item.country !== 'unknown' ? `${item.country} · ` : ''}
            {item.published_at ? format(new Date(item.published_at), 'd MMM yyyy') : (item.retrieved_at ? format(new Date(item.retrieved_at), 'd MMM yyyy') : '')}
          </p>
        </div>
        <StatusBadge status={item.confidence} size="sm" />
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#D4AF37', fontWeight: 600 }}>
        {STAGE_TEXT[item.evidence_stage] || 'Under review — stage not yet determined'}
      </p>
      {item.plain_language_summary && (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          {item.plain_language_summary}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          View evidence {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
        </button>
        <button
          type="button"
          onClick={askMCare}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          Ask M-Care what this means
        </button>
        {!handoffSent && (
          <button
            type="button"
            onClick={discussWithClinician}
            disabled={handoffSending}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: handoffSending ? 'default' : 'pointer' }}
          >
            {handoffSending ? 'Sending…' : 'Discuss with a qualified clinician'}
          </button>
        )}
        {handoffSent && (
          <span style={{ fontSize: 12, color: '#22C55E', padding: '8px 4px' }}>Sent — our care team will follow up.</span>
        )}
      </div>

      {!user?.email && !handoffSent && (
        <input
          type="email"
          placeholder="Your email, so a clinician can follow up…"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          style={{ marginTop: 8, width: '100%', maxWidth: 320, background: 'rgba(255,255,255,0.04)', border: '1px solid #2A3F4A', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12.5, boxSizing: 'border-box' }}
        />
      )}

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {item.study_type && item.study_type !== 'unknown' && (
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              Study: {item.study_type}{item.study_size ? ` · ${item.study_size} participants` : ''}
            </p>
          )}
          {item.identifier && (
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Reference: {item.identifier}</p>
          )}
          {item.limitations_and_unknowns && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
              {item.limitations_and_unknowns}
            </p>
          )}
          {item.availability_by_country?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Availability by country</p>
              {item.availability_by_country.map((a, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{a.country}: {a.status}</p>
              ))}
            </div>
          )}
          <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sources</p>
          {(item.sources || []).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#93C5FD', margin: '4px 0', wordBreak: 'break-word' }}
            >
              <ExternalLink style={{ width: 12, height: 12, flexShrink: 0 }} />
              {s.publisher_domain || s.url} <span style={{ color: 'rgba(255,255,255,0.35)' }}>({TIER_LABEL[s.tier] || 'source'})</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceWatch() {
  const { data, isLoading } = useQuery({
    queryKey: ['evidenceWatchFeed'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEvidenceWatchFeed', {});
      return res?.data?.feed || res?.feed || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const feed = data || [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Newspaper style={{ width: 20, height: 20, color: '#D4AF37' }} />
        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#D4AF37', margin: 0 }}>Medical Evidence Watch</p>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
        What's new in medical research
      </h1>
      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px', lineHeight: 1.5 }}>
        A calm, human-reviewed roundup of new treatments, trials, device approvals, and safety alerts
        relevant to medical travel. Nothing here is a diagnosis or a recommendation — every item shows
        its real evidence stage and sources, and nothing appears until a member of our team has reviewed it.
      </p>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13.5 }}>
          Nothing reviewed yet — check back soon.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {feed.map((item) => (
            <DiscoveryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
