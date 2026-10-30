import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);
import { Check, Loader2, Printer, IdCard, AlertTriangle } from 'lucide-react';

const LANGUAGES = ['es', 'pt', 'fr', 'it', 'de', 'tr', 'th', 'ar', 'zh', 'en'];

/**
 * IssueTripCardPanel — the care team sends a trip's card set out with the pack.
 *
 * Nothing identifying is printed. The number on the face is M-Care's own local
 * number for that country, because a stranger on a prepaid phone cannot reach a
 * foreign toll-free. If that number is missing for the country, this refuses and
 * raises a task rather than printing a card with no number on it.
 */
export default function IssueTripCardPanel({ onIssued }) {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [language, setLanguage] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null);

  useEffect(() => {
    base44.entities.CaseRecord.list('-created_date', 60).then((rows) => setCases(rows || [])).catch(() => {});
  }, []);

  const selected = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  useEffect(() => {
    if (!selected) return;
    setCountryName((v) => v || selected.procedure_country || '');
  }, [selected]);

  const issue = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('issueTripCard', {
        case_id: caseId,
        country_code: countryCode,
        country_name: countryName || selected?.procedure_country || null,
        language: language || null,
        local_number: localNumber || null,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setIssued(data);
      onIssued?.(data.card);
    } catch (e) {
      const payload = e?.response?.data;
      setError(payload?.error || e?.message || 'Could not issue the card set.');
    } finally {
      setBusy(false);
    }
  };

  if (issued) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Check className="w-4 h-4 text-primary" />
          {issued.created ? 'Card set issued' : 'This trip already had a live set — resent, not reissued'}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {issued.card.patient_first_name} · {String(issued.card.language || '').toUpperCase()} ·{' '}
          {issued.card.local_mcare_number} · live until {new Date(issued.card.expires_at).toLocaleString()}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {issued.cards?.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[12px] font-semibold text-foreground">{c.short_ref}</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.status}</span>
              </div>
              <div className="mt-2 flex justify-center rounded-lg bg-white p-2">
                <QRCodeSVG value={c.card_url} size={112} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={issued.pdf_url}
            download={issued.pdf_filename || 'm-care-emergency-cards.pdf'}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Printer className="w-3.5 h-3.5" /> Print sheet (PDF)
          </a>
          <button
            onClick={() => { setIssued(null); setCaseId(''); setLocalNumber(''); setCountryCode(''); }}
            className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground"
          >
            Another trip
          </button>
        </div>

        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-[11px] leading-relaxed text-foreground">
          {issued.instruction ||
            'Keep one card in the bag you carry out of the room, and one on the bedside table where anyone walking in would see it.'}
        </p>
        <p className="mt-2 text-[10.5px] text-muted-foreground">
          Resend this pack and the same cards come back. Only an itinerary change or an explicit revoke replaces
          them — otherwise the card already printed would die the moment the traveller asked for their itinerary
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <IdCard className="w-4 h-4 text-primary" /> Issue this trip's card set
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Two cards, each with its own token. Only issued once the booking is confirmed and payment captured,
        because the pack is the only way a card reaches a hand.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Trip / case</span>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name || 'Unnamed'} — {c.procedure_country || '—'} — {c.status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Country code</span>
          <input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="VE"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Country name</span>
          <input
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            placeholder="Venezuela"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[10.5px] text-muted-foreground">
            Used to find the local M-Care number on this country's record.
          </span>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Card language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Match the country</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Local number override</span>
          <input
            value={localNumber}
            onChange={(e) => setLocalNumber(e.target.value)}
            placeholder="+58 …"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[10.5px] text-muted-foreground">
            Only if it genuinely answers locally, at 3am. Empty, it comes from this country's record.
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        onClick={issue}
        disabled={!caseId || !countryCode || busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Issue card set
      </button>
    </div>
  );
}