import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ConciergeShell from '@/components/concierge/ConciergeShell';

export default function PackagePayment({ method = 'full' }) {
  const token = new URLSearchParams(window.location.search).get('token');
  const [request, setRequest] = useState(null);
  const [done, setDone] = useState(false);
  useEffect(() => { base44.entities.PatientRequest.filter({ payment_token: token }).then(r => setRequest(r[0])); }, [token]);
  const price = method === 'full' ? Math.round((request?.final_package_price || 0) * 0.95 * 100) / 100 : request?.final_package_price;
  const confirm = async () => { await base44.functions.invoke('confirmPackagePayment', { token, method }); setDone(true); };
  if (done) return <ConciergeShell title="Thank you" subtitle="Your payment choice has been confirmed. The Morales concierge team will contact you with next steps." />;
  return <ConciergeShell title={method === 'full' ? 'Pay in full' : 'Pay in terms'} subtitle="Confirm your concierge package payment option.">
    <div className="rounded-2xl border bg-card p-6 shadow-sm"><p className="text-lg">Package price: <strong>${price || 0}</strong></p><Button className="mt-4" onClick={confirm}>Confirm Payment</Button></div>
  </ConciergeShell>;
}