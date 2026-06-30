// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

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

export default function PartnerIntelligencePanel() {
  const [expanded, setExpanded] = useState(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors-intel-panel'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 100),
    staleTime: 60_000,
  });

  const scanned = doctors.filter(d => d.internet_risk_level);

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
                </div>
                {open && doc.internet_summary && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground mb-1.5">AI ANALYSIS</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{doc.internet_summary}</p>
                    {doc.internet_last_checked && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Scanned {new Date(doc.internet_last_checked).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
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
