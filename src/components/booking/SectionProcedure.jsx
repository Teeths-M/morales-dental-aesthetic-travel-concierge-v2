import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const procedures = [
  // Dental
  { group: '🦷 Dental', value: 'dental_implants', label: 'Dental Implants' },
  { group: '🦷 Dental', value: 'all_on_4', label: 'All-on-4 / All-on-6' },
  { group: '🦷 Dental', value: 'porcelain_veneers', label: 'Porcelain Veneers' },
  { group: '🦷 Dental', value: 'smile_makeover', label: 'Smile Makeover' },
  { group: '🦷 Dental', value: 'bone_regeneration', label: 'Bone Regeneration' },
  { group: '🦷 Dental', value: 'teeth_whitening', label: 'Teeth Whitening & Cosmetic Dentistry' },
  // Cosmetic Surgery
  { group: '✨ Cosmetic Surgery', value: 'rhinoplasty', label: 'Rhinoplasty (Nose Reshaping)' },
  { group: '✨ Cosmetic Surgery', value: 'breast_surgery', label: 'Breast Augmentation / Reduction / Lift' },
  { group: '✨ Cosmetic Surgery', value: 'liposuction', label: 'Liposuction' },
  { group: '✨ Cosmetic Surgery', value: 'tummy_tuck', label: 'Abdominoplasty (Tummy Tuck)' },
  { group: '✨ Cosmetic Surgery', value: 'facelift', label: 'Facelift' },
  { group: '✨ Cosmetic Surgery', value: 'brow_lift', label: 'Brow Lift' },
  { group: '✨ Cosmetic Surgery', value: 'blepharoplasty', label: 'Eyelid Surgery (Blepharoplasty)' },
  { group: '✨ Cosmetic Surgery', value: 'otoplasty', label: 'Otoplasty (Ear Reshaping)' },
  { group: '✨ Cosmetic Surgery', value: 'thigh_arm_lift', label: 'Thigh Lift / Arm Lift' },
  { group: '✨ Cosmetic Surgery', value: 'laser_resurfacing', label: 'Skin Rejuvenation (Laser Resurfacing)' },
  { group: '✨ Cosmetic Surgery', value: 'mole_removal', label: 'Mole Removal (Skin Nevus)' },
  { group: '✨ Cosmetic Surgery', value: 'lipoma_removal', label: 'Lipoma Removal' },
  // Bariatric
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_sleeve', label: 'Gastric Sleeve (Sleeve Gastrectomy)' },
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_bypass', label: 'Gastric Bypass (Roux-en-Y)' },
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_band_revision', label: 'Gastric Band Removal / Revision' },
  // Fertility
  { group: '🌸 Fertility & Gynecology', value: 'gynecological_exams', label: 'Gynecological Diagnostic Exams' },
  { group: '🌸 Fertility & Gynecology', value: 'ivf', label: 'IVF (In Vitro Fertilization)' },
  { group: '🌸 Fertility & Gynecology', value: 'egg_freezing', label: 'Fertility Preservation (Egg Freezing)' },
  // Oncology
  { group: '🎗️ Cancer Care', value: 'oncology_surgery', label: 'Oncological Surgical Procedures' },
  { group: '🎗️ Cancer Care', value: 'tumor_testing', label: 'Tumor Marker & Blood Panel Testing' },
  // Orthopedic
  { group: '🦴 Orthopedic Surgery', value: 'joint_replacement', label: 'Joint Replacement (Hip & Knee)' },
  { group: '🦴 Orthopedic Surgery', value: 'spine_surgery', label: 'Spine Surgery' },
  { group: '🦴 Orthopedic Surgery', value: 'sports_arthroscopy', label: 'Sports Injuries & Arthroscopy' },
  { group: '🦴 Orthopedic Surgery', value: 'fracture_surgery', label: 'Fracture Management & Trauma Surgery' },
  { group: '', value: 'other', label: 'Other / Not Sure' },
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
          <SelectContent className="max-h-72">
            {(() => {
              const groups = [...new Set(procedures.map(p => p.group))];
              return groups.map(group => (
                <React.Fragment key={group}>
                  {group && <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider border-t border-border first:border-0 mt-1 pt-2">{group}</div>}
                  {procedures.filter(p => p.group === group).map(p => (
                    <SelectItem key={p.value} value={p.value} className="pl-4">{p.label}</SelectItem>
                  ))}
                </React.Fragment>
              ));
            })()}
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