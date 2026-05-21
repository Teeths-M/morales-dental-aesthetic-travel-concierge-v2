import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ConciergeShell from '@/components/concierge/ConciergeShell';

export default function AdminConciergeDashboard() {
  const [data, setData] = useState({ requests: [], patients: [], procedures: [], travel: [], origin: [], destination: [] });
  const [selected, setSelected] = useState({});
  const load = async () => {
    const [requests, patients, procedures, travel, origin, destination] = await Promise.all([
      base44.entities.PatientRequest.filter({ status: 'procedures_confirmed' }), base44.entities.Patient.list(), base44.entities.ConciergeProcedure.list(), base44.entities.TravelOffer.list(), base44.entities.OriginDriverQuote.list(), base44.entities.DestinationDriverQuote.list()
    ]);
    setData({ requests, patients, procedures, travel, origin, destination });
  };
  useEffect(() => { load(); }, []);
  const finalize = async (id) => { const s = selected[id]; await base44.functions.invoke('finalizePackage', { patient_request_id: id, travel_offer_id: s.travel, origin_quote_id: s.origin, destination_quote_id: s.destination }); load(); };

  return <ConciergeShell title="Concierge admin dashboard" subtitle="Select provider offers, apply markup, and send the final package to the patient.">
    <div className="space-y-6">{data.requests.map(r => {
      const patient = data.patients.find(p => p.id === r.patient_id); const procedure = data.procedures.find(p => p.id === r.procedure_id); const s = selected[r.id] || {};
      return <div key={r.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-4"><div><h3 className="text-2xl font-semibold">{patient?.name}</h3><p className="text-muted-foreground">{procedure?.name} • Doctor price ${r.doctor_price_usd || 0}</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          <div><h4 className="font-semibold">Travel offers</h4>{data.travel.filter(o => o.patient_request_id === r.id).map(o => <label key={o.id} className="mt-2 block rounded-xl border p-3 text-sm"><input type="radio" name={`travel-${r.id}`} onChange={() => setSelected({ ...selected, [r.id]: { ...s, travel: o.id } })} /> ${o.total_price_usd} • {o.hotel_name}</label>)}</div>
          <div><h4 className="font-semibold">Origin quotes</h4>{data.origin.filter(o => o.patient_request_id === r.id).map(o => <label key={o.id} className="mt-2 block rounded-xl border p-3 text-sm"><input type="radio" name={`origin-${r.id}`} onChange={() => setSelected({ ...selected, [r.id]: { ...s, origin: o.id } })} /> ${Number(o.home_to_airport_price) + Number(o.airport_to_home_price)}</label>)}</div>
          <div><h4 className="font-semibold">Destination quotes</h4>{data.destination.filter(o => o.patient_request_id === r.id).map(o => <label key={o.id} className="mt-2 block rounded-xl border p-3 text-sm"><input type="radio" name={`dest-${r.id}`} onChange={() => setSelected({ ...selected, [r.id]: { ...s, destination: o.id } })} /> ${Number(o.leg_airport_hotel) + Number(o.leg_hotel_clinic) + Number(o.leg_clinic_hotel) + Number(o.leg_hotel_airport)} • {o.vehicle_type}</label>)}</div>
        </div><Button disabled={!s.travel || !s.origin || !s.destination} onClick={() => finalize(r.id)}>Finalize Package & Send to Client</Button></div>;
    })}</div>
  </ConciergeShell>;
}