import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import SystemHealthHero from '@/components/system-health/SystemHealthHero';
import { DEMO_AUTOMATION_CATEGORIES } from '@/components/system-health/demoHealthData';

/**
 * SystemHealth — a public, honest summary of real operational automation.
 * Reads getSystemHealthSummary (aggregate ReliabilityIncident counts + a
 * real, hand-maintained list of what runs on a schedule). Deliberately no
 * mock/random data anywhere — every number here comes straight from the
 * function's response, matching this app's own standing rule against a
 * "demo" page that overstates what the real system does.
 *
 * 2026-09: gained a live "M-Care is still working" hero visualization
 * (SystemHealthHero) above the original stat tiles/automation list, which
 * stay exactly as they were as supporting real detail. `?demo=1` switches
 * the whole page into a clearly-labeled, fully offline demo mode — the real
 * getSystemHealthSummary query is disabled entirely (no live/slow/network
 * dependency during a pitch), the hero runs its own deterministic client-
 * side simulation, and the real numeric stat tiles are replaced with an
 * explicit "real numbers hidden" note rather than showing simulated numbers
 * that could be mistaken for real ones. The automation category list itself
 * is unaffected either way — those names/descriptions/cadences are static,
 * real facts in both modes (DEMO_AUTOMATION_CATEGORIES is a hand-kept copy
 * of the same 8 entries the real function returns; a redteam invariant
 * checks they stay in sync).
 */
export default function SystemHealth() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';

  const [tabVisible, setTabVisible] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible'
  );
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['systemHealthSummary'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSystemHealthSummary', {});
      return res?.data || res || null;
    },
    enabled: !isDemo,
    staleTime: 30 * 1000,
    refetchInterval: tabVisible && !isDemo ? 60 * 1000 : false,
  });

  const incidents = data?.incidents;
  const automation = isDemo ? DEMO_AUTOMATION_CATEGORIES : (data?.automation || []);
  const healthy = incidents ? incidents.unresolved_critical_or_high === 0 : null;
  const effectiveIsLoading = !isDemo && isLoading;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Activity style={{ width: 20, height: 20, color: '#D4AF37' }} />
        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#D4AF37', margin: 0 }}>
          System Health
        </p>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
        This platform runs itself
      </h1>
      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px', lineHeight: 1.5 }}>
        Real, scheduled automation keeps this platform's data current and its safety checks running
        — not manual button-clicks. Below is a live, honest summary of that automation: what runs,
        how often, and whether anything is currently unresolved.
      </p>

      <SystemHealthHero
        incidents={incidents}
        automation={data?.automation}
        generatedAt={data?.generated_at}
        isLoading={effectiveIsLoading}
        isDemo={isDemo}
      />

      {effectiveIsLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
      ) : (
        <>
          {isDemo ? (
            <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 20, marginBottom: 28 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                Demo mode — real numbers hidden. This view uses simulated data to safely demonstrate
                the pipeline above without touching live platform activity.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
              <div style={{ flex: '1 1 220px', background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {healthy ? (
                    <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E' }} />
                  ) : (
                    <AlertTriangle style={{ width: 18, height: 18, color: '#F59E0B' }} />
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Unresolved critical / high
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: healthy ? '#22C55E' : '#F59E0B' }}>
                  {incidents?.unresolved_critical_or_high ?? '—'}
                </p>
              </div>
              <div style={{ flex: '1 1 220px', background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <RefreshCw style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.5)' }} />
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total incidents, last {data?.window_days || 30} days
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#fff' }}>
                  {incidents?.total ?? '—'}
                </p>
              </div>
            </div>
          )}

          <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
            What runs automatically
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {automation.map((a, i) => (
              <div
                key={i}
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{a.category}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{a.description}</p>
                </div>
                <span
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}
                >
                  {a.cadence}
                </span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 24, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
            {isDemo ? 'Demo mode — timestamp not real.' : `Last updated ${data?.generated_at ? new Date(data.generated_at).toLocaleString() : ''}`}
          </p>
        </>
      )}
    </div>
  );
}
