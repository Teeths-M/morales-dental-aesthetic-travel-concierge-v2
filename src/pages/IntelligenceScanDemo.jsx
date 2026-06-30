// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle, AlertTriangle, Loader2, RefreshCw, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SCAN_STEPS = [
  { key: 'domain', label: 'Domain Intelligence',   desc: 'Checking domain age & registration history' },
  { key: 'social', label: 'Social Media Presence', desc: 'Verifying profiles across platforms' },
  { key: 'phone',  label: 'Phone Analysis',        desc: 'Analyzing number origin and carrier signals' },
  { key: 'ai',     label: 'AI Web Intelligence',   desc: 'Deep internet reputation analysis' },
];

const RISK_CONFIG = {
  low:    { label: 'LOW RISK',    sub: 'Verified digital presence',         color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  medium: { label: 'MEDIUM RISK', sub: 'Partial presence — admin review',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  high:   { label: 'HIGH RISK',   sub: 'Flagged — held for admin review',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
};

const DOCTORS = [
  {
    id: 'sofia',
    full_name: 'Dr. Sofia Ramirez',
    clinic_name: 'Clínica Dental Riviera',
    clinic_city: 'Cancún', clinic_country: 'Mexico',
    specialty: 'Cosmetic Dentistry & Implants',
    initials: 'SR', avatarColor: '#10b981', delay: 0,
    result: {
      risk_level: 'low', risk_score: 18,
      summary: 'Dr. Sofia Ramirez presents a strong and verifiable digital footprint. The clinic domain registered in 2016 demonstrates an 8-year operational history — highly consistent with a claimed established practice. Active presence across Facebook, Instagram, and TikTok with consistent patient engagement confirms authentic practice activity. The phone number resolves to a registered Mexican landline associated with the clinic address in Cancún. Cross-referencing public web sources returned multiple independent patient testimonials on Google Maps and Yelp, plus two local media features. This profile is consistent with a well-established, reputable dental practice and is cleared for activation.',
      ai_positive_indicators: [
        'Domain age 8+ years confirms long-standing established practice (registered 2016)',
        'All 3 social platforms verified live with active monthly patient engagement',
        'Phone resolves to verified clinic landline — not a mobile or VoIP number',
        'Multiple independent patient reviews found across Google Maps and Yelp',
        'Local media coverage detected on 2 Cancún tourism and health publications',
      ],
      ai_red_flags: [],
      signals: { social_checks: [{ platform: 'Facebook', status: 'active' }, { platform: 'Instagram', status: 'active' }, { platform: 'TikTok', status: 'active' }] },
    },
  },
  {
    id: 'marcus',
    full_name: 'Dr. Marcus Chen',
    clinic_name: 'Centro Médico Internacional',
    clinic_city: 'Bogotá', clinic_country: 'Colombia',
    specialty: 'Oral & Maxillofacial Surgery',
    initials: 'MC', avatarColor: '#f59e0b', delay: 900,
    result: {
      risk_level: 'medium', risk_score: 41,
      summary: 'Dr. Marcus Chen has a partial digital footprint that warrants admin review before activation. The clinic domain was registered 2 years ago — relatively recent for a claimed 10-year practice history. Facebook presence is confirmed active and well-maintained; however, Instagram could not be verified and no TikTok was provided. The phone number resolves as a mobile device rather than a dedicated clinic line — common in the region but a marginal risk signal. Web searches returned fewer than 5 independent third-party mentions of the clinic. The profile is not inherently suspicious, but the gap between claimed experience and verifiable digital history depth merits a manual credential review before activation.',
      ai_positive_indicators: [
        'Facebook page verified active with regular posts and patient interaction',
        'Phone carrier confirmed as a registered Colombian mobile network (Claro CO)',
      ],
      ai_red_flags: [
        'Domain age 2 years is inconsistent with claimed 10+ years of practice experience',
        'Fewer than 5 independent web mentions of the clinic detected across all sources',
        'Instagram handle not found or account inactive — platform presence unconfirmed',
      ],
      signals: { social_checks: [{ platform: 'Facebook', status: 'active' }, { platform: 'Instagram', status: 'not_found' }, { platform: 'TikTok', status: 'not_provided' }] },
    },
  },
  {
    id: 'emmanuel',
    full_name: 'Dr. Emmanuel Okafor',
    clinic_name: 'Lagos Smile Center',
    clinic_city: 'Lagos', clinic_country: 'Nigeria',
    specialty: 'General Dentistry',
    initials: 'EO', avatarColor: '#ef4444', delay: 1800,
    result: {
      risk_level: 'high', risk_score: 78,
      summary: "Dr. Emmanuel Okafor's digital profile presents significant verification concerns across every signal layer. No registered domain was found for the clinic name 'Lagos Smile Center' — the complete absence of any web presence for a claimed established practice is a high-risk indicator. All three social media platforms (Facebook, Instagram, TikTok) returned zero results for the provided handles. Critically, the provided phone number resolves to a VoIP service rather than a geographic carrier — a pattern strongly associated with synthetic or temporary identities used in medical credential fraud. AI web intelligence found zero independent corroboration of this clinic or practitioner across any public web source. This application has been placed on hold and flagged for mandatory admin review before any further processing.",
      ai_positive_indicators: [],
      ai_red_flags: [
        'No domain registration found for claimed clinic name — zero web presence',
        'All 3 social media handles returned zero results on every platform',
        'Phone number resolves to VoIP service — strongly associated with fraud patterns',
        'Zero independent web mentions of clinic or practitioner across all sources',
        'AI credibility score: 0/10 — no corroborating sources detected anywhere',
      ],
      signals: { social_checks: [{ platform: 'Facebook', status: 'not_found' }, { platform: 'Instagram', status: 'not_found' }, { platform: 'TikTok', status: 'not_found' }] },
    },
  },
];

function ScanCard({ doctor, runKey }) {
  const [scanning,  setScanning]  = useState(false);
  const [scanStep,  setScanStep]  = useState(-1);
  const [result,    setResult]    = useState(null);
  const [expanded,  setExpanded]  = useState(false);
  const fired = useRef(false);

  // Reset on replay
  useEffect(() => {
    fired.current = false;
    setScanning(false);
    setScanStep(-1);
    setResult(null);
    setExpanded(false);
  }, [runKey]);

  // Auto-start scan (staggered by delay)
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const outer = setTimeout(async () => {
      setScanning(true);
      for (let i = 0; i < SCAN_STEPS.length; i++) {
        setScanStep(i);
        await new Promise(r => setTimeout(r, 900));
      }
      setScanning(false);
      setScanStep(-1);
      setResult(doctor.result);
    }, doctor.delay);
    return () => clearTimeout(outer);
  }, [runKey]);

  const cfg = result ? RISK_CONFIG[result.risk_level] : null;

  return (
    <div className="rounded-2xl border border-border flex flex-col" style={{ background: '#0C1A1D' }}>
      {/* Doctor header */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: doctor.avatarColor + '22', border: `1.5px solid ${doctor.avatarColor}44`, color: doctor.avatarColor }}
        >
          {doctor.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{doctor.full_name}</p>
          <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
          <p className="text-xs text-muted-foreground">{doctor.clinic_name} · {doctor.clinic_city}, {doctor.clinic_country}</p>
        </div>
        {result && (
          <Badge className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </Badge>
        )}
      </div>

      {/* Scan body */}
      <div className="p-5 flex-1 space-y-4">

        {/* Pre-scan state */}
        {!scanning && !result && (
          <div className="flex items-center justify-center gap-2.5 py-8">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#D4AF37' }} />
            <p className="text-sm text-muted-foreground">Initializing scan…</p>
          </div>
        )}

        {/* Animated scan steps */}
        {scanning && (
          <div className="space-y-2">
            {SCAN_STEPS.map((step, i) => {
              const done   = i < scanStep;
              const active = i === scanStep;
              return (
                <div
                  key={step.key}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                  style={{
                    background: active ? 'rgba(212,175,55,0.07)' : done ? 'rgba(16,185,129,0.05)' : 'transparent',
                    border: active ? '1px solid rgba(212,175,55,0.2)' : done ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)' }}
                  >
                    {done   ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#D4AF37' }} />
                    :          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${done ? 'text-emerald-400' : active ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {active ? step.desc : done ? 'Complete' : 'Waiting…'}
                    </p>
                  </div>
                  {active && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#D4AF37' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Result */}
        {result && cfg && (
          <div className="space-y-3">
            {/* Risk score */}
            <div className="p-4 rounded-xl text-center" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
              <p className="text-xl font-bold mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mb-2.5" style={{ color: cfg.color + '80' }}>{cfg.sub}</p>
              <div className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${result.risk_score}%`, background: cfg.color }} />
                </div>
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{result.risk_score}/100</span>
              </div>
            </div>

            {/* Social presence */}
            <div className="grid grid-cols-3 gap-1.5">
              {result.signals.social_checks.map(s => (
                <div
                  key={s.platform}
                  className="p-2 rounded-lg text-center"
                  style={{
                    background: s.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: s.status === 'active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[9px] font-semibold text-muted-foreground">{s.platform}</p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: s.status === 'active' ? '#10b981' : s.status === 'not_provided' ? '#6b7280' : '#ef4444' }}>
                    {s.status === 'active' ? 'LIVE' : s.status === 'not_provided' ? 'N/A' : 'NOT FOUND'}
                  </p>
                </div>
              ))}
            </div>

            {/* AI Analysis expandable */}
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full text-left p-3 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold tracking-widest text-muted-foreground text-[10px]">AI ANALYSIS</span>
                <span className="text-[10px] underline underline-offset-2" style={{ color: '#D4AF37' }}>{expanded ? 'Hide' : 'Read full report'}</span>
              </div>
              {expanded && (
                <p className="mt-2 text-foreground/80 leading-relaxed text-[11px]">{result.summary}</p>
              )}
            </button>

            {/* Positive signals */}
            {result.ai_positive_indicators.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold tracking-widest text-emerald-400">POSITIVE SIGNALS</p>
                {result.ai_positive_indicators.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-foreground/80">{item}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Red flags */}
            {result.ai_red_flags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold tracking-widest text-red-400">FLAGS DETECTED</p>
                {result.ai_red_flags.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-foreground/80">{item}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Final verdict */}
            <div className="p-3 rounded-xl text-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <p className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                {result.risk_level === 'low'
                  ? '✓ Cleared for Immediate Activation'
                  : result.risk_level === 'medium'
                  ? '⚠ Admin Review Required Before Activation'
                  : '✗ Application Held — Mandatory Admin Review'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntelligenceScanDemo() {
  const [runKey,  setRunKey]  = useState(0);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    setAllDone(false);
    // Last scan starts at 1800ms, 4 steps × 900ms = 3600ms, plus 400ms buffer
    const t = setTimeout(() => setAllDone(true), 1800 + SCAN_STEPS.length * 900 + 400);
    return () => clearTimeout(t);
  }, [runKey]);

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>
      {/* Page header */}
      <div className="border-b border-border" style={{ background: '#0C1A1D' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
                >
                  <Globe className="w-5 h-5" style={{ color: '#D4AF37' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground">SAFE-T 4LIFE™ · LIVE SYSTEM DEMO</p>
                  <h1 className="text-xl font-semibold text-foreground">Internet Intelligence Engine</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Every doctor application triggers an automatic 4-stage scan the moment they submit.
                No admin clicks required. Watch 3 real applications being processed in real time.
              </p>
            </div>
            <Button
              onClick={() => setRunKey(k => k + 1)}
              variant="outline"
              size="sm"
              className="gap-2 flex-shrink-0"
              disabled={!allDone}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replay Demo
            </Button>
          </div>

          {/* Live stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Applications Processed', value: '3',  color: 'var(--foreground)' },
              { label: 'Approved — Low Risk',     value: '1',  color: '#10b981' },
              { label: 'Under Review',             value: '1',  color: '#f59e0b' },
              { label: 'Flagged — High Risk',      value: '1',  color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="p-3.5 rounded-xl" style={{ background: '#060B16', border: '1px solid #2A3F4A' }}>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scan cards grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {DOCTORS.map(doc => (
            <ScanCard key={doc.id + runKey} doctor={doc} runKey={runKey} />
          ))}
        </div>

        {/* How it works callout */}
        <div
          className="mt-8 p-6 rounded-2xl"
          style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">How this works in production</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The moment a doctor submits their signup form, the scan fires automatically in the background —
                checking domain age via RDAP, verifying social handles live, detecting VoIP phone numbers,
                and running an AI web credibility pass. Results appear instantly in the Partner Verification Hub
                with risk level, AI verdict, and full reasoning. HIGH risk applications are held automatically.
                LOW risk doctors are cleared for immediate activation with zero admin delay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
