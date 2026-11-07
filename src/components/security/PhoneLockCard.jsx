import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Fingerprint, Loader2, Smartphone, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { serverTimeMs } from '@/lib/serverTime';
import {
  PHONE_LOCK_CHANGED_EVENT, getPhoneLockStatus, phoneLockErrorMessage, phoneLockSupported, removePhoneFromLock,
  turnOnPhoneLock,
} from '@/lib/phoneLock';

/**
 * PhoneLockCard — Settings: turn the Face ID / fingerprint lock on, see which phones can unlock it, remove one.
 * Also tells travelers to switch on their phone's own theft protection, which covers a thief who watched them type
 * their passcode (no app can stop that on its own).
 */
const shortDate = (value) => {
  const ms = serverTimeMs(value);
  return Number.isFinite(ms) ? format(new Date(ms), 'd MMM yyyy') : null;
};

export default function PhoneLockCard() {
  const [supported, setSupported] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setStatus(await getPhoneLockStatus());
    } catch {
      setStatus({ error: true });
    }
  }, []);

  useEffect(() => {
    phoneLockSupported().then(setSupported);
    load();
    window.addEventListener(PHONE_LOCK_CHANGED_EVENT, load);
    return () => window.removeEventListener(PHONE_LOCK_CHANGED_EVENT, load);
  }, [load]);

  const turnOn = async () => {
    setBusy('on');
    try {
      await turnOnPhoneLock();
      toast.success(status?.enrolled ? 'This phone can now unlock M-Care.' : 'The Face ID lock is on.');
    } catch (error) {
      toast.error(phoneLockErrorMessage(error, "We couldn't turn the lock on. Try again."));
    } finally {
      setBusy('');
    }
  };

  const remove = async (device, isLast) => {
    setBusy(device.id);
    try {
      await removePhoneFromLock(device.id);
      toast.success(isLast ? 'The Face ID lock is off.' : 'That phone can no longer unlock M-Care.');
    } catch (error) {
      toast.error(phoneLockErrorMessage(error, "We couldn't remove that phone. Try again."));
    } finally {
      setBusy('');
    }
  };

  const enrolled = !!status?.enrolled;
  const devices = Array.isArray(status?.devices) ? status.devices : [];
  const unavailable = supported === false || status?.available_here === false;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6" data-testid="phone-lock-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Fingerprint className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Face ID lock</h3>
          <p className="text-xs text-slate-500">{enrolled ? 'On' : 'Off'}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        If your phone is lost or stolen, the lock keeps your trip, messages and documents private. M-Care locks after
        5 minutes away and opens with Face ID or your fingerprint. Turning help off, changing your emergency contacts or
        phone number, and sharing documents also ask for it. SOS and emergency help always stay open, and your
        check-ins and alerts keep running while M-Care is locked.
      </p>

      {status === null || supported === null ? (
        <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</p>
      ) : status?.error ? (
        <p className="text-xs text-slate-500">We couldn't check your lock just now. Reload this page to try again.</p>
      ) : (
        <div className="space-y-3">
          {devices.length > 0 && (
            <ul className="space-y-2">
              {devices.map((d) => {
                const added = shortDate(d.created_at);
                const used = shortDate(d.last_used_at);
                return (
                  <li key={d.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Smartphone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{d.device_label}</p>
                      <p className="text-[11px] text-slate-500">
                        {[added && `Added ${added}`, used && `last used ${used}`, d.backed_up && 'syncs to your other devices'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(d, devices.length === 1)}
                      disabled={!!busy}
                      aria-label={`Remove ${d.device_label} from the lock`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {unavailable ? (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
              {supported === false
                ? "This phone or browser can't use Face ID or a fingerprint for M-Care. On iPhone use Safari, and on Android use Chrome."
                : "The Face ID lock only works at M-Care's usual web address. Open M-Care there to turn it on."}
            </p>
          ) : (
            <Button size="sm" onClick={turnOn} disabled={!!busy} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
              {busy === 'on' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Fingerprint className="w-3.5 h-3.5 mr-1.5" />}
              {enrolled ? (status?.usable_here ? 'Add another passkey' : 'Add this phone') : 'Turn on Face ID lock'}
            </Button>
          )}
          {enrolled && devices.length > 1 && (
            <p className="text-[11px] text-slate-400">Removing the last phone turns the lock off.</p>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4 flex gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 leading-relaxed space-y-1.5">
          <p className="font-semibold text-slate-700">Turn on your phone's own theft protection too</p>
          <p>
            It stops a thief who saw you type your passcode, which no app can stop on its own. On iPhone: Settings, then
            Face ID &amp; Passcode, then Stolen Device Protection. On Android: open Settings and search for
            &quot;Identity Check&quot; (Pixel and recent Samsung phones).
          </p>
        </div>
      </div>
    </div>
  );
}
