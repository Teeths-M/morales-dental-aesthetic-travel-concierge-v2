import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConciergeShell from '@/components/concierge/ConciergeShell';
import FlightDatePicker from '@/components/concierge/FlightDatePicker';

export default function ConciergeBooking() {
  const [procedures, setProcedures] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', home_address: '', home_city: '', home_country: '', home_airport_code: '', procedure_id: '', destination_country: '', procedure_date: '', procedure_time: '10:00' });
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([base44.entities.ConciergeProcedure.list(), base44.entities.Destination.list()]).then(([p, d]) => { setProcedures(p); setDestinations(d); });
  }, []);

  const destination = destinations.find(d => d.country === form.destination_country);

  const submit = async (e) => {
    e.preventDefault();
    const patient = await base44.entities.Patient.create({ name: form.name, email: form.email, home_address: form.home_address, home_city: form.home_city, home_country: form.home_country, home_airport_code: form.home_airport_code });
    await base44.entities.PatientRequest.create({ patient_id: patient.id, procedure_id: form.procedure_id, destination_country: form.destination_country, procedure_datetime: `${form.procedure_date}T${form.procedure_time}:00`, status: 'pending', payment_status: 'unpaid' });
    setDone(true);
  };

  if (done) return <ConciergeShell title="Request received" subtitle="Your concierge booking request is pending doctor review. We’ll coordinate travel once the procedure is confirmed." />;

  return (
    <ConciergeShell title="Door-to-door medical travel booking" subtitle="Plan your procedure, flights, recovery stay, and private transfers with Morales Concierge.">
      <form onSubmit={submit} className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Patient name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Home address" value={form.home_address} onChange={e => setForm({ ...form, home_address: e.target.value })} />
          <Input placeholder="Home city" value={form.home_city} onChange={e => setForm({ ...form, home_city: e.target.value })} />
          <Input placeholder="Home country" required value={form.home_country} onChange={e => setForm({ ...form, home_country: e.target.value })} />
          <Input placeholder="Home airport code" required value={form.home_airport_code} onChange={e => setForm({ ...form, home_airport_code: e.target.value.toUpperCase() })} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <select required className="h-10 rounded-md border bg-background px-3" value={form.procedure_id} onChange={e => setForm({ ...form, procedure_id: e.target.value })}>
            <option value="">Select procedure</option>
            {procedures.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.default_price_usd}</option>)}
          </select>
          <select required className="h-10 rounded-md border bg-background px-3" value={form.destination_country} onChange={e => setForm({ ...form, destination_country: e.target.value, procedure_date: '' })}>
            <option value="">Destination country</option>
            {destinations.map(d => <option key={d.id} value={d.country}>{d.country}</option>)}
          </select>
          <Input required type="time" value={form.procedure_time} onChange={e => setForm({ ...form, procedure_time: e.target.value })} />
        </div>
        <FlightDatePicker destination={destination} value={form.procedure_date} onChange={date => setForm({ ...form, procedure_date: date })} />
        <Button disabled={!form.procedure_date} className="w-full md:w-auto">Submit concierge request</Button>
      </form>
    </ConciergeShell>
  );
}