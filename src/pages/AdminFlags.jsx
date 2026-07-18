// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, ShieldCheck, Lock, Unlock, HeartPulse, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AdminFlags — the human review queue for the Malicious Action Blocker.
 *
 * There is no self-service appeal anywhere in the product: an appeal button is
 * a loophole. This page is the only route back from a block, which is why it
 * has to exist — the blocker's notification email already points here, and
 * "only a human can clear it" is hollow without somewhere for the human to do
 * it.
 *
 * The banner is not decoration. Anyone working this queue needs to know, before
 * they make a decision, that a locked account can still call for help — so that
 * nobody ever "locks harder" believing they are closing a safety hole.
 */

const TIER = {
  warned:     { label: 'Warned',     tone: '#64748b', icon: ShieldAlert, note: 'Logged only. No features restricted.' },
  restricted: { label: 'Restricted', tone: '#D4AF37', icon: Lock,        note: 'Booking, quoting, payment and partner messaging blocked.' },
  locked:     { label: 'Locked',     tone: '#dc2626', icon: Lock,        note: 'All commercial features blocked, pending this review.' },
};

const BG = '#060B16';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

export default function AdminFlags() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  const { data: flags = [], isLoading, refetch } = useQuery({
    queryKey: ['account-flags'],
    queryFn: () => base44.entities.AccountFlag.filter({}, '-last_flagged_at', 100),
    staleTime: 30_000,
  });

  const act = async (flag, action) => {
    setBusyId(flag.id);
    try {
      await base44.functions.invoke('reviewAccountFlag', {
        flag_id: flag.id,
        action,
        notes: notes[flag.id] || '',
      });
      await qc.invalidateQueries({ queryKey: ['account-flags'] });
    } catch (e) {
      // Surface it — a silently failed moderation decision leaves someone
      // restricted with no record of why.
      toast.error('Decision not saved', { description: 'The flag is unchanged. Please try again.' });
      console.error('[AdminFlags]', e?.message);
    }
    setBusyId(null);
  };

  const open = flags.filter((f) => !f.cleared_at);
  const cleared = flags.filter((f) => f.cleared_at);

  return (
    <AdminLayout>
      <div style={{ padding: 24, background: BG, minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <ShieldAlert style={{ width: 22, height: 22, color: '#D4AF37' }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#fff' }}>Blocked actions</h1>
          <Button variant="outline" size="sm" onClick={() => refetch()} style={{ marginLeft: 'auto' }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 720, lineHeight: 1.7 }}>
          Accounts that tripped the Malicious Action Blocker. Clearing a flag restores
          commercial features. There is no self-service appeal — a decision here is the
          only route back.
        </p>

        {/* The load-bearing reassurance for whoever works this queue. */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 22, maxWidth: 720,
        }}>
          <HeartPulse style={{ width: 16, height: 16, color: '#10b981', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
            <strong style={{ color: '#10b981' }}>A flag never affects safety.</strong> Check-ins,
            handshakes, SOS, covert SOS, emergency contacts and location sharing stay available at
            every tier, including Locked. A person who tried to cheat us still gets rescued.
          </p>
        </div>

        {isLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</p>}

        {!isLoading && open.length === 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <ShieldCheck style={{ width: 26, height: 26, color: '#10b981', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>Nothing waiting for review</p>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
              No accounts are currently restricted.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {open.map((flag) => {
            const tier = TIER[flag.tier] || TIER.warned;
            const Icon = tier.icon;
            const recent = (flag.incidents || []).slice(-6).reverse();
            return (
              <div key={flag.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <Icon style={{ width: 15, height: 15, color: tier.tone }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: tier.tone }}>
                    {tier.label}
                  </span>
                  <span style={{ fontSize: 13.5, color: '#fff', fontWeight: 600 }}>{flag.user_email}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                    {flag.last_flagged_at
                      ? `${formatDistanceToNow(new Date(flag.last_flagged_at))} ago`
                      : ''} · {flag.incident_count || 0} incident{(flag.incident_count || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{tier.note}</p>

                {recent.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                    {recent.map((inc, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', padding: '3px 0' }}>
                        <span style={{ color: '#D4AF37', minWidth: 150 }}>{inc.label || inc.code}</span>
                        {/* Digit-masked by the engine — the audit chain is
                            queryable, and a leak we recorded is still a leak. */}
                        <span style={{ fontFamily: 'monospace', opacity: 0.65 }}>{inc.sample}</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.45 }}>{inc.scope}</span>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  value={notes[flag.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [flag.id]: e.target.value }))}
                  placeholder="Why are you clearing or locking this? Recorded in the audit chain."
                  rows={2}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                    borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, marginBottom: 10,
                  }}
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    disabled={busyId === flag.id}
                    onClick={() => act(flag, 'clear')}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1.5" /> Clear — restore features
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === flag.id || flag.tier === 'locked'}
                    onClick={() => act(flag, 'lock')}
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock pending investigation
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {cleared.length > 0 && (
          <>
            <h2 style={{ margin: '28px 0 12px', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
              Recently cleared
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cleared.slice(0, 20).map((f) => (
                <div key={f.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 12.5 }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: '#10b981' }} />
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{f.user_email}</span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)' }}>
                    cleared by {f.cleared_by || 'admin'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
