import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { isCheckInCode } from '@/lib/checkInCode';

/**
 * Where a traveler sets their check-in code and duress code (manageCheckInCode; base44/shared/checkInCode.ts).
 * Changing a code that's already set needs the current one. The codes are never shown again once saved.
 */
function CodeInput({ id, label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-center text-xl tracking-[0.5em] text-slate-900"
      />
    </div>
  );
}

export default function CheckInCodePanel() {
  const [status, setStatus] = useState({ loading: true, has_code: false, set_at: null });
  const [code, setCode] = useState('');
  const [duress, setDuress] = useState('');
  const [current, setCurrent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('manageCheckInCode', { action: 'status' })
      .then((res) => setStatus({ loading: false, has_code: !!res?.data?.has_code, set_at: res?.data?.set_at || null }))
      .catch(() => setStatus({ loading: false, has_code: false, set_at: null }));
  }, []);

  const ready = isCheckInCode(code) && isCheckInCode(duress) && code !== duress && (!status.has_code || isCheckInCode(current));

  const save = async (e) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('manageCheckInCode', {
        action: 'set', code, duress_code: duress, ...(status.has_code ? { current_code: current } : {}),
      });
      setStatus({ loading: false, has_code: true, set_at: res?.data?.set_at || new Date().toISOString() });
      setCode(''); setDuress(''); setCurrent('');
      toast.success(status.has_code ? 'Check-in codes changed.' : 'Check-in codes saved.');
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't save your codes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-2">
        <KeyRound className="w-4 h-4 text-slate-500" />
        Check-in code
        {status.has_code && <span className="ml-auto text-[11px] font-semibold text-emerald-700">On</span>}
      </h3>
      <p className="text-xs text-slate-600 leading-relaxed">
        With a code set, saying you&apos;re safe needs it: in the app, on the emailed link, or by text (SAFE and your
        code, for example SAFE 1234). Someone holding your phone can&apos;t mark you safe.
      </p>
      <p className="text-xs text-slate-600 leading-relaxed mt-2">
        <strong>Duress code:</strong> a second code for when someone is forcing you to answer. It works like your
        real code and says you&apos;re marked safe, but it silently alerts the M-Care safety team and your emergency
        contact.
      </p>
      <p className="text-[11px] text-slate-500 mt-2">
        Don&apos;t reuse your phone&apos;s passcode or your vault PIN. Five wrong codes in a row lock it for 30 minutes,
        and until then the check-in counts as unanswered.
      </p>

      {!status.loading && (
        <form onSubmit={save} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {status.has_code && (
            <CodeInput id="checkin-code-current" label="Current code" value={current} onChange={setCurrent} />
          )}
          <CodeInput id="checkin-code-new" label={status.has_code ? 'New check-in code' : 'Check-in code'} value={code} onChange={setCode} />
          <CodeInput id="checkin-code-duress" label="Duress code" value={duress} onChange={setDuress} />
          <div className="sm:col-span-3 flex flex-col gap-2">
            {code && duress && code === duress && (
              <p className="text-xs text-red-600">Your duress code must be different from your check-in code.</p>
            )}
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            <Button type="submit" disabled={!ready || saving} className="h-10 text-sm">
              {saving ? 'Saving…' : status.has_code ? 'Change codes' : 'Save codes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
