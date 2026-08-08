// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Search, AlertTriangle, X } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import EmptyState from '@/components/ui-system/EmptyState';
import { formatDateTime, formatCurrency } from '@/lib/format';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const STATUS_META = {
  detected:        { label: 'Detected',        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  rerouting:       { label: 'Rerouting',        color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  resolved:        { label: 'Resolved',         color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  human_escalated: { label: 'Human Escalated',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  failed:          { label: 'Failed',           color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const ACTIVE_STATUSES = new Set(['detected', 'rerouting']);

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: accent || '#fff' }}>{value}</p>
    </div>
  );
}

function resolutionTimeLabel(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function DetailPanel({ reroute, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(520px, 94vw)', height: '100%', background: '#0A1417', borderLeft: `1px solid ${BORDER}`, overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{reroute.original_provider_name || 'Crisis Reroute'}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{reroute.client_name || reroute.client_email || '—'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatusBadge status={reroute.status} />
          {reroute.human_escalated && <Badge variant="destructive" className="text-xs">Human Escalated</Badge>}
          {reroute.timeline_preserved && <span style={{ fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '3px 9px', borderRadius: 999 }}>Timeline Preserved</span>}
          {reroute.patient_consent_received && <span style={{ fontSize: 11, color: GOLD, background: 'rgba(212,175,55,0.1)', padding: '3px 9px', borderRadius: 999 }}>Patient Consented</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Crisis Type</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff' }}>{(reroute.crisis_type || '—').replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Detected By</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff' }}>{reroute.detected_by || '—'}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Detected At</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff' }}>{formatDateTime(reroute.detected_at)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Resolution Time</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff' }}>{resolutionTimeLabel(reroute.resolution_time_seconds)}</p>
          </div>
        </div>

        {reroute.selected_backup_name && (
          <div style={{ marginBottom: 20, padding: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Selected Backup</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#fff', fontWeight: 600 }}>{reroute.selected_backup_name} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>({reroute.selected_backup_type || '—'})</span></p>
            {(reroute.selected_backup_cost_usd || reroute.cost_difference_usd) ? (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {formatCurrency(reroute.selected_backup_cost_usd)}
                {reroute.cost_difference_usd ? ` (${reroute.cost_difference_usd < 0 ? 'saved' : 'added'} ${formatCurrency(Math.abs(reroute.cost_difference_usd))})` : ''}
              </p>
            ) : null}
          </div>
        )}

        {reroute.backup_options_searched?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Backup Options Searched</p>
            {reroute.backup_options_searched.map((opt, i) => (
              <div key={i} style={{ padding: '8px 10px', borderBottom: i < reroute.backup_options_searched.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#fff' }}>{opt.partner_name || opt.partner_id || '—'}</p>
                  {opt.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{opt.reason}</p>}
                </div>
                <span style={{ fontSize: 11, color: opt.available ? '#22C55E' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{opt.available ? 'available' : 'unavailable'}</span>
              </div>
            ))}
          </div>
        )}

        {reroute.patient_message && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Patient Message</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, lineHeight: 1.5 }}>{reroute.patient_message}</p>
          </div>
        )}

        {reroute.stakeholders_notified?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Stakeholders Notified</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {reroute.stakeholders_notified.map((s, i) => (
                <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 999 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {reroute.human_escalated_reason && (
          <div style={{ marginBottom: 20, padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 10, color: '#f87171', textTransform: 'uppercase' }}>Human Escalation Reason</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#fca5a5' }}>{reroute.human_escalated_reason}</p>
          </div>
        )}

        {reroute.audit_log?.length > 0 && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Audit Trail</p>
            {reroute.audit_log.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderLeft: `2px solid ${BORDER}`, paddingLeft: 12, marginLeft: 4 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#fff' }}>{entry.action}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{entry.actor} · {formatDateTime(entry.timestamp)}</p>
                  {entry.notes && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCrisisReroutes() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: reroutes = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin_crisis_reroutes'],
    queryFn: () => base44.entities.CrisisReroute.list('-detected_at', 500),
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const active = reroutes.filter(r => ACTIVE_STATUSES.has(r.status)).length;
    const resolved = reroutes.filter(r => r.status === 'resolved').length;
    const humanEscalated = reroutes.filter(r => r.human_escalated).length;
    const resolvedTimes = reroutes.filter(r => r.resolution_time_seconds > 0).map(r => r.resolution_time_seconds);
    const avgResolution = resolvedTimes.length
      ? resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length
      : 0;
    return { active, resolved, humanEscalated, avgResolution };
  }, [reroutes]);

  const filtered = useMemo(() => {
    return reroutes.filter(r => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' ? !ACTIVE_STATUSES.has(r.status) : r.status !== statusFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (r.client_name || '').toLowerCase().includes(q) ||
          (r.client_email || '').toLowerCase().includes(q) ||
          (r.original_provider_name || '').toLowerCase().includes(q) ||
          (r.crisis_type || '').toLowerCase().includes(q) ||
          (r.case_id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reroutes, search, statusFilter]);

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }} className="space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-display font-semibold text-white">Crisis Reroutes</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Every time M-Care had to intervene in a booking — what broke, what it did, and the outcome.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.7)', background: 'transparent' }}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {!isLoading && !isError && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard label="Active" value={stats.active} accent="#3B82F6" />
              <StatCard label="Resolved" value={stats.resolved} accent="#22C55E" />
              <StatCard label="Human Escalated" value={stats.humanEscalated} accent="#EF4444" />
              <StatCard label="Avg Resolution" value={resolutionTimeLabel(stats.avgResolution)} accent={GOLD} />
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
              <Input
                placeholder="Search patient, provider, crisis type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                style={{ background: CARD, borderColor: BORDER, color: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all', 'active', 'resolved', 'human_escalated', 'failed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${statusFilter === s ? GOLD : BORDER}`,
                    color: statusFilter === s ? GOLD : 'rgba(255,255,255,0.5)',
                    background: statusFilter === s ? 'rgba(212,175,55,0.08)' : 'transparent',
                  }}
                >
                  {s === 'all' ? 'All' : s === 'active' ? 'Active' : (STATUS_META[s]?.label || s)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', background: CARD }}>
            {isLoading ? (
              <div style={{ padding: 20 }}><LoadingState rows={5} variant="table" /></div>
            ) : isError ? (
              <ErrorState message="We couldn't load crisis reroutes. Please try again." onRetry={refetch} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title={reroutes.length === 0 ? 'No crisis reroutes yet' : 'No reroutes match this filter'}
                message={reroutes.length === 0 ? "M-Care hasn't had to intervene in any booking yet — this list fills in the moment it does." : 'Try clearing the search or status filter.'}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)' }}>
                      {['Detected', 'Patient', 'Crisis', 'Provider Affected', 'Status', 'Resolution', 'Cost Impact'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        style={{ borderBottom: '1px solid #1a2d35', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
                      >
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                          {formatDateTime(r.detected_at)}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{r.client_name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.client_email || ''}</div>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                          {(r.crisis_type || '—').replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                          <div>{r.original_provider_name || '—'}</div>
                          {r.original_provider_type && <div style={{ fontSize: 10, opacity: 0.6 }}>{r.original_provider_type}</div>}
                        </td>
                        <td style={{ padding: '10px 16px' }}><StatusBadge status={r.status} /></td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                          {resolutionTimeLabel(r.resolution_time_seconds)}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: r.cost_difference_usd < 0 ? '#22C55E' : r.cost_difference_usd > 0 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                          {r.cost_difference_usd ? `${r.cost_difference_usd < 0 ? '-' : '+'}${formatCurrency(Math.abs(r.cost_difference_usd))}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!isLoading && !isError && filtered.length > 0 && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{filtered.length} of {reroutes.length} reroutes shown · click a row for full detail</p>
          )}
        </div>
      </div>

      {selected && <DetailPanel reroute={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
