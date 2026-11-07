import React, { useState } from 'react';
import { Fingerprint, Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AdminLayout from '@/components/layout/AdminLayout';
import { friendlyError } from '@/lib/friendlyError';

/**
 * AdminPhoneLock — the care team removes a traveler's Face ID lock (adminResetPhoneLock), for a traveler who lost the
 * phone the lock lives on. Confirm it's really them first: call the number on their trip, never trust a message sent
 * from the phone that may have been stolen. A reason is required; the traveler gets an email that the lock was reset.
 */
export default function AdminPhoneLock() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  const lookup = async (e) => {
    e?.preventDefault?.();
    if (!email.trim()) return;
    setBusy('lookup');
    setResult(null);
    try {
      const res = await base44.functions.invoke('adminResetPhoneLock', { action: 'lookup', user_email: email.trim() });
      setResult(res.data);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't look that traveler up.", 'AdminPhoneLock'));
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    setBusy('reset');
    try {
      const res = await base44.functions.invoke('adminResetPhoneLock', {
        action: 'reset', user_email: result.user_email, reason: reason.trim(),
      });
      toast.success(`Lock reset. ${res.data?.removed || 0} passkey(s) removed.`);
      setReason('');
      setResult({ ...result, enrolled: false, devices: [] });
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't reset the lock.", 'AdminPhoneLock'));
    } finally {
      setBusy('');
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Face ID lock reset</h1>
              <p className="text-sm text-gray-500">For a traveler who lost the phone their lock is on.</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 leading-relaxed">
            Confirm it's really the traveler before resetting: call the phone number on their trip and ask something
            only they would know. Never reset because of a message sent from the phone that may have been stolen.
          </p>

          <form onSubmit={lookup} className="flex gap-2">
            <label htmlFor="phone-lock-email" className="sr-only">Traveler's email</label>
            <input
              id="phone-lock-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="traveler@example.com"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <Button type="submit" disabled={!email.trim() || !!busy}>
              {busy === 'lookup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              Look up
            </Button>
          </form>

          {result && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{result.user_email}</span>:{' '}
                {result.enrolled ? `${result.devices.length} passkey(s) on the lock` : 'no Face ID lock'}
              </p>
              {result.devices?.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.devices.map((d) => (
                    <li key={d.id}>{d.device_label}{d.backed_up ? ' (syncs to their other devices)' : ''}</li>
                  ))}
                </ul>
              )}
              {result.enrolled && (
                <div className="space-y-2">
                  <label htmlFor="phone-lock-reason" className="text-xs font-semibold text-gray-600 block">
                    Why are you resetting it? (recorded)
                  </label>
                  <textarea
                    id="phone-lock-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Phone stolen in Cancun; confirmed by phone call to the number on the trip."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <Button onClick={reset} disabled={reason.trim().length < 5 || !!busy} className="bg-red-600 hover:bg-red-700 text-white">
                    {busy === 'reset' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Reset the lock
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
