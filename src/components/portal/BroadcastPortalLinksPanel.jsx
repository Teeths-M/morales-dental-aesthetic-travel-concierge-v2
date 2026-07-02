import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Eye, CheckCircle2, AlertCircle, Loader2,
  Stethoscope, Plane, Car, Users, Zap
} from 'lucide-react';

const GROUPS = [
  { id: 'doctors', label: 'Doctors', icon: Stethoscope, color: 'text-blue-600', desc: 'Send portal links to all active doctors' },
  { id: 'travel_agencies', label: 'Travel Agencies', icon: Plane, color: 'text-purple-600', desc: 'Send portal links to all active travel agencies' },
  { id: 'taxi_services', label: 'Chauffeur / Drivers', icon: Car, color: 'text-orange-600', desc: 'Send portal links to all active chauffeur services' },
  { id: 'patients', label: 'Patients (Pay Now)', icon: Users, color: 'text-green-600', desc: 'Send proposal & payment links to patients with active cases' },
];

export default function BroadcastPortalLinksPanel() {
  const [selected, setSelected] = useState(['doctors', 'travel_agencies', 'taxi_services', 'patients']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dryRun, setDryRun] = useState(true);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleBroadcast = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('broadcastPortalLinks', {
      dry_run: dryRun,
      target_groups: selected,
    });
    setResult(res.data);
    setLoading(false);
  };

  const byType = (type) => result?.details?.sent?.filter(r => r.type === type) || [];
  const failedByType = (type) => result?.details?.failed?.filter(r => r.type === type) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-accent" />
        <h2 className="font-display text-xl text-foreground">Broadcast Portal Links</h2>
        <Badge variant="secondary" className="text-xs">Email + SMS</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Send personalized portal access links to all partners and patients via <strong>both Email and SMS</strong> at once.
        Partners get their direct portal URL; patients get their proposal & payment link.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GROUPS.map(group => {
          const Icon = group.icon;
          const isSelected = selected.includes(group.id);
          return (
            <button
              key={group.id}
              onClick={() => toggle(group.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 bg-card'
              }`}
            >
              <div className={`mt-0.5 ${group.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{group.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{group.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dry run toggle */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
        <Checkbox
          id="dry_run"
          checked={dryRun}
          onCheckedChange={/** @type {any} */(setDryRun)}
        />
        <label htmlFor="dry_run" className="text-sm cursor-pointer">
          <span className="font-semibold text-amber-800">Dry Run (Preview Only)</span>
          <span className="text-amber-700 ml-1">— Emails will send but SMS will be simulated. Uncheck to send real SMS.</span>
        </label>
      </div>

      <Button
        onClick={handleBroadcast}
        disabled={loading || selected.length === 0}
        className="w-full gap-2 h-11 text-base"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Broadcasting...</>
          : dryRun
            ? <><Eye className="w-5 h-5" /> Preview Broadcast</>
            : <><Send className="w-5 h-5" /> Send to All Selected Partners & Patients</>
        }
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-green-700">{result.summary?.total_sent}</p>
              <p className="text-xs text-green-600 mt-1">Sent / Queued</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-red-700">{result.summary?.total_failed}</p>
              <p className="text-xs text-red-600 mt-1">Failed</p>
            </div>
            <div className="bg-muted border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-muted-foreground">{result.summary?.total_skipped}</p>
              <p className="text-xs text-muted-foreground mt-1">Skipped</p>
            </div>
          </div>

          {result.dry_run && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <Eye className="w-4 h-4 shrink-0" />
              Dry run — emails sent, SMS were previewed only.
            </div>
          )}

          {/* Sent details */}
          {result.details?.sent?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Sent Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.details.sent.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{item.type.replace('_', ' ')}</Badge>
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">{item.channel}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed details */}
          {result.details?.failed?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.details.failed.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-red-600 text-xs max-w-[60%] text-right">{item.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}