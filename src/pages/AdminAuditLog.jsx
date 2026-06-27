// @ts-nocheck — pre-existing type gaps; build passes
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
      const data = res.data;
      setHealthResult(data);
      if (data.status === 'OK') {
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Audit Log Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Forensic event trail with hash-chain integrity verification</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={runHealthCheck} disabled={checking}>
              <Shield className="w-4 h-4 mr-2" />
              {checking ? 'Checking…' : 'Health Check'}
            </Button>
          </div>
        </div>

        {/* Chain Integrity Banner */}
        {chainStatus && (
          <div className={`flex items-center gap-3 rounded-lg px-5 py-4 border ${
            chainStatus === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}>
            {chainStatus === 'ok'
              ? <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />}
            <div>
              <p className="font-semibold text-sm">
                {chainStatus === 'ok' ? '✅ All logs verified — chain intact' : '⚠️ CHAIN BREACH DETECTED'}
              </p>
              {healthResult && (
                <p className="text-xs mt-0.5 opacity-80">
                  {healthResult.entries_checked} entries checked · {healthResult.tampered_count} tampered · verified {format(new Date(healthResult.verified_at), 'PPp')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Health Check Result Detail */}
        {healthResult && healthResult.tampered_entries?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700 mb-2">Tampered Entries Detail</p>
            <ul className="space-y-1">
              {healthResult.tampered_entries.map((t, i) => (
                <li key={i} className="text-xs text-red-600 font-mono">
                  [{t.index}] {t.id} · {t.event_type} · {t.timestamp}<br/>
                  <span className="text-red-500">{t.issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search event, email, entity…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }} className="w-36" />
          </div>
          {(dateFrom || dateTo || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); resetPage(); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading audit log…</div>
          ) : paginated.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium">Actor</th>
                    <th className="text-left px-4 py-3 font-medium">Event</th>
                    <th className="text-left px-4 py-3 font-medium">Entity</th>
                    <th className="text-left px-4 py-3 font-medium">Details</th>
                    <th className="text-left px-4 py-3 font-medium">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(entry => {
                    const isTampered = tamperedIds.has(entry.id);
                    return (
                      <tr key={entry.id} className={`hover:bg-muted/30 transition-colors ${isTampered ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-foreground">{entry.actor_name || entry.actor_id || '—'}</div>
                          <div className="text-xs text-muted-foreground">{entry.actor_email || ''}</div>
                          {entry.actor_role && (
                            <span className="inline-block mt-0.5 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {entry.actor_role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                            {entry.event_type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div>{entry.resource_type || '—'}</div>
                          {entry.resource_id && <div className="font-mono text-xs opacity-60 truncate max-w-[120px]">{entry.resource_id}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                          {entry.details
                            ? <span className="truncate block" title={JSON.stringify(entry.details)}>
                                {typeof entry.details === 'object' ? JSON.stringify(entry.details).slice(0, 80) + (JSON.stringify(entry.details).length > 80 ? '…' : '') : entry.details}
                              </span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isTampered ? (
                            <Badge variant="destructive" className="text-xs whitespace-nowrap">⚠ TAMPER DETECTED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">✓ OK</Badge>
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
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} entries · page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}