// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle, AlertTriangle, Clock, RefreshCw, Loader2 } from 'lucide-react';

const RISK = {
  low:    { cls: 'bg-emerald-100 text-emerald-700', label: 'LOW RISK' },
  medium: { cls: 'bg-amber-100 text-amber-700',    label: 'MEDIUM RISK' },
  high:   { cls: 'bg-red-100 text-red-700',        label: 'HIGH RISK' },
};

const VERDICT = {
  low:    { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle,  label: 'Recommended' },
  medium: { cls: 'bg-amber-100 text-amber-700',    icon: Clock,         label: 'Review Required' },
  high:   { cls: 'bg-red-100 text-red-700',        icon: AlertTriangle, label: 'Not Recommended' },
};

const SOCIAL_COLOR = { active: '#10b981', not_found: '#ef4444', not_provided: '#6b7280', check_failed: '#6b7280' };
const SOCIAL_LABEL = { active: 'LIVE', not_found: 'NOT FOUND', not_provided: 'N/A', check_failed: 'FAILED' };

const TABS = [
  { key: 'doctor',        label: 'Doctors',  entity: 'Doctor' },
  { key: 'travel_agency', label: 'Travel',   entity: 'TravelAgency' },
  { key: 'taxi',          label: 'Taxi',     entity: 'TaxiService' },
  { key: 'security',      label: 'Security', entity: 'SecurityAgency' },
];

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

function getPartnerName(p) {
  return p.full_name || p.name || p.company_name || '—';
}

function getRescanPayload(p, partnerType) {
  const name = getPartnerName(p);
  return {
    partner_id:       p.id,
    partner_type:     partnerType,
    registered_name:  name,
    clinic_name:      p.clinic_name || p.business_name || name,
    phone:            p.phone || '',
    city:             p.clinic_city || p.city || '',
    country:          p.clinic_country || p.country || '',
    website_url:      p.website_url      || null,
    facebook_handle:  p.social_facebook  || null,
    instagram_handle: p.social_instagram || null,
    tiktok_handle:    p.social_tiktok    || null,
  };
}

