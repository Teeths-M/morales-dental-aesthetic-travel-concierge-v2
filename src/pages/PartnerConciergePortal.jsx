import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConciergeShell from '@/components/concierge/ConciergeShell';

export default function PartnerConciergePortal({ type = 'travel' }) {
  const token = new URLSearchParams(window.location.search).get('token');
  const [data, setData] = useState({ me: null, requests: [], patients: [], procedures: [], offers: [] });
  const [form, setForm] = useState({});

  const entityName = type === 'origin' ? 'OriginDriver' : type === 'destination' ? 'DestinationDriver' : 'TravelAgency';
  const quoteName = type === 'origin' ? 'OriginDriverQuote' : type === 'destination' ? 'DestinationDriverQuote' : 'TravelOffer';
  const submitFn = type === 'origin' ? 'submitOriginDriverQuote' : type === 'destination' ? 'submitDestinationDriverQuote' : 'submitTravelOffer';

  const load = async () => {
    const me = (await base44.entities[entityName].filter({ token }))[0];
    if (!me) return;
    const [requests, patients, procedures, offers] = await Promise.all([
      base44.entities.PatientRequest.filter({ status: 'procedures_confirmed' }), base44.entities.Patient.list(), base44.entities.ConciergeProcedure.list(), base44.entities[quoteName].list()
    ]);
    setData({ me, requests, patients, procedures, offers });
  };
  useEffect(() => { load(); }, [type]);

  const visible = data.requests.filter(r => type === 'travel' ? r.destination_country === data.me?.country : type === 'origin' ? data.patients.find(p => p.id === r.patient_id)?.home_country === data.me?.country : r.destination_country === data.me?.country);
  const submit = async (request) => { await base44.functions.invoke(submitFn, { token, patient_request_id: request.id, ...(form[request.id] || {}) }); load(); };

  return (
    <ConciergeShell title={`${type === 'travel' ? 'Travel agency' : type === 'origin' ? 'Origin driver' : 'Destination driver'} portal`} subtitle="Submit or update your quote for confirmed concierge patients.">
      {!data.me ? <div className="rounded-2xl border bg-card p-6">Invalid or expired portal link.</div> : <div className="space-y-4">
        {visible.map(request => {
          const patient = data.patients.find(p => p.id === request.patient_id);
          const procedure = data.procedures.find(p => p.id === request.procedure_id);
          const v = form[request.id] || {};
          return <div key={request.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div><h3 className="text-xl font-semibold">{patient?.name}</h3><p className="text-sm text-muted-foreground">{procedure?.name} • Arrival {request.recommended_arrival_date} • Departure {request.recommended_departure_date}</p></div>
            {type === 'travel' && <div className="grid gap-3 md:grid-cols-2"><Input required placeholder="Total price USD" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, total_price_usd: e.target.value } })} /><Input placeholder="Hotel name" onChange={e => setForm({ ...form, [request.id]: { ...v, hotel_name: e.target.value } })} /><Input placeholder="Hotel address" onChange={e => setForm({ ...form, [request.id]: { ...v, hotel_address: e.target.value } })} /><Input placeholder="Flight details" onChange={e => setForm({ ...form, [request.id]: { ...v, flight_details: e.target.value } })} /></div>}
            {type === 'origin' && <div className="grid gap-3 md:grid-cols-2"><Input placeholder="Home to airport price" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, home_to_airport_price: e.target.value } })} /><Input placeholder="Airport to home price" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, airport_to_home_price: e.target.value } })} /></div>}
            {type === 'destination' && <div className="grid gap-3 md:grid-cols-3"><Input placeholder="Airport to hotel" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, leg_airport_hotel: e.target.value } })} /><Input placeholder="Hotel to clinic" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, leg_hotel_clinic: e.target.value } })} /><Input placeholder="Clinic to hotel" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, leg_clinic_hotel: e.target.value } })} /><Input placeholder="Hotel to airport" type="number" onChange={e => setForm({ ...form, [request.id]: { ...v, leg_hotel_airport: e.target.value } })} /><Input placeholder="Vehicle type" onChange={e => setForm({ ...form, [request.id]: { ...v, vehicle_type: e.target.value } })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" onChange={e => setForm({ ...form, [request.id]: { ...v, waiting_included: e.target.checked } })} /> Waiting included</label></div>}
            <Button onClick={() => submit(request)}>Submit quote</Button>
          </div>;
        })}
      </div>}
    </ConciergeShell>
  );
}