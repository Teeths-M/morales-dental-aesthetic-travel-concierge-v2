import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const procedures = [
  { value: 'dental_implants', label: 'Dental Implants' },
  { value: 'smile_makeover', label: 'Smile Makeover' },
  { value: 'all_on_4', label: 'All-on-4 / All-on-6' },
  { value: 'porcelain_veneers', label: 'Porcelain Veneers' },
  { value: 'bone_regeneration', label: 'Bone Regeneration' },
  { value: 'cosmetic_dentistry', label: 'Cosmetic Dentistry' },
  { value: 'other', label: 'Other / Not Sure' },
];

export default function SectionProcedure({ form, update }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏥</span>
        <h3 className="font-display text-lg text-foreground">Procedure & Date</h3>
      </div>

      <div>
        <Label>Procedure of Interest <span className="text-destructive">*</span></Label>
        <Select value={form.procedure_interest} onValueChange={v => update('procedure_interest', v)}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a procedure" /></SelectTrigger>
          <SelectContent>
            {procedures.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Preferred Consultation Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={form.preferred_date} onChange={e => update('preferred_date', e.target.value)} className="mt-1.5" />
        <p className="text-xs text-muted-foreground mt-1">Our team will confirm availability and may suggest alternatives.</p>
      </div>

      <div>
        <Label>Additional Notes (optional)</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Tell us about your goals..." className="mt-1.5 h-24" />
      </div>
    </div>
  );
}

export { procedures };