export default function PartnerIntelligencePanel() {
  const [activeTab,  setActiveTab]  = useState('doctor');
  const [expanded,   setExpanded]   = useState(null);
  const [rescanning, setRescanning] = useState(null);
  const queryClient = useQueryClient();

  const { data: doctors          = [], isLoading: ld } = useQuery({ queryKey: ['intel-panel', 'doctor'],        queryFn: () => base44.entities.Doctor.list('-created_date', 100),        staleTime: 60_000, enabled: activeTab === 'doctor' });
  const { data: agencies         = [], isLoading: la } = useQuery({ queryKey: ['intel-panel', 'travel_agency'], queryFn: () => base44.entities.TravelAgency.list('-created_date', 100),  staleTime: 60_000, enabled: activeTab === 'travel_agency' });
  const { data: taxiServices     = [], isLoading: lt } = useQuery({ queryKey: ['intel-panel', 'taxi'],          queryFn: () => base44.entities.TaxiService.list('-created_date', 100),   staleTime: 60_000, enabled: activeTab === 'taxi' });
  const { data: securityAgencies = [], isLoading: ls } = useQuery({ queryKey: ['intel-panel', 'security'],      queryFn: () => base44.entities.SecurityAgency.list('-created_date', 100), staleTime: 60_000, enabled: activeTab === 'security' });

  const rescanMutation = useMutation({
    mutationFn: (partner) => base44.functions.invoke('runInternetIntelligence', getRescanPayload(partner, activeTab)),
    onMutate:   (partner) => setRescanning(partner.id),
    onSettled:  () => {
      setRescanning(null);
      queryClient.invalidateQueries({ queryKey: ['intel-panel', activeTab] });
    },
  });

  const allData    = { doctor: doctors, travel_agency: agencies, taxi: taxiServices, security: securityAgencies };
  const loadingMap = { doctor: ld, travel_agency: la, taxi: lt, security: ls };

  const currentPartners = allData[activeTab] || [];
  const loading         = loadingMap[activeTab];
  const tabLabel        = TABS.find(t => t.key === activeTab)?.label ?? 'Partners';

  const scanned = currentPartners
    .filter(p => p.internet_risk_level)
    .sort((a, b) => {
      const ro = (RISK_ORDER[a.internet_risk_level] ?? 3) - (RISK_ORDER[b.internet_risk_level] ?? 3);
      return ro !== 0 ? ro : (b.internet_risk_score ?? 0) - (a.internet_risk_score ?? 0);
    });

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Partner Internet Intelligence
          <Badge className="bg-slate-100 text-slate-600 ml-auto text-xs font-normal">{scanned.length} scanned</Badge>
        </CardTitle>
        <div className="flex border-b border-border mt-3 -mx-6 px-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpanded(null); }}
              className={`px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading {tabLabel.toLowerCase()}…</p>
        ) : !scanned.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No intelligence scans for {tabLabel.toLowerCase()} yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {scanned.map(partner => {
              const rCfg  = RISK[partner.internet_risk_level]    || RISK.medium;
              const vCfg  = VERDICT[partner.internet_risk_level] || VERDICT.medium;
              const VIcon = vCfg.icon;
              const open  = expanded === partner.id;
              return (
                <div key={partner.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{getPartnerName(partner)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {partner.email} · {partner.clinic_country || partner.country || '—'}
                      </p>
                    </div>
                    <Badge className={rCfg.cls}>{rCfg.label}</Badge>
                    <Badge className={vCfg.cls}>
                      <VIcon className="w-3 h-3 mr-1" />
                      {vCfg.label}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                      {partner.internet_risk_score ?? '—'}/100
                    </span>
                    {(() => {
                      const xai = partner.internet_signals?.xai_confidence ?? Math.max(5, 100 - (partner.internet_risk_score ?? 50));
                      const c = xai >= 80 ? '#10b981' : xai >= 40 ? '#f59e0b' : '#ef4444';
                      return <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: c }}>XAI {xai}%</span>;
                    })()}
                    <button
                      onClick={() => setExpanded(open ? null : partner.id)}
                      className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity whitespace-nowrap"
                    >
                      {open ? 'Hide' : 'Why?'}
                    </button>
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0" title="Re-run scan"
                      disabled={rescanning === partner.id}
                      onClick={() => rescanMutation.mutate(partner)}
                    >
                      {rescanning === partner.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {open && partner.internet_summary && (
                    <div className="mt-3 space-y-2">
                      {/* XAI Confidence Score */}
                      {(() => {
                        const xai = partner.internet_signals?.xai_confidence ?? Math.max(5, 100 - (partner.internet_risk_score ?? 50));
                        const flags = partner.internet_signals?.xai_flags || [];
                        const positives = partner.internet_signals?.xai_positives || [];
                        const c = xai >= 80 ? '#10b981' : xai >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div className="p-3 rounded-lg border border-border bg-muted/20">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold tracking-widest text-muted-foreground">XAI CONFIDENCE SCORE</p>
                              <span className="text-sm font-bold" style={{ color: c }}>{xai}/100</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-border/40 mb-2.5">
                              <div className="h-full rounded-full" style={{ width: `${xai}%`, background: c }} />
                            </div>
                            {flags.length > 0 && (
                              <div className="mb-2">
                                {flags.slice(0, 4).map((f, i) => (
                                  <div key={i} className="flex items-start gap-1.5 mb-1">
                                    <span className="text-red-400 flex-shrink-0 text-[10px] mt-0.5">▲</span>
                                    <p className="text-[10px] text-red-300">{f}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {positives.slice(0, 3).map((p, i) => (
                              <div key={i} className="flex items-start gap-1.5 mb-1">
                                <span className="text-emerald-400 flex-shrink-0 text-[10px] mt-0.5">✓</span>
                                <p className="text-[10px] text-emerald-300">{p}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Google listing */}
                      {partner.internet_signals?.google && (() => {
                        const g = partner.internet_signals.google;
                        const gColor = g.status === 'verified' ? '#10b981' : g.status === 'unverified' ? '#f59e0b' : '#ef4444';
                        const gLabel = g.status === 'verified' ? 'VERIFIED' : g.status === 'unverified' ? 'UNVERIFIED' : 'NOT FOUND';
                        return (
                          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#fff' }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: '#4285F4', lineHeight: 1 }}>G</span>
                                </div>
                                <span className="text-[10px] font-bold tracking-widest text-muted-foreground">GOOGLE</span>
                              </div>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: gColor, background: gColor + '18' }}>{gLabel}</span>
                            </div>
                            {g.rating ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex gap-px">{[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= Math.round(g.rating) ? '#f59e0b' : '#64748b', fontSize: 11 }}>★</span>)}</div>
                                <span className="text-xs font-semibold">{g.rating}</span>
                                <span className="text-[11px] text-muted-foreground">({g.review_count} reviews)</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-red-400">No Google Business profile found.</p>
                            )}
                            {g.snippet && <p className="text-[10px] italic text-muted-foreground">"{g.snippet}"</p>}
                          </div>
                        );
                      })()}

                      {/* Social presence */}
                      {partner.internet_signals?.social_checks?.length > 0 && (
                        <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                          <p className="text-[10px] font-bold tracking-widest text-muted-foreground">SOCIAL PRESENCE</p>
                          <div className="grid grid-cols-3 gap-2">
                            {partner.internet_signals.social_checks.map(s => (
                              <div key={s.platform} className="text-center p-2 rounded-md"
                                style={{ background: s.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                                <p className="text-[9px] font-semibold text-muted-foreground">{s.platform}</p>
                                <p className="text-[10px] font-bold mt-0.5" style={{ color: SOCIAL_COLOR[s.status] ?? '#6b7280' }}>{SOCIAL_LABEL[s.status] ?? s.status.toUpperCase()}</p>
                              </div>
                            ))}
                          </div>
                          {partner.internet_signals?.website_live !== undefined && (
                            <p className="text-[10px] text-muted-foreground">
                              Website: <span style={{ color: partner.internet_signals.website_live ? '#10b981' : '#ef4444' }}>
                                {partner.internet_signals.website_live ? 'Loads OK' : partner.internet_signals.website_flag ?? 'Not reachable'}
                              </span>
                              {partner.internet_signals.domain_age_months ? ` · Domain age ${partner.internet_signals.domain_age_months}mo` : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* IP Intelligence */}
                      {partner.internet_signals?.ip_label && (
                        <div className="p-3 rounded-lg border border-border bg-muted/20">
                          <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">IP INTELLIGENCE</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              const lbl = partner.internet_signals.ip_label;
                              const c = lbl === 'residential' ? '#10b981' : lbl === 'datacenter' ? '#f59e0b' : '#ef4444';
                              return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ color: c, background: c + '18' }}>{lbl.replace('_', ' ')}</span>;
                            })()}
                            {partner.internet_signals.ip_city && <span className="text-[11px] text-muted-foreground">{partner.internet_signals.ip_city}</span>}
                            {partner.internet_signals.ip_country && <span className="text-[11px] text-muted-foreground">· {partner.internet_signals.ip_country}</span>}
                          </div>
                          {partner.internet_signals.ip_isp && <p className="text-[10px] text-muted-foreground mt-1">{partner.internet_signals.ip_isp}</p>}
                          {partner.internet_signals.ip_country_mismatch && (
                            <p className="text-[10px] text-amber-400 mt-1">IP location does not match registered country</p>
                          )}
                        </div>
                      )}

                      {/* Device Analysis */}
                      {(partner.internet_signals?.ua_browser || partner.internet_signals?.ua_flag) && (
                        <div className="p-3 rounded-lg border border-border bg-muted/20">
                          <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2">DEVICE ANALYSIS</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {partner.internet_signals.ua_flag === 'headless_browser' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-red-300" style={{ background: 'rgba(239,68,68,0.15)' }}>HEADLESS BROWSER DETECTED</span>
                            ) : (
                              <>
                                {partner.internet_signals.ua_browser && <span className="text-[11px] text-muted-foreground">{partner.internet_signals.ua_browser}</span>}
                                {partner.internet_signals.ua_os && <span className="text-[11px] text-muted-foreground">· {partner.internet_signals.ua_os}</span>}
                              </>
                            )}
                            {partner.internet_signals.device_timezone && (
                              <span className="text-[10px] text-muted-foreground">· {partner.internet_signals.device_timezone}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fraud network signal */}
                      {partner.internet_signals?.phone_shared_partners > 0 && (
                        <div className="p-3 rounded-lg border border-red-500/20" style={{ background: 'rgba(239,68,68,0.06)' }}>
                          <p className="text-[10px] font-bold tracking-widest text-red-400 mb-1">FRAUD NETWORK SIGNAL</p>
                          <p className="text-xs text-red-300">
                            Phone number appears on {partner.internet_signals.phone_shared_partners} other partner application{partner.internet_signals.phone_shared_partners > 1 ? 's' : ''}. Admin review required.
                          </p>
                        </div>
                      )}

                      {/* AI analysis */}
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-1.5">AI ANALYSIS</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{partner.internet_summary}</p>
                        {partner.internet_last_checked && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Scanned {new Date(partner.internet_last_checked).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
