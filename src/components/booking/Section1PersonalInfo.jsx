import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ages = Array.from({ length: 83 }, (_, i) => String(i + 18));
const heights = ['Under 140cm','140–150cm','151–160cm','161–170cm','171–180cm','181–190cm','191cm+'];
const weights = ['Under 50kg','50–60kg','61–70kg','71–80kg','81–90kg','91–100kg','101–120kg','121kg+'];
const nationalities = ['American','British','Canadian','Australian','Mexican','Brazilian','Colombian','Spanish','French','German','Italian','Dutch','Swedish','Norwegian','Polish','Russian','Turkish','Saudi','Emirati','Egyptian','Moroccan','Nigerian','South African','Indian','Pakistani','Chinese','Japanese','Korean','Filipino','Other'];

export default function Section1PersonalInfo({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">👤</span>
        <h3 className="font-display text-lg text-foreground">Personal Information</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">Basic Information</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Full Name <span className="text-destructive">*</span></Label>
          <Input value={form.patient_name} onChange={e => update('patient_name', e.target.value)} placeholder="Your full name" className="mt-1.5" />
        </div>

        <div>
          <Label>Age</Label>
          <Select value={form.age} onValueChange={v => update('age', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select age" /></SelectTrigger>
            <SelectContent>{ages.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={v => update('gender', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="prefer_not">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Height</Label>
          <Select value={form.height} onValueChange={v => update('height', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select height" /></SelectTrigger>
            <SelectContent>{heights.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Weight</Label>
          <Select value={form.weight} onValueChange={v => update('weight', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select weight" /></SelectTrigger>
            <SelectContent>{weights.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Nationality</Label>
          <Select value={form.nationality} onValueChange={v => update('nationality', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select nationality" /></SelectTrigger>
            <SelectContent>{nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Occupation</Label>
          <Input value={form.occupation} onChange={e => update('occupation', e.target.value)} placeholder="Your occupation" className="mt-1.5" />
        </div>

        <div>
          <Label>Emergency Contact Name</Label>
          <Input value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} placeholder="Contact name" className="mt-1.5" />
        </div>

        <div>
          <Label>Emergency Contact Number</Label>
          <Input value={form.emergency_contact_number} onChange={e => update('emergency_contact_number', e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label>Phone (optional)</Label>
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}