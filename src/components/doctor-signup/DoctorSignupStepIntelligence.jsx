// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Shield, AlertTriangle, CheckCircle,
  ChevronRight, Loader2, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const RISK_CONFIG = {
  low: {
    label: 'LOW RISK',
    sub: 'Verified digital presence',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
  },
  medium: {
    label: 'MEDIUM RISK',
    sub: 'Partial presence — admin review',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  high: {
    label: 'HIGH RISK',
    sub: 'Flagged — held for admin review',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
};

const SCAN_STEPS = [
  { key: 'domain', label: 'Domain Intelligence',   desc: 'Checking domain age & registration history' },
  { key: 'social', label: 'Social Media Presence', desc: 'Verifying profiles are live across platforms' },
  { key: 'phone',  label: 'Phone Analysis',        desc: 'Analyzing number origin and carrier signals' },
  { key: 'ai',     label: 'AI Web Intelligence',   desc: 'Deep internet reputation analysis' },
];

function AgentLog({ entries }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-3 rounded-xl hover:opacity-80 transition-opacity"
        style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#D4AF37' }}>AGENT DECISION LOG</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
              {entries.length} steps
            </span>
          </div>
          <span className="text-[9px]" style={{ color: '#475569' }}>{open ? '▲ hide' : '▼ show how the agent decided'}</span>
        </div>
      </button>
      {open && (
        <div className="mt-1.5 p-3 rounded-xl space-y-1.5"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(42,63,74,0.7)', fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace" }}>
          {entries.map((entry, i) => {
            const isCritical = entry.startsWith('CRITICAL:');
            const isEscalated = /escalat/i.test(entry) && !isCritical;
            const color = isCritical ? '#fca5a5' : isEscalated ? '#fcd34d' : '#475569';
            return (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#2A3F4A', fontSize: 9, marginTop: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p style={{ color, fontSize: 11, lineHeight: 1.55 }}>{entry}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DoctorSignupStepIntelligence({ doctor, onNext, onSkip }) {
  const [scanning,  setScanning]  = useState(false);
  const [scanStep,  setScanStep]  = useState(-1);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const fired = useRef(false);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    setError('');

    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setScanStep(i);
      await new Promise(r => setTimeout(r, 900));
    }

    try {
      const res = await base44.functions.invoke('runInternetIntelligence', {
        partner_id:       doctor.id,
        partner_type:     'doctor',
        registered_name:  doctor.full_name,
        clinic_name:      doctor.clinic_name    || '',
        phone:            doctor.phone          || '',
        city:             doctor.clinic_city    || '',
        country:          doctor.clinic_country || '',
        website_url:      doctor.website_url       || null,
        facebook_handle:  doctor.social_facebook    || null,
        instagram_handle: doctor.social_instagram   || null,
        tiktok_handle:    doctor.social_tiktok      || null,
        device_timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setResult(res.data);
    } catch (_) {
      setError('Scan encountered a network issue. You can skip and continue — admin will review manually.');
    } finally {
      setScanning(false);
      setScanStep(-1);
    }
  };

  // Auto-start once doctor.id is available
  useEffect(() => {
    if (!fired.current && doctor?.id) {
      fired.current = true;
      runScan();
    }
  }, [doctor?.id]);

  const cfg = result ? RISK_CONFIG[result.risk_level] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <Shield className="w-7 h-7" style={{ color: '#D4AF37' }} />
        </div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: '#f1f5f9' }}>Internet Intelligence Scan</h2>
        <p className="text-sm max-w-sm mx-auto" style={{ color: '#94a3b8' }}>
          Verifying your digital footprint so patients trust you from day one.
        </p>
      </div>

      {/* Pre-scan initialising state (one-frame flash before scanning starts) */}
      {!scanning && !result && !error && (
        <div className="flex items-center justify-center gap-3 py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#D4AF37' }} />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Initializing scan…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="space-y-3">
          <p className="text-sm text-red-400 text-center">{error}</p>
          <Button onClick={runScan} variant="outline" className="w-full">Retry Scan</Button>
          <button
            onClick={onSkip}
            className="w-full text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Skip — admin will review manually
          </button>
        </div>
      )}

      {/* Animated scan progress */}
      {scanning && (
        <div className="space-y-3 py-2">
          {SCAN_STEPS.map((step, i) => {
            const done   = i < scanStep;
            const active = i === scanStep;
            return (
              <div
                key={step.key}
                className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300"
                style={{
                  background: active ? 'rgba(212,175,55,0.07)' : done ? 'rgba(16,185,129,0.05)' : 'transparent',
                  border: active ? '1px solid rgba(212,175,55,0.2)' : done ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)' }}
                >
                  {done
                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                    : active
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#D4AF37' }} />
                    : <div className="w-2 h-2 rounded-full bg-white/20" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: done ? '#34d399' : active ? '#f1f5f9' : 'rgba(255,255,255,0.25)' }}>
                    {step.label}
                  </p>
                  <p className="text-xs truncate" style={{ color: active ? '#94a3b8' : done ? '#34d399' : 'rgba(255,255,255,0.15)' }}>
                    {active ? step.desc : done ? 'Complete' : 'Waiting…'}
                  </p>
                </div>
                {active && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Result card */}
      {result && cfg && (
        <div className="space-y-4">
          {/* Risk badge */}
          <div
            className="p-5 rounded-2xl text-center"
            style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}
          >
            <p className="text-xs font-bold tracking-widest mb-1.5" style={{ color: `${cfg.color}99` }}>
              INTERNET INTELLIGENCE RESULT
            </p>
            <p className="text-3xl font-bold mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="text-sm" style={{ color: `${cfg.color}80` }}>{cfg.sub}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${result.risk_score}%`, background: cfg.color }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                {result.risk_score}/100
              </span>
            </div>
          </div>

          {/* AI narrative */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#64748b' }}>AI ANALYSIS</p>
            <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{result.summary}</p>
          </div>

          {/* Agent Decision Log */}
          {result.agent_reasoning?.length > 0 && (
            <AgentLog entries={result.agent_reasoning} />
          )}

          {/* Positive signals */}
          {result.ai_positive_indicators?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-emerald-400 mb-2">POSITIVE SIGNALS</p>
              <div className="space-y-2">
                {result.ai_positive_indicators.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: '#cbd5e1' }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {result.ai_red_flags?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-red-400 mb-2">FLAGS DETECTED</p>
              <div className="space-y-2">
                {result.ai_red_flags.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: '#cbd5e1' }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social presence grid */}
          {result.signals?.social_checks?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#64748b' }}>SOCIAL PRESENCE</p>
              <div className="grid grid-cols-3 gap-2">
                {result.signals.social_checks.map((s) => (
                  <div
                    key={s.platform}
                    className="p-2.5 rounded-lg text-center"
                    style={{
                      background: s.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                      border: s.status === 'active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <p className="text-[10px] font-semibold" style={{ color: '#64748b' }}>{s.platform}</p>
                    <p
                      className="text-xs font-bold mt-0.5"
                      style={{ color: s.status === 'active' ? '#10b981' : s.status === 'not_provided' ? '#6b7280' : '#ef4444' }}
                    >
                      {s.status === 'active' ? 'LIVE' : s.status === 'not_provided' ? 'N/A' : 'NOT FOUND'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google listing */}
          {result.signals?.google && (() => {
            const g = result.signals.google;
            const gColor = g.status === 'verified' ? '#10b981' : g.status === 'unverified' ? '#f59e0b' : '#ef4444';
            const gLabel = g.status === 'verified' ? 'VERIFIED LISTING' : g.status === 'unverified' ? 'UNVERIFIED' : 'NO LISTING FOUND';
            return (
              <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#fff' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#4285F4', lineHeight: 1 }}>G</span>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: '#64748b' }}>GOOGLE</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: gColor, background: gColor + '18', border: `1px solid ${gColor}30` }}>{gLabel}</span>
                </div>
                {g.rating ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= Math.round(g.rating) ? '#f59e0b' : '#334155', fontSize: 13 }}>★</span>)}</div>
                    <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{g.rating}</span>
                    <span className="text-xs" style={{ color: '#64748b' }}>({g.review_count} reviews)</span>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: '#ef4444' }}>No Google Business profile found for this clinic.</p>
                )}
                {g.snippet && <p className="text-xs italic leading-relaxed" style={{ color: '#94a3b8' }}>"{g.snippet}"</p>}
              </div>
            );
          })()}

          {/* Device & Network Intelligence */}
          {result.signals && (result.signals.ua_browser || result.signals.ip_label || result.signals.phone_shared_partners != null) && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold tracking-widest" style={{ color: '#64748b' }}>DEVICE & NETWORK INTELLIGENCE</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Device */}
                <div>
                  <p className="text-[9px] mb-1" style={{ color: '#475569' }}>DEVICE</p>
                  <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                    {result.signals.ua_browser || 'Unknown'}{result.signals.ua_os ? ` on ${result.signals.ua_os}` : ''}
                  </p>
                  {result.signals.device_timezone && (
                    <p className="text-[10px]" style={{ color: '#64748b' }}>{result.signals.device_timezone}</p>
                  )}
                  <p className="text-[9px] mt-1 font-semibold" style={{ color: result.signals.ua_flag === 'headless_browser' ? '#ef4444' : '#10b981' }}>
                    {result.signals.ua_flag === 'headless_browser' ? '⚠ Headless bot detected' : '✓ Legitimate browser'}
                  </p>
                </div>
                {/* IP Intelligence */}
                <div>
                  <p className="text-[9px] mb-1" style={{ color: '#475569' }}>IP INTELLIGENCE</p>
                  <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                    {result.signals.ip_city || result.signals.ip_country || 'Unknown'}
                  </p>
                  {result.signals.ip_isp && (
                    <p className="text-[10px]" style={{ color: '#64748b' }}>{result.signals.ip_isp}</p>
                  )}
                  <p className="text-[9px] mt-1 font-semibold" style={{
                    color: result.signals.ip_label === 'residential' ? '#10b981'
                         : result.signals.ip_label === 'datacenter' ? '#f59e0b'
                         : '#ef4444'
                  }}>
                    {result.signals.ip_label === 'residential' ? '✓ Residential ISP'
                     : result.signals.ip_label === 'datacenter' ? '! Datacenter proxy'
                     : result.signals.ip_country_mismatch ? '⚠ Country mismatch'
                     : '— No IP data'}
                  </p>
                </div>
              </div>
              {/* Fraud graph metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg text-center"
                  style={{
                    background: (result.signals.phone_shared_partners || 0) > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                    border: (result.signals.phone_shared_partners || 0) > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.1)',
                  }}>
                  <p className="text-[8px]" style={{ color: '#64748b' }}>Shared Phone</p>
                  <p className="text-base font-bold" style={{ color: (result.signals.phone_shared_partners || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {result.signals.phone_shared_partners || 0}
                  </p>
                </div>
                <div className="p-2 rounded-lg text-center"
                  style={{
                    background: result.signals.website_live === false && result.signals.website_provided !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                    border: result.signals.website_live === false && result.signals.website_provided !== false ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.1)',
                  }}>
                  <p className="text-[8px]" style={{ color: '#64748b' }}>Website Live</p>
                  <p className="text-base font-bold" style={{ color: result.signals.website_live ? '#10b981' : result.signals.website_provided === false ? '#6b7280' : '#ef4444' }}>
                    {result.signals.website_live ? '✓' : result.signals.website_provided === false ? '—' : '✗'}
                  </p>
                </div>
                <div className="p-2 rounded-lg text-center"
                  style={{
                    background: result.signals.domain_age_months != null && result.signals.domain_age_months < 6 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                    border: result.signals.domain_age_months != null && result.signals.domain_age_months < 6 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.1)',
                  }}>
                  <p className="text-[8px]" style={{ color: '#64748b' }}>Domain Age</p>
                  <p className="text-base font-bold" style={{ color: result.signals.domain_age_months != null && result.signals.domain_age_months < 6 ? '#ef4444' : '#10b981' }}>
                    {result.signals.domain_age_months != null ? `${result.signals.domain_age_months}mo` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {result.risk_level === 'high' ? (
            <div
              className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <div>
                <p className="text-sm font-semibold text-red-300">Application Held for Review</p>
                <p className="text-xs text-red-300/70 mt-1 leading-relaxed">
                  Your application has been submitted and flagged for admin verification. You'll receive an email within 24–48 hours.
                </p>
              </div>
              <Button className="w-full" onClick={onNext} variant="outline">
                I Understand — Complete Signup
              </Button>
            </div>
          ) : (
            <Button className="w-full font-semibold" onClick={onNext}>
              Continue to Confirmation <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}