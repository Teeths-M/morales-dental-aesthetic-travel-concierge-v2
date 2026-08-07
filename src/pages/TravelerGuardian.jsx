import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PlaneLanding, BedDouble, Stethoscope, HeartPulse, PlaneTakeoff, Home,
  ShieldCheck, Loader2, AlertCircle, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

const MILESTONE_META = {
  landed:          { label: 'Landed at destination', icon: PlaneLanding },
  arrived_at_hotel:{ label: 'Arrived at hotel',      icon: BedDouble },
  pre_procedure:  { label: 'Pre-procedure check',   icon: Stethoscope },
  post_procedure: { label: 'Post-procedure check',  icon: HeartPulse },
  departure:      { label: 'Departure for home',    icon: PlaneTakeoff },
  home_safe:      { label: 'Home safe',              icon: Home },
};

function StateBadge({ state }) {
  if (state === 'confirmed') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmed</span>;
  if (state === 'escalated') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> Escalated</span>;
  if (state === 'pending') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Clock className="h-3.5 w-3.5" /> Pending</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Not scheduled</span>;
}

export default function TravelerGuardian() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [guardian, setGuardian] = useState(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const cases = await base44.entities.CaseRecord.filter(
        { client_email: user.email },
        '-created_date',
        1,
      );
      const active = cases && cases[0];
      setCaseRecord(active || null);
      if (active) {
        const res = await base44.functions.invoke('getGuardianStatus', { case_id: active.id });
        setGuardian(res?.data || res);
      } else {
        setGuardian(null);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load your journey');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const activate = async () => {
    if (!caseRecord) return;
    setActivating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('activateTravelerGuardian', { case_id: caseRecord.id });
      const data = res?.data || res;
      if (!data || data.error) throw new Error(data?.error || 'Failed to activate');
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to activate Guardian mode');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: DARK }}>
            <ShieldCheck className="h-6 w-6" style={{ color: GOLD }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Traveler Guardian</h1>
            <p className="text-sm text-muted-foreground">
              M-Care watches your journey end-to-end and checks in at every key milestone.
            </p>
          </div>
        </div>

        {!caseRecord ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                You don't have an active journey yet. Start your intake with M-Care and come back here to turn on Guardian mode.
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Your Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{caseRecord.client_name}</span>
                  {caseRecord.procedures?.length > 0 && <> · {caseRecord.procedures.join(', ')}</>}
                  {caseRecord.procedure_date && <> · Procedure {new Date(caseRecord.procedure_date).toLocaleDateString()}</>}
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Milestone Monitoring</CardTitle>
                  {guardian?.active && (
                    <span className="text-xs font-semibold text-emerald-600">
                      {guardian.confirmed_count}/{guardian.total} confirmed
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {guardian?.active && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Guardian mode is active. M-Care will check in at each milestone below.
                  </div>
                )}
                <ol className="space-y-3">
                  {Object.entries(MILESTONE_META).map(([type, meta]) => {
                    const m = guardian?.milestones?.find((x) => x.type === type);
                    const Icon = meta.icon;
                    return (
                      <li key={type} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: m?.state === 'confirmed' ? '#dcfce7' : '#f1f5f9' }}>
                          <Icon className="h-5 w-5" style={{ color: m?.state === 'confirmed' ? '#16a34a' : DARK }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {m?.scheduled_time ? new Date(m.scheduled_time).toLocaleString() : 'Not scheduled yet'}
                          </p>
                        </div>
                        <StateBadge state={m?.state || 'not_scheduled'} />
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-5">
                  <Button onClick={activate} disabled={activating} className="w-full gap-2">
                    {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {activating ? 'Activating…' : guardian?.active ? 'Refresh Milestones' : 'Activate Guardian Mode'}
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Activating schedules the six milestone check-ins for your trip dates and fills any missing ones.
                  </p>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}