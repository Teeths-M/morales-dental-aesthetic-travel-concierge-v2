import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);
import { Copy, Check, Loader2, IdCard } from 'lucide-react';

const LANGUAGES = ['es', 'pt', 'fr', 'it', 'de', 'tr', 'th', 'ar', 'zh', 'en'];

/**
 * IssueTripCardPanel — the care team prints a card for a trip.
 *
 * Everything the card carries is chosen here and fixed at issue: country (which
 * selects the emergency number and the language), the language itself, and the
 * trip's real end. Nothing identifying is printed.
 */
export default function IssueTripCardPanel({ onIssued }) {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [language, setLanguage] = useState('');
  const [tripEndsAt, setTripEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.entities.CaseRecord.list('-created_date', 60).then((rows) => setCases(rows || [])).catch(() => {});
  }, []);

  const selected = cases.find((c) => c.id === caseId);

  const issue = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('issueTripCard', {
        case_id: caseId,
        country_code: countryCode,
        country_name: countryName || selected?.procedure_country || null,
        emergency_number: emergencyNumber || null,
        language: language || null,
        trip_ends_at: tripEndsAt ? new Date(tripEndsAt).toISOString() : null,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setIssued(data);
      onIssued?.(data.card);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not issue the card.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.card_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  if (issued) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Check className="w-4 h-4 text-primary" /> Card issued
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {issued.card.patient_first_name} · {issued.card.language.toUpperCase()} · live until{' '}
          {new Date(issued.card.expires_at).toLocaleString()}
        </p>

        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={issued.card_url} size={148} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Card link</p>
            <p className="mt-1 break-all font-mono text-[11px] text-foreground">{issued.card_url}</p>
            <button
              onClick={copy}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Print the QR or the link. The card stays valid until 24 hours after the trip's real end, and extends
              automatically if the trip moves — it never needs reprinting.
            </p>
          </div>
        </div>

        <button
          onClick={() => { setIssued(null); setCaseId(''); setEmergencyNumber(''); setTripEndsAt(''); }}
          className="mt-5 text-xs font-medium text-muted-foreground underline"
        >
          Issue another card
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <IdCard className="w-4 h-4 text-primary" /> Issue a trip card
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        One card per trip. It carries a first name, a country emergency number and a signed token — never a
        procedure, a diagnosis or a contact.
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
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Emergency number</span>
          <input
            value={emergencyNumber}
            onChange={(e) => setEmergencyNumber(e.target.value)}
            placeholder="911"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[10.5px] text-muted-foreground">
            Left empty, it is taken from Emergency Contacts for this country. Never guessed.
          </span>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Trip ends</span>
          <input
            type="date"
            value={tripEndsAt}
            onChange={(e) => setTripEndsAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[10.5px] text-muted-foreground">
            Empty, it is derived from the case's procedure date and recovery days.
          </span>
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <button
        onClick={issue}
        disabled={!caseId || !countryCode || busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Issue card
      </button>
    </div>
  );
}