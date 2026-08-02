import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Heart, CheckCircle2, Loader2, Luggage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhoneField from '@/components/ui-system/PhoneField';

export default function LuggageFinderPortal() {
  // Token comes from path: /luggage/:token
  const pathParts = window.location.pathname.split('/');
  const finderToken = pathParts[pathParts.length - 1];

  const [bag, setBag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ finder_name: '', finder_phone: '', finder_email: '', current_location: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!finderToken || finderToken === 'luggage') { setError('Invalid QR code.'); setLoading(false); return; }
      try {
        // base44.asServiceRole throws in the browser (no serviceToken client-side) —
        // this used to call it directly with no try/catch, so the thrown promise
        // rejection left loading stuck true forever (the finder never saw the form).
        const res = await base44.functions.invoke('getLuggageByFinderToken', { finder_token: finderToken });
        const data = res?.data;
        if (!data?.found) { setError('Luggage tag not found.'); setLoading(false); return; }
        setBag(data);
      } catch (_err) {
        setError('Could not load this luggage tag. Please try scanning again.');
      }
      setLoading(false);
    };
    load();
  }, [finderToken]);

  const handleSubmit = async () => {
    if (!form.finder_name || !form.current_location) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      // Status update + owner/admin notification all happen server-side now —
      // the finder has no case access and asServiceRole cannot be called from
      // the browser regardless.
      await base44.functions.invoke('reportLuggageFound', {
        finder_token: finderToken,
        finder_name: form.finder_name,
        finder_phone: form.finder_phone,
        finder_email: form.finder_email,
        current_location: form.current_location,
      });
      setSubmitted(true);
    } catch (_e) {
      setSubmitError('Could not notify the owner — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">

        {submitted ? (
          <div className="text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-500 text-sm">
              The owner has been notified anonymously. A Morales Medical coordinator will contact you shortly to arrange the return.
            </p>
            <div className="mt-6 bg-emerald-50 rounded-xl p-4">
              <p className="text-emerald-700 text-xs font-medium">Your good deed is making someone's medical journey a little easier. 💙</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Luggage className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Found a Bag?</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                You've scanned a <strong>Morales Medical</strong> luggage tag. Please fill in the details below — the owner will be notified <em>without sharing your personal information</em>.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
              <p className="text-xs font-semibold text-blue-800">Bag: {bag?.bag_label || 'Luggage'}</p>
              <p className="text-xs text-blue-600 font-mono">{bag?.token_code}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name <span className="text-red-400">*</span></label>
                <input value={form.finder_name} onChange={e => setForm({ ...form, finder_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Where Did You Find It? <span className="text-red-400">*</span></label>
                <input value={form.current_location} onChange={e => setForm({ ...form, current_location: e.target.value })}
                  placeholder="e.g. Caracas Airport baggage claim, Gate B5"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Your Phone (optional)</label>
                <PhoneField id="luggage-finder-phone" value={form.finder_phone} onChange={v => setForm({ ...form, finder_phone: v })} placeholder="Your phone" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Your Email (optional)</label>
                <input value={form.finder_email} onChange={e => setForm({ ...form, finder_email: e.target.value })}
                  placeholder="finder@email.com"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>

            {submitError && <p className="text-center text-xs text-red-500 mt-4">{submitError}</p>}
            <Button onClick={handleSubmit}
              disabled={!form.finder_name || !form.current_location || submitting}
              className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold">
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Notifying owner...</span> : <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Notify the Owner</span>}
            </Button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Your contact info is only shared with Morales Medical staff, never published publicly.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}