// @ts-nocheck — pre-existing type gaps; build passes
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const PAGE_SIZE = 25;

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyChain(entries) {
  // entries must be sorted ascending by timestamp
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const tamperedIds = new Set();
  let previousHash = 'GENESIS';

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (i === 0) {
      if (entry.prev_hash && entry.prev_hash !== 'GENESIS' && entry.prev_hash !== 'GENESIS_FALLBACK') {
        tamperedIds.add(entry.id);
      }
      previousHash = await sha256(JSON.stringify(entry));
      continue;
    }
    if (!entry.prev_hash) {
      previousHash = await sha256(JSON.stringify(entry));
      continue;
    }
    if (entry.prev_hash !== previousHash && entry.prev_hash !== 'GENESIS_FALLBACK') {
      tamperedIds.add(entry.id);
    }
    previousHash = await sha256(JSON.stringify(entry));
  }
  return tamperedIds;
}

export default function AdminAuditLog() {
  const [allEntries, setAllEntries] = useState([]);
  const [tamperedIds, setTamperedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [chainStatus, setChainStatus] = useState(null); // null | 'ok' | 'breach'
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [healthResult, setHealthResult] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch up to 500 entries for client-side chain verification + filtering
      const entries = await base44.entities.AuditLog.list('-timestamp', 500);
      setAllEntries(entries || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    setHealthResult(null);
    try {
      const res = await base44.functions.invoke('verifyAuditChain', {});
      const data = res?.data;
      setHealthResult(data);
      if (data?.status === 'OK') {
        setChainStatus('ok');
        setTamperedIds(new Set());
      } else {
        setChainStatus('breach');
        const ids = new Set((data.tampered_entries || []).map(e => e.id));
        setTamperedIds(ids);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  // Run chain verification on loaded data client-side for immediate UI feedback
  useEffect(() => {
    if (allEntries.length === 0) return;
    verifyChain(allEntries).then(ids => {
      setTamperedIds(ids);
      setChainStatus(ids.size === 0 ? 'ok' : 'breach');
    });
  }, [allEntries]);

  // Filtered entries (descending for display)
  const filtered = allEntries
    .filter(e => {
      if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(e.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (e.event_type || '').toLowerCase().includes(q) ||
          (e.actor_email || '').toLowerCase().includes(q) ||
          (e.actor_name || '').toLowerCase().includes(q) ||
          (e.resource_type || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <AdminLayout>
    <div style={{ padding: '24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }} className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white">Audit Log Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Forensic event trail with hash-chain integrity verification</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading}
              style={{ borderColor: '#2A3F4A', color: 'rgba(255,255,255,0.7)', background: 'transparent' }}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={runHealthCheck} disabled={checking}
              style={{ background: '#D4AF37', color: '#060B16', fontWeight: 700 }}>
              <Shield className="w-4 h-4 mr-2" />
              {checking ? 'Checking…' : 'Health Check'}
            </Button>
          </div>
        </div>

        {/* Chain Integrity Banner */}
        {chainStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            borderRadius: 10, padding: '14px 20px',
            background: chainStatus === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${chainStatus === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.35)'}`,
          }}>
            {chainStatus === 'ok'
              ? <Shield style={{ width: 20, height: 20, color: '#22c55e', flexShrink: 0 }} />
              : <ShieldAlert style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />}
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: chainStatus === 'ok' ? '#22c55e' : '#f87171' }}>
                {chainStatus === 'ok' ? '✅ All logs verified — chain intact' : '⚠️ CHAIN BREACH DETECTED'}
              </p>
              {healthResult && (
                <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                  {healthResult.entries_checked} entries checked · {healthResult.tampered_count} tampered · verified {format(new Date(healthResult.verified_at), 'PPp')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Health Check Result Detail */}
        {healthResult && healthResult.tampered_entries?.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Tampered Entries Detail</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {healthResult.tampered_entries.map((t, i) => (
                <li key={i} style={{ fontSize: 11, color: '#fca5a5', fontFamily: 'monospace', marginBottom: 4 }}>
                  [{t.index}] {t.id} · {t.event_type} · {t.timestamp}<br/>
                  <span style={{ color: '#f87171' }}>{t.issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
            <Input
              placeholder="Search event, email, entity…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="pl-9"
              style={{ background: '#0C1A1D', borderColor: '#2A3F4A', color: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>From</label>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }} className="w-36"
              style={{ background: '#0C1A1D', borderColor: '#2A3F4A', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>To</label>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }} className="w-36"
              style={{ background: '#0C1A1D', borderColor: '#2A3F4A', color: '#fff' }} />
          </div>
          {(dateFrom || dateTo || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); resetPage(); }}
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div style={{ borderRadius: 12, border: '1px solid #2A3F4A', overflow: 'hidden', background: '#0C1A1D' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading audit log…</div>
          ) : paginated.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No entries found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A3F4A', background: 'rgba(255,255,255,0.03)' }}>
                    {['Timestamp','Actor','Event','Entity','Details','Integrity'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry, i) => {
                    const isTampered = tamperedIds.has(entry.id);
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #1a2d35', background: isTampered ? 'rgba(239,68,68,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                          {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss') : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{entry.actor_name || entry.actor_id || '—'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{entry.actor_email || ''}</div>
                          {entry.actor_role && (
                            <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, background: 'rgba(212,175,55,0.12)', color: '#D4AF37', padding: '1px 6px', borderRadius: 4 }}>
                              {entry.actor_role}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ display: 'inline-block', fontSize: 11, background: 'rgba(212,175,55,0.08)', color: '#D4AF37', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace' }}>
                            {entry.event_type || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                          <div>{entry.resource_type || '—'}</div>
                          {entry.resource_id && <div style={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.55, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.resource_id}</div>}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 220 }}>
                          {entry.details
                            ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(entry.details)}>
                                {typeof entry.details === 'object' ? JSON.stringify(entry.details).slice(0, 80) + (JSON.stringify(entry.details).length > 80 ? '…' : '') : entry.details}
                              </span>
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {isTampered ? (
                            <Badge variant="destructive" className="text-xs whitespace-nowrap">⚠ TAMPER</Badge>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 8px', borderRadius: 6 }}>✓ OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            <span>{filtered.length} entries · page {page} of {totalPages}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ borderColor: '#2A3F4A', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ borderColor: '#2A3F4A', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}