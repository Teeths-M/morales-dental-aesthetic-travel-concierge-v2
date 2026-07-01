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
  low:    { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle,   label: 'Recommended' },
  medium: { cls: 'bg-amber-100 text-amber-700',    icon: Clock,          label: 'Review Required' },
  high:   { cls: 'bg-red-100 text-red-700',        icon: AlertTriangle,  label: 'Not Recommended' },
};

const SOCIAL_COLOR = { active: '#10b981', not_found: '#ef4444', not_provided: '#6b7280', check_failed: '#6b7280' };
const SOCIAL_LABEL = { active: 'LIVE', not_found: 'NOT FOUND', not_provided: 'N/A', check_failed: 'FAILED' };

export default function PartnerIntelligencePanel() {
  const [expanded,  setExpanded]  = useState(null);
  const [rescanning, setRescanning] = useState(null);
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors-intel-panel'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 100),
    staleTime: 60_000,
  });

  const rescanMutation = useMutation({
    mutationFn: (doc) => base44.functions.invoke('runInternetIntelligence', {
      partner_id:      doc.id,
      partner_type:    'doctor',
      registered_name: doc.full_name,
      clinic_name:     doc.clinic_name    || '',
      phone:           doc.phone          || '',
      city:            doc.clinic_city    || '',
      country:         doc.clinic_country || '',
      website_url:     doc.website_url    || null,
      facebook_handle: doc.social_facebook  || null,
      instagram_handle: doc.social_instagram || null,
      tiktok_handle:   doc.social_tiktok   || null,
    }),
    onMutate: (doc) => setRescanning(doc.id),
    onSettled: () => {
      setRescanning(null);
      queryClient.invalidateQueries({ queryKey: ['doctors-intel-panel'] });
    },
  });

  // Sort: high risk first, then medium, then low; secondary sort by score desc
  const RISK_ORDER = { high: 0, medium: 1, low: 2 };
  const scanned = doctors
    .filter(d => d.internet_risk_level)
    .sort((a, b) => {
      const ro = (RISK_ORDER[a.internet_risk_level] ?? 3) - (RISK_ORDER[b.internet_risk_level] ?? 3);
      return ro !== 0 ? ro : (b.internet_risk_score ?? 0) - (a.internet_risk_score ?? 0);
    });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">Loading doctor intelligence…</CardContent>
      </Card>
    );
  }

  if (!scanned.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Doctor Internet Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground py-4 text-center">
          No intelligence scans completed yet. Scans run automatically when a doctor completes signup.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Doctor Internet Intelligence
          <Badge className="bg-slate-100 text-slate-600 ml-auto text-xs font-normal">{scanned.length} scanned</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {scanned.map(doc => {
            const rCfg = RISK[doc.internet_risk_level]    || RISK.medium;
            const vCfg = VERDICT[doc.internet_risk_level] || VERDICT.medium;
            const VIcon = vCfg.icon;
            const open = expanded === doc.id;
            return (
              <div key={doc.id} className="px-5 py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.email} · {doc.clinic_country}</p>
                  </div>
                  <Badge className={rCfg.cls}>{rCfg.label}</Badge>
                  <Badge className={vCfg.cls}>
                    <VIcon className="w-3 h-3 mr-1" />
                    {vCfg.label}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                    {doc.internet_risk_score ?? '—'}/100
                  </span>
                  <button
                    onClick={() => setExpanded(open ? null : doc.id)}
                    className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity whitespace-nowrap"
                  >
                    {open ? 'Hide' : 'Why?'}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="Re-run scan"
                    disabled={rescanning === doc.id}
                    onClick={() => rescanMutation.mutate(doc)}
                  >
                    {rescanning === doc.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {open && doc.internet_summary && (
                  <div className="mt-3 space-y-2">
                    {/* Google listing */}
                    {doc.internet_signals?.google && (() => {
                      const g = doc.internet_signals.google;
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
                    {/* Social checks */}
                    {doc.internet_signals?.social_checks?.length > 0 && (
                      <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                        <p className="text-[10px] font-bold tracking-widest text-muted-foreground">SOCIAL PRESENCE</p>
                        <div className="grid grid-cols-3 gap-2">
                          {doc.internet_signals.social_checks.map(s => (
                            <div key={s.platform} className="text-center p-2 rounded-md" style={{ background: s.status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                              <p className="text-[9px] font-semibold text-muted-foreground">{s.platform}</p>
                              <p className="text-[10px] font-bold mt-0.5" style={{ color: SOCIAL_COLOR[s.status] ?? '#6b7280' }}>{SOCIAL_LABEL[s.status] ?? s.status.toUpperCase()}</p>
                            </div>
                          ))}
                        </div>
                        {doc.internet_signals?.website_live !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            Website: <span style={{ color: doc.internet_signals.website_live ? '#10b981' : '#ef4444' }}>{doc.internet_signals.website_live ? 'Loads OK' : doc.internet_signals.website_flag ?? 'Not reachable'}</span>
                            {doc.internet_signals.domain_age_months ? ` · Domain age ${doc.internet_signals.domain_age_months}mo` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {/* AI analysis */}
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-1.5">AI ANALYSIS</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{doc.internet_summary}</p>
                      {doc.internet_last_checked && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Scanned {new Date(doc.internet_last_checked).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
