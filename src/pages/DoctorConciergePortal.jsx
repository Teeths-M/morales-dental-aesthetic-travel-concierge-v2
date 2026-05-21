import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConciergeShell from '@/components/concierge/ConciergeShell';
import RequestCard from '@/components/concierge/RequestCard';
import { recommendedDates } from '@/components/concierge/dateUtils';

export default function DoctorConciergePortal() {
  const [data, setData] = useState({ requests: [], patients: [], procedures: [], destinations: [] });
  const [edits, setEdits] = useState({});

  const load = async () => {
    const [requests, patients, procedures, destinations] = await Promise.all([
      base44.entities.PatientRequest.filter({ status: 'pending' }), base44.entities.Patient.list(), base44.entities.ConciergeProcedure.list(), base44.entities.Destination.list()
    ]);
    setData({ requests, patients, procedures, destinations });
  };
  useEffect(() => { load(); }, []);

  const save = async (request) => {
    const procedure = data.procedures.find(p => p.id === request.procedure_id);
    const destination = data.destinations.find(d => d.country === request.destination_country);
    const edit = edits[request.id] || {};
    const calc = recommendedDates(request.procedure_datetime, edit.recovery_days || procedure.default_recovery_days, destination);
    await base44.functions.invoke('confirmDoctorRequest', { request_id: request.id, doctor_price_usd: edit.doctor_price_usd || procedure.default_price_usd, recovery_days: edit.recovery_days || procedure.default_recovery_days, recommended_arrival_date: edit.arrival || calc.arrival, recommended_departure_date: edit.departure || calc.departure, travel_recommendation_explanation: calc.explanation });
    load();
  };

  return (
    <ConciergeShell title="Doctor portal" subtitle="Confirm procedures, pricing, recovery days, and recommended travel dates.">
      <div className="space-y-4">
        {data.requests.map((request) => {
          const patient = data.patients.find(p => p.id === request.patient_id);
          const procedure = data.procedures.find(p => p.id === request.procedure_id);
          const destination = data.destinations.find(d => d.country === request.destination_country);
          const edit = edits[request.id] || {};
          const calc = destination && procedure ? recommendedDates(request.procedure_datetime, edit.recovery_days || procedure.default_recovery_days, destination) : null;
          return <RequestCard key={request.id} request={request} patient={patient} procedure={procedure}>
            <div className="grid gap-3 md:grid-cols-4">
              <Input type="number" placeholder="Doctor price" value={edit.doctor_price_usd || procedure?.default_price_usd || ''} onChange={e => setEdits({ ...edits, [request.id]: { ...edit, doctor_price_usd: e.target.value } })} />
              <Input type="number" placeholder="Recovery days" value={edit.recovery_days || procedure?.default_recovery_days || ''} onChange={e => setEdits({ ...edits, [request.id]: { ...edit, recovery_days: e.target.value } })} />
              <Input type="date" value={edit.arrival || calc?.arrival || ''} onChange={e => setEdits({ ...edits, [request.id]: { ...edit, arrival: e.target.value } })} />
              <Input type="date" value={edit.departure || calc?.departure || ''} onChange={e => setEdits({ ...edits, [request.id]: { ...edit, departure: e.target.value } })} />
            </div>
            <p className="my-4 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">{calc?.explanation}</p>
            <Button onClick={() => save(request)}>Confirm Procedures & Save Travel Dates</Button>
          </RequestCard>;
        })}
      </div>
    </ConciergeShell>
  );
}