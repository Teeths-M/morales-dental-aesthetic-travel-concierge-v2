// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import LastVerified from '@/components/trust/LastVerified';
import SearchSelect from '@/components/ui-system/SearchSelect';
import { COUNTRY_NAMES } from '@/lib/countryDialCodes';
import {
  Building2, Plus, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, X, Download, Bot,
} from 'lucide-react';

/**
 * AdminClinics — onboard clinics and attest their operating status. Attesting
 * refreshes the 'last verified' timestamp that checkClinicStatus reads at the
 * booking gate. Only an 'operating' attestation within the 24h TTL lets a
 * booking proceed once CLINIC_GATE_ENFORCE=true.
 */
const STATUS_STYLE = {
  operating: 'bg-emerald-100 text-emerald-800',
  closed:    'bg-red-100 text-red-800',
  suspended: 'bg-amber-100 text-amber-800',
  unknown:   'bg-slate-100 text-slate-600',
};
const TTL_H = 24;

function isStale(ts) {
  if (!ts) return true;
  return (Date.now() - new Date(ts).getTime()) / 3_600_000 > TTL_H;
}

function AddClinicForm({ onDone, onCancel }) {
  const [f, setF] = useState({ name: '', country: '', city: '', registration_ref: '', operating_status: 'operating', notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.name.trim() || !f.country.trim()) { setErr('Name and country are required.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await base44.functions.invoke('attestClinicStatus', {
        clinic_name: f.name.trim(), country: f.country.trim(), city: f.city.trim(),
        registration_ref: f.registration_ref.trim(), operating_status: f.operating_status,
        notes: f.notes.trim() || undefined,
      });
      if (res?.data?.error) { setErr(res.data.error); setSaving(false); return; }
      onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not save the clinic — please try again.');
      setSaving(false);
    }
  };

  const input = 'w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Add a clinic</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Clinic name *" value={f.name} onChange={set('name')} />
        <SearchSelect boxed value={f.country} onChange={(v) => setF((p) => ({ ...p, country: v }))} options={COUNTRY_NAMES} placeholder="Country *" />
        <input className={input} placeholder="City" value={f.city} onChange={set('city')} />
        <input className={input} placeholder="Operating licence / registration ref" value={f.registration_ref} onChange={set('registration_ref')} />
        <select className={input} value={f.operating_status} onChange={set('operating_status')}>
          <option value="operating">Operating</option>
          <option value="closed">Closed</option>
          <option value="suspended">Suspended</option>
          <option value="unknown">Unknown</option>
        </select>
        <input className={input} placeholder="Notes (optional)" value={f.notes} onChange={set('notes')} />
      </div>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      <div className="flex gap-2 mt-4">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={save}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Add & attest'}
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ClinicCard({ clinic, onDone }) {
  const [busy, setBusy] = useState('');
  const stale = isStale(clinic.status_verified_at) || clinic.operating_status !== 'operating';

  const attest = async (operating_status) => {
    setBusy(operating_status);
    try {
      await base44.functions.invoke('attestClinicStatus', { clinic_id: clinic.id, operating_status });
      onDone();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{clinic.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {[clinic.city, clinic.country].filter(Boolean).join(', ') || '—'}
              {clinic.registration_ref ? ` · ${clinic.registration_ref}` : ''}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <LastVerified timestamp={clinic.status_verified_at} kind="clinic_status" />
              {clinic.status_verified_by && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  {clinic.status_verified_by === 'agent'
                    ? (<><Bot className="w-3 h-3" /> by agent</>)
                    : `by ${clinic.status_verified_by}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[clinic.operating_status] || STATUS_STYLE.unknown}`}>
          {(clinic.operating_status || 'unknown').toUpperCase()}
        </span>
      </div>

      {stale && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          {clinic.operating_status !== 'operating' ? 'Not operating — bookings blocked' : 'Past 24h — re-confirm to keep bookings open'}
        </div>
      )}

      {clinic.status_notes && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
          <Bot className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
          <span>{clinic.status_notes}</span>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!!busy} onClick={() => attest('operating')}>
          <ShieldCheck className="w-4 h-4 mr-1" /> {busy === 'operating' ? 'Confirming…' : 'Confirm operating'}
        </Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => attest('suspended')}>Mark suspended</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => attest('closed')}>Mark closed</Button>
      </div>
    </div>
  );
}

export default function AdminClinics() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const { data: clinics = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => base44.entities.Clinic.list('-status_verified_at', 300).catch(() => []),
    staleTime: 30 * 1000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['clinics'] });

  const importFromDoctors = async () => {
    setImporting(true); setImportMsg('');
    try {
      const res = await base44.functions.invoke('backfillClinicsFromDoctors', {});
      const d = res?.data ?? res;
      setImportMsg(d?.error ? d.error : `Imported ${d?.created ?? 0} new clinic${d?.created === 1 ? '' : 's'} from ${d?.scanned_doctors ?? 0} doctors.`);
      refresh();
    } catch (e) {
      setImportMsg(e?.response?.data?.error || 'Import failed — please try again.');
    } finally {
      setImporting(false);
    }
  };
  const needsAttention = clinics.filter((c) => isStale(c.status_verified_at) || c.operating_status !== 'operating').length;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-semibold text-slate-900">Clinics</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Onboard clinics and confirm their operating status. Only clinics confirmed 'operating'
              within the last 24h let a booking proceed when the clinic gate is enforced.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={importFromDoctors} disabled={importing}>
              <Download className={`w-4 h-4 mr-1 ${importing ? 'animate-pulse' : ''}`} /> {importing ? 'Importing…' : 'Import from doctors'}
            </Button>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add clinic
            </Button>
          </div>
        </div>

        {importMsg && (
          <div className="mb-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">{importMsg}</div>
        )}

        <div className="mb-5 flex items-start gap-2 text-xs text-slate-500 bg-emerald-50/60 border border-emerald-100 rounded-xl px-4 py-3">
          <Bot className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>An agent re-checks operating status automatically on a daily schedule. You only step in on clinics it couldn’t confirm — those show up here and in the review queue.</span>
        </div>

        {needsAttention > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4" />
            {needsAttention} {needsAttention === 1 ? 'clinic needs' : 'clinics need'} re-confirmation
          </div>
        )}

        {adding && <AddClinicForm onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No clinics yet. Add one to start gating bookings on live operating status.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clinics.map((c) => <ClinicCard key={c.id} clinic={c} onDone={refresh} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
