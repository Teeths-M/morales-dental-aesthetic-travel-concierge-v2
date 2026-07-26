import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Wifi, ExternalLink, BrainCircuit, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import MemoryBankAdvisoryPanel from '@/components/doctor/MemoryBankAdvisoryPanel';
import PostProcedureCarePanel from '@/components/patient/PostProcedureCarePanel';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const GREEN  = '#22c55e';

const DEMO_TOKEN = 'demo-memorybank-token';

/**
 * This is a diagnostic/demo page, not a patient-facing screen — unlike
 * friendlyError.js's deliberately soft messaging elsewhere in this app, the
 * useful thing here is the raw status + body so a 404 (function not yet
 * Published in Base44) is visibly distinguishable from a real 500.
 */
function describeInvokeError(err) {
  console.error('[MemoryBankDemo]', err);
  const status = err?.response?.status ?? err?.status ?? null;
  const body = err?.response?.data;
  if (status === 404) {
    return 'Not found (404) — Base44 does not recognize this route at all, which is different from "not yet Published" (see DEPLOY_CHECKLIST.md: an unpublished-but-synced function here returns HTTP 200 with an empty body, not a 404). This usually means Base44 has not synced this function from GitHub yet. Check whether it appears BY NAME in Base44 Builder\'s function list — if it is missing there, clicking Publish will not help until the sync catches up.';
  }
  if (body?.error) {
    return `${body.error}${body.incident_code ? ` (incident ${body.incident_code})` : ''}${status ? ` — HTTP ${status}` : ''}`;
  }
  if (status) {
    return `Request failed — HTTP ${status}.`;
  }
  return err?.message || 'Could not reach the server — please try again.';
}

export default function MemoryBankDemo() {
  const [seedState, setSeedState] = useState('idle'); // idle | seeding | seeded | error
  const [seedInfo, setSeedInfo] = useState(null);
  const [seedError, setSeedError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewState, setPreviewState] = useState('idle'); // idle | loading | ok | empty | error
  const [previewError, setPreviewError] = useState(null);

  const seedDemo = async () => {
    setSeedState('seeding');
    setSeedError(null);
    try {
      const res = await base44.functions.invoke('seedMemoryBankDemo', {});
      if (res.__paused) {
        throw new Error('System Pause is on (conserves integration credits) — every backend call, including this one, is being blocked. Resume it from the red banner above, then try again.');
      }
      if (!res.data?.success) {
        const raw = res.data && Object.keys(res.data).length ? JSON.stringify(res.data) : '(empty response)';
        throw new Error(res.data?.error || `Unexpected response ${raw} — this usually means the function isn't published in Base44 yet.`);
      }
      setSeedInfo(res.data);
      setSeedState('seeded');
      setPreview(null);
      setPreviewState('idle');
    } catch (err) {
      setSeedError(describeInvokeError(err));
      setSeedState('error');
    }
  };

  const loadPreview = async () => {
    setPreviewState('loading');
    setPreviewError(null);
    try {
      const res = await base44.functions.invoke('getMemoryBankDemoPreview', {});
      if (res.__paused) {
        throw new Error('System Pause is on (conserves integration credits) — every backend call, including this one, is being blocked. Resume it from the red banner above, then try again.');
      }
      if (!res.data?.success) {
        setPreviewState('empty');
        return;
      }
      setPreview(res.data.case);
      setPreviewState(res.data.case?.medication_schedule?.length ? 'ok' : 'empty');
    } catch (err) {
      setPreviewError(describeInvokeError(err));
      setPreviewState('error');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: DARK, fontFamily: "'SF Pro Display', system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <Link to="/demo" className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: '#64748b' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Demo Hub
          </Link>
          <button
            onClick={seedDemo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: GOLD }}
          >
            <RotateCcw className="w-3 h-3" /> Seed / Reset Demo Data
          </button>
        </div>

        {/* Live demo badge — this one is real, not a client-side simulation */}
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Wifi className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />
          <span className="text-xs font-bold" style={{ color: GREEN }}>Live demo — real backend, seeded data</span>
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>
            Live Demo · Doctor-Verified Completion + Memory Bank
          </p>
          <h1 className="text-2xl font-bold text-white">From "Procedure Complete" to Institutional Memory</h1>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: '#94a3b8' }}>
            When a doctor confirms a procedure is done, M checks it against what was booked, lets the doctor record real medications, and quietly learns an anonymized pattern for next time — never a name, never a raw record, and never applied to a new patient without a doctor's own judgment.
          </p>
        </div>

        {/* Step 1: seed */}
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: GOLD }}>Step 1 — Seed the demo case</p>
          {seedState === 'idle' && (
            <p className="text-sm" style={{ color: '#94a3b8' }}>Click "Seed / Reset Demo Data" above to create a demo patient case and three anonymized past outcomes to match against.</p>
          )}
          {seedState === 'seeding' && (
            <p className="text-sm flex items-center gap-2" style={{ color: '#94a3b8' }}><Loader2 className="w-4 h-4 animate-spin" /> Seeding…</p>
          )}
          {seedState === 'error' && (
            <p className="text-sm text-red-400">{seedError}</p>
          )}
          {seedState === 'seeded' && seedInfo && (
            <div className="space-y-2">
              <p className="text-sm flex items-center gap-2" style={{ color: GREEN }}>
                <CheckCircle2 className="w-4 h-4" /> Seeded 1 demo case and {seedInfo.seeded_outcome_records} anonymized past outcomes.
              </p>
              <a
                href={seedInfo.doctor_portal_path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: GOLD }}
              >
                Open the real Doctor Portal for this case <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs" style={{ color: '#64748b' }}>
                There, use "Procedure Complete" to confirm procedures, add recommended medications, and check the memory bank yourself — everything below reflects the same real backend.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: memory bank recall, doctor's view — reuses the exact doctor-portal component */}
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: GOLD }}>Step 2 — The doctor's view: check the memory bank</p>
          <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
            This is the exact doctor-only panel embedded in the real Stage 11 completion form. It never appears on any patient screen.
          </p>
          {seedState === 'seeded' ? (
            <MemoryBankAdvisoryPanel token={DEMO_TOKEN} />
          ) : (
            <div className="rounded-xl border-2 border-dashed p-5 flex items-center gap-3" style={{ borderColor: BORDER }}>
              <Users className="w-5 h-5" style={{ color: '#475569' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>Seed the demo above first.</p>
            </div>
          )}
        </div>

        {/* Step 3: patient's view — only populates after Stage 11 is completed in the real portal */}
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: GOLD }}>Step 3 — The patient's view: what actually reaches them</p>
          <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
            Memory-bank data never reaches the patient directly — only the doctor's own recommendation for this patient does, once Stage 11 is logged in the real portal above.
          </p>
          <Button
            variant="outline"
            onClick={loadPreview}
            disabled={seedState !== 'seeded' || previewState === 'loading'}
            className="gap-2 mb-3"
            style={{ borderColor: BORDER, color: '#e2e8f0' }}
          >
            {previewState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            Refresh Patient Portal Preview
          </Button>

          {previewState === 'ok' && preview && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl overflow-hidden">
              <PostProcedureCarePanel caseRecord={preview} />
            </motion.div>
          )}
          {previewState === 'empty' && (
            <p className="text-sm" style={{ color: '#64748b' }}>
              Nothing to show yet — complete Stage 11 in the real Doctor Portal above, then refresh this preview.
            </p>
          )}
          {previewState === 'error' && (
            <p className="text-sm text-red-400">{previewError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
