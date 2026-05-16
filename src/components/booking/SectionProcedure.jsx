import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, isAfter } from 'date-fns';
import CapacityGate from './CapacityGate';

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(form.preferred_date ? new Date(form.preferred_date) : new Date());

  const handleMonthChange = (newDate) => {
    update('preferred_date', newDate);
  };

  const handleDateSelect = (day) => {
    if (isBefore(day, new Date())) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    update('preferred_date', dateStr);
    setShowCalendar(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const displayDate = form.preferred_date ? format(new Date(form.preferred_date), 'MMM d, yyyy') : '';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏥</span>
        <h3 className="font-display text-lg text-foreground">Procedure & Date</h3>
      </div>

      <div>
        <Label>Preferred Consultation Date <span className="text-destructive">*</span></Label>
        <div className="relative mt-1.5">
          <motion.button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-foreground"
            whileHover={{ y: -1 }}
          >
            <span className="text-sm font-medium">{displayDate || 'Select a date'}</span>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 p-5 w-full max-w-sm"
              >
                {/* Month Header */}
                <div className="flex items-center justify-between mb-5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h4 className="font-display text-lg text-foreground">{format(currentMonth, 'MMMM yyyy')}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map(day => {
                    const isPast = isBefore(day, new Date());
                    const isSelected = form.preferred_date && format(day, 'yyyy-MM-dd') === form.preferred_date;
                    const isCurrent = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <motion.button
                        key={format(day, 'yyyy-MM-dd')}
                        onClick={() => handleDateSelect(day)}
                        disabled={isPast}
                        whileHover={!isPast ? { scale: 1.08 } : {}}
                        className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                          !isCurrentMonth
                            ? 'text-muted-foreground/20 bg-transparent'
                            : isSelected
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg'
                            : isCurrent
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : isPast
                            ? 'text-muted-foreground/30 bg-muted/20 cursor-not-allowed'
                            : 'bg-white border border-border hover:border-primary hover:shadow-sm cursor-pointer'
                        }`}
                      >
                        {format(day, 'd')}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 mt-5 pt-5 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCalendar(false);
                      update('preferred_date', '');
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      update('preferred_date', today);
                      setCurrentMonth(new Date());
                      setShowCalendar(false);
                    }}
                  >
                    Today
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Our team will confirm availability and may suggest alternatives.</p>
      </div>

      {/* Capacity gate — shown once both procedure and date are selected */}
      {form.preferred_date && (
        <CapacityGate form={form} onMonthChange={handleMonthChange} />
      )}

      <div>
        <Label>Additional Notes (optional)</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Tell us about your goals..." className="mt-1.5 h-24" />
      </div>
    </div>
  );
}

export { procedures };