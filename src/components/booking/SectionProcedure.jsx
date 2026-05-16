import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfMonth, endOfMonth, isBefore } from 'date-fns';
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

  const DISABLED_DAYS = [0, 4]; // Sunday (0) and Thursday (4)

  // Helper: check if a date is disabled (Sunday or Thursday)
  const isDisabledDate = (date) => DISABLED_DAYS.includes(date.getDay());

  // Helper: check if a date is in the past
  const isPastDate = (date) => isBefore(date, new Date().setHours(0, 0, 0, 0));

  // Build full calendar grid (6 rows × 7 columns = 42 cells)
  const buildCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun, 6=Sat

    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      let dayNumber, dateObj, isCurrentMonth;

      if (i < startWeekday) {
        // Previous month days
        dayNumber = prevMonthLastDay - (startWeekday - i) + 1;
        dateObj = new Date(year, month - 1, dayNumber);
        isCurrentMonth = false;
      } else if (i >= startWeekday + daysInMonth) {
        // Next month days
        dayNumber = i - (startWeekday + daysInMonth) + 1;
        dateObj = new Date(year, month + 1, dayNumber);
        isCurrentMonth = false;
      } else {
        // Current month days
        dayNumber = i - startWeekday + 1;
        dateObj = new Date(year, month, dayNumber);
        isCurrentMonth = true;
      }

      cells.push({
        day: dayNumber,
        date: dateObj,
        isCurrentMonth,
        isDisabled: isDisabledDate(dateObj),
        isPast: isPastDate(dateObj),
      });
    }
    return cells;
  };

  const calendarDays = buildCalendarDays();
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
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-border rounded-2xl shadow-xl z-50 p-6 w-11/12 max-w-sm max-h-96 overflow-y-auto"
              >
                {/* Month Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h4 className="font-display text-lg text-foreground">{format(currentMonth, 'MMMM yyyy')}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                  {calendarDays.map((cell, idx) => {
                    const isSelected = form.preferred_date && format(cell.date, 'yyyy-MM-dd') === form.preferred_date;
                    const canSelect = cell.isCurrentMonth && !cell.isPast && !cell.isDisabled;

                    const handleClick = () => {
                      if (canSelect) {
                        const dateStr = format(cell.date, 'yyyy-MM-dd');
                        update('preferred_date', dateStr);
                        setShowCalendar(false);
                      }
                    };

                    return (
                      <motion.button
                        key={idx}
                        onClick={handleClick}
                        disabled={!canSelect}
                        whileHover={canSelect ? { scale: 1.05 } : {}}
                        className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                          !cell.isCurrentMonth
                            ? 'text-muted-foreground/20 bg-transparent cursor-default'
                            : isSelected
                            ? 'bg-foreground text-primary-foreground shadow-md font-semibold'
                            : cell.isPast || cell.isDisabled
                            ? 'text-muted-foreground/30 bg-muted/20 cursor-not-allowed line-through opacity-60'
                            : 'bg-white border border-border hover:bg-sky-50 hover:border-sky-400 cursor-pointer'
                        }`}
                      >
                        {cell.day}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected date display */}
                <div className="bg-muted/30 rounded-lg p-2.5 text-center text-sm font-medium text-foreground mb-4 min-h-10 flex items-center justify-center">
                  {displayDate ? `✅ ${displayDate}` : 'No date selected'}
                </div>

                {/* Info message */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-3 mb-4 text-xs text-yellow-800">
                  ✈️ <strong>Flying days:</strong> Sundays & Thursdays are disabled and cannot be selected.
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCalendar(false);
                      update('preferred_date', '');
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCalendar(false)}
                    disabled={!displayDate}
                    className="flex-1"
                  >
                    Confirm
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Sundays & Thursdays are unavailable for procedure scheduling.</p>
      </div>

      {/* Capacity gate — shown once both procedure and date are selected */}
      {form.preferred_date && (
        <CapacityGate form={form} />
      )}

      <div>
        <Label>Additional Notes (optional)</Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Tell us about your goals..." className="mt-1.5 h-24" />
      </div>
    </div>
  );
}

export { procedures };