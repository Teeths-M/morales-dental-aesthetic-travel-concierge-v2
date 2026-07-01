// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Fingerprint, Network, ScanFace, Brain, Globe, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const RISK_CONFIG = {
  low:    { label: 'LOW RISK',    sub: 'Verified digital presence',       color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  medium: { label: 'MEDIUM RISK', sub: 'Partial presence — admin review', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  high:   { label: 'HIGH RISK',   sub: 'Flagged — held for admin review', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
};

function layerColor(level) {
  return level === 'low' ? '#10b981' : level === 'high' ? '#ef4444' : '#f59e0b';
}

function livenessConfig(status) {
  const map = {
    passed:           { color: '#10b981', label: 'PASSED',   bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
    failed:           { color: '#ef4444', label: 'FAILED',   bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
    step_up_required: { color: '#f59e0b', label: 'STEP-UP',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
    pending:          { color: '#6b7280', label: 'PENDING',  bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)' },
  };
  return map[status] || map.pending;
}

export default function IntelligenceScanCard({ doctor, scanSteps, runKey }) {
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(-1);
  const [result,   setResult]   = useState(null);
  const [expanded, setExpanded] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    setScanning(false);
    setScanStep(-1);
    setResult(null);
    setExpanded(false);
  }, [runKey]);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const t = setTimeout(async () => {
      setScanning(true);
      for (let i = 0; i < scanSteps.length; i++) {
        setScanStep(i);
        await new Promise(r => setTimeout(r, 700));
      }
      setScanning(false);
      setScanStep(-1);
      setResult({ internet: doctor.result, fraud: doctor.fraud_result });
    }, doctor.delay);
    return () => clearTimeout(t);
  }, [runKey]);

  const cfg = result ? RISK_CONFIG[result.internet.risk_level] : null;
  const fd  = result?.fraud;

  // Compute defense layer statuses for the compact strip
  const defLayers = result && fd ? (() => {
    const netLvl = fd.signals.network.shared_device >= 3 || fd.signals.network.shared_phone >= 4 ? 'high'
      : fd.signals.network.shared_device >= 1 || fd.signals.network.shared_phone >= 1 || fd.signals.network.shared_address >= 2 ? 'medium' : 'low';
    // Device layer combines fingerprint reuse AND IP intelligence — both feed the same pillar
    const devLvl = (() => {
      const r  = fd.signals.device.reuse_count;
      const ip = fd.signals.ip.label;
      if (r >= 3 || ip === 'vpn_or_tor') return 'high';
      if (r >= 1 || ip === 'datacenter') return 'medium';
      return 'low';
    })();
    const idLvl  = fd.signals.identity.liveness_status === 'failed' ? 'high'
      : fd.signals.identity.liveness_status === 'passed' ? 'low' : 'medium';
    return [
      { key: 'internet', label: 'Internet',  Icon: Globe,        level: result.internet.risk_level },
      { key: 'network',  label: 'Network',   Icon: Network,      level: netLvl },
      { key: 'device',   label: 'Device',    Icon: Fingerprint,  level: devLvl },
      { key: 'identity', label: 'Identity',  Icon: ScanFace,     level: idLvl  },
    ];
  })() : null;

  return (
    <div className="rounded-2xl border border-border flex flex-col" style={{ background: '#0C1A1D' }}>
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: doctor.avatarColor + '22', border: `1.5px solid ${doctor.avatarColor}44`, color: doctor.avatarColor }}>
          {doctor.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{doctor.full_name}</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>{doctor.specialty}</p>
          <p className="text-xs" style={{ color: '#64748b' }}>{doctor.clinic_name} · {doctor.clinic_city}, {doctor.clinic_country}</p>
        </div>
        {result && (
          <Badge className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5"
            style={fd?.fast_track?.status === 'cleared'
              ? { background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)' }
              : { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {fd?.fast_track?.status === 'cleared' ? 'FAST-TRACK CLEARED' : cfg.label}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-4">
        {!scanning && !result && (
          <div className="flex items-center justify-center gap-2.5 py-8">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#D4AF37' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>Initializing scan…</p>
          </div>
        )}

        {/* Animated scan steps */}
        {scanning && (
          <div className="space-y-2">
            {scanSteps.map((step, i) => {
              const done = i < scanStep, active = i === scanStep;
              return (
                <div key={step.key} className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
                  style={{ background: active ? 'rgba(212,175,55,0.07)' : done ? 'rgba(16,185,129,0.05)' : 'transparent', border: active ? '1px solid rgba(212,175,55,0.2)' : done ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)' }}>
                    {done   ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#D4AF37' }} />
                    :          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: done ? '#34d399' : active ? '#f1f5f9' : 'rgba(255,255,255,0.25)' }}>{step.label}</p>
                    <p className="text-[11px]" style={{ color: active ? '#94a3b8' : done ? '#34d399' : 'rgba(255,255,255,0.15)' }}>
                      {active ? step.desc : done ? 'Complete' : 'Waiting…'}
                    </p>
                  </div>
                  {active && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#D4AF37' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Results */}
        {result && cfg && fd && (
          <div className="space-y-3">
            {/* Risk score */}
            <div className="p-4 rounded-xl text-center" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
              <p className="text-xl font-bold mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mb-2.5" style={{ color: cfg.color + '80' }}>{cfg.sub}</p>
              <div className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${result.internet.risk_score}%`, background: cfg.color }} />
                </div>
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{result.internet.risk_score}/100</span>
              </div>
            </div>

            {/* Defense layer strip */}
            <div className="grid grid-cols-4 gap-1.5">
              {defLayers.map(layer => {
                const c = layerColor(layer.level);
                const mark = layer.level === 'low' ? '✓' : layer.level === 'high' ? '✗' : '!';
                return (
                  <div key={layer.key} className="p-2 rounded-lg text-center"
                    style={{ background: c + '10', border: `1px solid ${c}30` }}>
                    <layer.Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: c }} />
                    <p className="text-[8px] font-bold tracking-wide" style={{ color: c }}>{mark} {layer.label.toUpperCase()}</p>
                  </div>
                );
              })}
            </div>

            {/* Social presence */}
            <div className="grid grid-cols-3 gap-1.5">
              {result.internet.signals.social_checks.map(s => (
                <div key={s.platform} className="p-2 rounded-lg text-center"
                  style={{ background: s.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: s.status === 'active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-semibold" style={{ color: '#94a3b8' }}>{s.platform}</p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: s.status === 'active' ? '#10b981' : s.status === 'not_provided' ? '#6b7280' : '#ef4444' }}>
                    {s.status === 'active' ? 'LIVE' : s.status === 'not_provided' ? 'N/A' : 'NOT FOUND'}
                  </p>
                </div>
              ))}
            </div>

            {/* Google */}
            {result.internet.google && (() => {
              const g = result.internet.google;
              const gc = g.status === 'verified' ? '#10b981' : g.status === 'unverified' ? '#f59e0b' : '#ef4444';
              const gl = g.status === 'verified' ? 'VERIFIED' : g.status === 'unverified' ? 'UNVERIFIED' : 'NO LISTING';
              return (
                <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#fff' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#4285F4', lineHeight: 1 }}>G</span>
                      </div>
                      <span className="text-[10px] font-bold tracking-widest" style={{ color: '#64748b' }}>GOOGLE</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: gc, background: gc + '18', border: `1px solid ${gc}30` }}>{gl}</span>
                  </div>
                  {g.rating ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= Math.round(g.rating) ? '#f59e0b' : '#334155', fontSize: 12 }}>★</span>)}</div>
                        <span className="text-xs font-bold" style={{ color: '#f1f5f9' }}>{g.rating}</span>
                        <span className="text-[11px]" style={{ color: '#64748b' }}>({g.review_count} reviews)</span>
                      </div>
                      {g.snippet && <p className="text-[10px] italic" style={{ color: '#94a3b8' }}>{g.snippet}</p>}
                    </>
                  ) : (
                    <p className="text-[11px]" style={{ color: '#ef4444' }}>No Google Business profile found for this clinic.</p>
                  )}
                </div>
              );
            })()}

            {/* Device & Network */}
            <div className="p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-bold tracking-widest" style={{ color: '#64748b' }}>DEVICE & NETWORK INTELLIGENCE</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] mb-0.5" style={{ color: '#475569' }}>DEVICE</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{fd.signals.device.type}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>{fd.signals.device.browser}</p>
                  <p className="text-[9px] mt-1 font-semibold" style={{ color: fd.signals.device.reuse_count > 0 ? '#ef4444' : '#10b981' }}>
                    {fd.signals.device.reuse_count > 0 ? `⚠ Reused ×${fd.signals.device.reuse_count}` : `✓ ${fd.signals.device.fp_label}`}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] mb-0.5" style={{ color: '#475569' }}>IP INTELLIGENCE</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{fd.signals.ip.city || 'Unknown'}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>{fd.signals.ip.country}</p>
                  <p className="text-[9px] mt-1 font-semibold" style={{ color: fd.signals.ip.label === 'residential' ? '#10b981' : fd.signals.ip.label === 'datacenter' ? '#f59e0b' : '#ef4444' }}>
                    {fd.signals.ip.label === 'residential' ? '✓ Residential ISP' : fd.signals.ip.label === 'datacenter' ? '! Datacenter proxy' : '✗ VPN / Tor detected'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Shared Phone',   value: fd.signals.network.shared_phone,   danger: 1 },
                  { label: 'Shared Address', value: fd.signals.network.shared_address,  danger: 2 },
                  { label: 'Shared Device',  value: fd.signals.network.shared_device,   danger: 1 },
                ].map(n => (
                  <div key={n.label} className="p-1.5 rounded-lg text-center"
                    style={{ background: n.value >= n.danger ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)', border: n.value >= n.danger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.1)' }}>
                    <p className="text-[8px]" style={{ color: '#64748b' }}>{n.label}</p>
                    <p className="text-base font-bold" style={{ color: n.value >= n.danger ? '#ef4444' : '#10b981' }}>{n.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Liveness */}
            {(() => {
              const lc = livenessConfig(fd.signals.identity.liveness_status);
              return (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: lc.bg, border: `1px solid ${lc.border}` }}>
                  <ScanFace className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: lc.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[9px] font-bold tracking-widest" style={{ color: '#64748b' }}>LIVENESS VERIFICATION</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: lc.color, background: lc.color + '15', border: `1px solid ${lc.color}30` }}>{lc.label}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: lc.color }}>{fd.signals.identity.detail}</p>
                  </div>
                </div>
              );
            })()}

            {/* XAI Confidence */}
            <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                  <p className="text-[9px] font-bold tracking-widest" style={{ color: '#64748b' }}>XAI CONFIDENCE SCORE</p>
                </div>
                <p className="text-lg font-bold" style={{ color: fd.xai_confidence >= 75 ? '#10b981' : fd.xai_confidence >= 45 ? '#f59e0b' : '#ef4444' }}>
                  {fd.xai_confidence}/100
                </p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{fd.xai_summary}</p>
            </div>

            {/* Internet Intelligence report */}
            <button onClick={() => setExpanded(e => !e)} className="w-full text-left p-3 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <span className="font-bold tracking-widest text-[10px]" style={{ color: '#64748b' }}>INTERNET INTELLIGENCE REPORT</span>
                <span className="text-[10px] underline underline-offset-2" style={{ color: '#D4AF37' }}>{expanded ? 'Hide' : 'Read full report'}</span>
              </div>
              {expanded && <p className="mt-2 leading-relaxed text-[11px]" style={{ color: '#cbd5e1' }}>{result.internet.summary}</p>}
            </button>

            {/* Positive signals */}
            {([...fd.xai_positives, ...result.internet.ai_positive_indicators].length > 0) && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold tracking-widest text-emerald-400">POSITIVE SIGNALS</p>
                {[...fd.xai_positives, ...result.internet.ai_positive_indicators].map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px]" style={{ color: '#cbd5e1' }}>{item}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Red flags */}
            {([...fd.xai_flags, ...result.internet.ai_red_flags].length > 0) && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold tracking-widest text-red-400">FLAGS DETECTED</p>
                {[...fd.xai_flags, ...result.internet.ai_red_flags].map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px]" style={{ color: '#cbd5e1' }}>{item}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Fast-Track Override panel */}
            {fd?.fast_track && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.28)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
                  <p className="text-[9px] font-bold tracking-widest" style={{ color: '#D4AF37' }}>
                    FAST-TRACK OVERRIDE — {fd.fast_track.status.toUpperCase()}
                  </p>
                </div>
                <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: '#94a3b8' }}>{fd.fast_track.reason}</p>
                <p className="text-[9px]" style={{ color: '#64748b' }}>
                  Cleared by {fd.fast_track.cleared_by} · {fd.fast_track.cleared_at}
                </p>
              </div>
            )}

            {/* Verdict */}
            <div className="p-3 rounded-xl text-center"
              style={fd?.fast_track?.status === 'cleared'
                ? { background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }
                : { background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <p className="text-[11px] font-semibold"
                style={{ color: fd?.fast_track?.status === 'cleared' ? '#D4AF37' : cfg.color }}>
                {fd?.fast_track?.status === 'cleared'
                  ? '✓ Fast-Track Cleared — Approved for Activation'
                  : result.internet.risk_level === 'low'    ? '✓ Cleared for Immediate Activation'
                  : result.internet.risk_level === 'medium' ? '⚠ Admin Review Required Before Activation'
                  :                                           '✗ Application Held — Mandatory Admin Review'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
