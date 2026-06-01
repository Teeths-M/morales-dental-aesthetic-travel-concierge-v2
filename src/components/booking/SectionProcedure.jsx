import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, isBefore } from 'date-fns';
import CapacityGate from './CapacityGate';
import TravelTimelineCard from './TravelTimelineCard';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

const procedures = [
  { group: '🦷 Dental', value: 'dental_implants', label: 'Dental Implants' },
  { group: '🦷 Dental', value: 'all_on_4', label: 'All-on-4 / All-on-6' },
  { group: '🦷 Dental', value: 'porcelain_veneers', label: 'Porcelain Veneers' },
  { group: '🦷 Dental', value: 'smile_makeover', label: 'Smile Makeover' },
  { group: '🦷 Dental', value: 'bone_regeneration', label: 'Bone Regeneration' },
  { group: '🦷 Dental', value: 'teeth_whitening', label: 'Teeth Whitening & Cosmetic Dentistry' },
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
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_sleeve', label: 'Gastric Sleeve (Sleeve Gastrectomy)' },
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_bypass', label: 'Gastric Bypass (Roux-en-Y)' },
  { group: '⚖️ Weight Loss & Bariatric', value: 'gastric_band_revision', label: 'Gastric Band Removal / Revision' },
  { group: '🌸 Fertility & Gynecology', value: 'gynecological_exams', label: 'Gynecological Diagnostic Exams' },
  { group: '🌸 Fertility & Gynecology', value: 'ivf', label: 'IVF (In Vitro Fertilization)' },
  { group: '🌸 Fertility & Gynecology', value: 'egg_freezing', label: 'Fertility Preservation (Egg Freezing)' },
  { group: '🎗️ Cancer Care', value: 'oncology_surgery', label: 'Oncological Surgical Procedures' },
  { group: '🎗️ Cancer Care', value: 'tumor_testing', label: 'Tumor Marker & Blood Panel Testing' },
  { group: '🦴 Orthopedic Surgery', value: 'joint_replacement', label: 'Joint Replacement (Hip & Knee)' },
  { group: '🦴 Orthopedic Surgery', value: 'spine_surgery', label: 'Spine Surgery' },
  { group: '🦴 Orthopedic Surgery', value: 'sports_arthroscopy', label: 'Sports Injuries & Arthroscopy' },
  { group: '🦴 Orthopedic Surgery', value: 'fracture_surgery', label: 'Fracture Management & Trauma Surgery' },
  { group: '', value: 'other', label: 'Other / Not Sure' },
];

// Map procedure titles from Procedures page to enum values
export const procedureTitleToEnum = {
  // Dental Implants mapping
  'Single Dental Implant': 'dental_implants',
  'Multiple Dental Implants': 'dental_implants',
  'Full Mouth Implants': 'dental_implants',
  'Dental Implant': 'dental_implants',
  'Implant Dentistry': 'dental_implants',
  'Implant-Supported Dentures': 'dental_implants',
  'Bone Grafting': 'bone_regeneration',
  'Sinus Lift': 'bone_regeneration',
  // All-on-4 mapping
  'All-on-4 Implants': 'all_on_4',
  'All-on-4': 'all_on_4',
  'All-on-6 Implants': 'all_on_4',
  'All-on-6': 'all_on_4',
  // Veneers mapping
  'Porcelain Veneers': 'porcelain_veneers',
  'Veneers': 'porcelain_veneers',
  'Composite Bonding': 'porcelain_veneers',
  // Smile mapping
  'Smile Makeover': 'smile_makeover',
  'Hollywood Smile': 'smile_makeover',
  'Gum Contouring': 'smile_makeover',
  // Teeth whitening
  'Teeth Whitening': 'teeth_whitening',
  // Rhinoplasty
  'Rhinoplasty': 'rhinoplasty',
  'Nose Reshaping': 'rhinoplasty',
  // Breast surgery
  'Breast Augmentation': 'breast_surgery',
  'Breast Lift': 'breast_surgery',
  'Breast Reduction': 'breast_surgery',
  'Breast Revision': 'breast_surgery',
  'Breast Surgery': 'breast_surgery',
  // Liposuction
  'Liposuction': 'liposuction',
  // Tummy tuck
  'Tummy Tuck': 'tummy_tuck',
  'Abdominoplasty': 'tummy_tuck',
  // Facelift
  'Facelift': 'facelift',
  'Neck Lift': 'facelift',
  // Eyelid
  'Eyelid Surgery': 'blepharoplasty',
  'Blepharoplasty': 'blepharoplasty',
  // Other facial
  'Brow Lift': 'brow_lift',
  'Otoplasty': 'otoplasty',
  'Ear Reshaping': 'otoplasty',
  'Thigh Lift': 'thigh_arm_lift',
  'Arm Lift': 'thigh_arm_lift',
  'Thigh Arm Lift': 'thigh_arm_lift',
  // Skin
  'Laser Resurfacing': 'laser_resurfacing',
  'Skin Rejuvenation': 'laser_resurfacing',
  'Mole Removal': 'mole_removal',
  'Lipoma Removal': 'lipoma_removal',
  // Bariatric
  'Gastric Sleeve': 'gastric_sleeve',
  'Sleeve Gastrectomy': 'gastric_sleeve',
  'Gastric Bypass': 'gastric_bypass',
  'Gastric Band Revision': 'gastric_band_revision',
  'Gastric Band Removal': 'gastric_band_revision',
  // Gynecology
  'Gynecological Exams': 'gynecological_exams',
  'Gynecological Diagnostic Exams': 'gynecological_exams',
  // Fertility
  'IVF': 'ivf',
  'In Vitro Fertilization': 'ivf',
  'Egg Freezing': 'egg_freezing',
  'Fertility Preservation': 'egg_freezing',
  // Oncology
  'Oncology Surgery': 'oncology_surgery',
  'Oncological Surgical Procedures': 'oncology_surgery',
  'Tumor Testing': 'tumor_testing',
  'Tumor Marker': 'tumor_testing',
  // Orthopedic
  'Joint Replacement': 'joint_replacement',
  'Hip Replacement': 'joint_replacement',
  'Knee Replacement': 'joint_replacement',
  'Spine Surgery': 'spine_surgery',
  'Sports Arthroscopy': 'sports_arthroscopy',
  'Sports Injuries': 'sports_arthroscopy',
  'Fracture Surgery': 'fracture_surgery',
  'Fracture Management': 'fracture_surgery',
  // Orthodontics (map to other as not in enum)
  'Braces': 'other',
  'Invisalign': 'other',
  'Clear Aligners': 'other',
  'Retainers': 'other',
  // General dentistry (map to other)
  'Dental Cleaning': 'other',
  'Deep Cleaning': 'other',
  'Dental Exam': 'other',
  'Dental X-Rays': 'other',
  'Fillings': 'other',
  'Tooth Extraction': 'other',
  'Wisdom Tooth Removal': 'other',
  'Root Canal': 'other',
  'Dental Crowns': 'other',
  'Dental Bridges': 'other',
  'Dentures': 'other',
  'Partial Dentures': 'other',
  'Inlays Onlays': 'other',
  // Wellness
  'IV Therapy': 'other',
  'Stem Cell Therapy': 'other',
  'PRP Therapy': 'other',
  'Hormone Therapy': 'other',
  'Medical Weight Loss': 'other',
  'Nutritional Programs': 'other',
  'Recovery Therapy': 'other',
  // Body contouring (map to other as not in enum)
  'Body Contouring': 'other',
  'Mommy Makeover': 'other',
  'Brazilian Butt Lift': 'other',
  'BBL': 'other',
  'Arm Lift': 'other',
  'Thigh Lift': 'other',
  // Non-surgical
  'Botox': 'other',
  'Dermal Fillers': 'other',
};

// Helper function to get enum value from procedure title
export const getProcedureEnumValue = (title) => {
  if (!title) return 'other';
  return procedureTitleToEnum[title] || 'other';
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function SectionProcedure({ form, update }) {
  const [currentMonth, setCurrentMonth] = useState(
    form.preferred_date ? new Date(form.preferred_date + 'T12:00:00') : new Date()
  );
  const [doctorUnavailableDates, setDoctorUnavailableDates] = useState(new Set());
  const { items } = useCart();

  // Fetch all doctor unavailability records and build a blocked-dates set
  useEffect(() => {
    base44.entities.DoctorAvailability.list().then((records) => {
      const blocked = new Set();
      records.forEach((r) => {
        if (r.is_available === false) {
          blocked.add(r.date);
        }
      });
      setDoctorUnavailableDates(blocked);
    }).catch(() => {});
  }, []);

  const isDoctorUnavailable = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return doctorUnavailableDates.has(dateStr);
  };

  const isDisabledDate = (date) => {
    const day = date.getDay();
    return day === 0 || day === 4;
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  };

  const buildCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      let dayNumber, dateObj, isCurrentMonth;
      if (i < startWeekday) {
        dayNumber = prevMonthLastDay - (startWeekday - i) + 1;
        dateObj = new Date(year, month - 1, dayNumber);
        isCurrentMonth = false;
      } else if (i >= startWeekday + daysInMonth) {
        dayNumber = i - (startWeekday + daysInMonth) + 1;
        dateObj = new Date(year, month + 1, dayNumber);
        isCurrentMonth = false;
      } else {
        dayNumber = i - startWeekday + 1;
        dateObj = new Date(year, month, dayNumber);
        isCurrentMonth = true;
      }
      cells.push({ day: dayNumber, date: dateObj, isCurrentMonth, isDisabled: isDisabledDate(dateObj), isPast: isPastDate(dateObj), isDoctorOff: isDoctorUnavailable(dateObj) });
    }
    return cells;
  };

  const calendarDays = buildCalendarDays();

  const toDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleDayClick = (cell) => {
    if (!cell.isCurrentMonth || cell.isPast || cell.isDisabled || cell.isDoctorOff) return;
    update('preferred_date', toDateStr(cell.date));
  };

  const displayDate = form.preferred_date
    ? format(new Date(form.preferred_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏥</span>
        <h3 className="font-display text-lg text-foreground">Procedure & Date</h3>
      </div>

      {/* Inline Calendar */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          Preferred Consultation Date <span className="text-destructive">*</span>
        </Label>

        <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-slate-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="h-8 w-8 rounded-full hover:bg-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h4 className="font-display text-base font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-8 w-8 rounded-full hover:bg-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_LABELS.map((day) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-semibold ${
                  day === 'Su' || day === 'Th' ? 'text-red-400' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 p-3 gap-1">
            {calendarDays.map((cell, idx) => {
              const isSelected = form.preferred_date && toDateStr(cell.date) === form.preferred_date;
              const canSelect = cell.isCurrentMonth && !cell.isPast && !cell.isDisabled && !cell.isDoctorOff;

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(cell)}
                  disabled={!canSelect}
                  title={cell.isDoctorOff ? 'Doctor unavailable on this date' : undefined}
                  className={`
                    aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all relative
                    ${!cell.isCurrentMonth
                      ? 'text-muted-foreground/20 cursor-default'
                      : isSelected
                      ? 'bg-primary text-primary-foreground shadow-md font-semibold'
                      : cell.isPast
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : cell.isDisabled
                      ? 'text-red-300 cursor-not-allowed line-through'
                      : cell.isDoctorOff
                      ? 'bg-orange-50 text-orange-300 cursor-not-allowed line-through'
                      : 'hover:bg-primary/10 hover:text-primary cursor-pointer text-foreground'
                    }
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Selected date pill */}
          <div className="px-4 pb-3">
            <div className={`rounded-xl px-4 py-2.5 text-sm text-center font-medium transition-all ${
              displayDate
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted/40 text-muted-foreground border border-transparent'
            }`}>
              {displayDate ? `✅ ${displayDate}` : 'No date selected — tap a date above'}
            </div>
          </div>

          {/* Logistics note */}
          <div className="mx-4 mb-4 space-y-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-800">
              ✈️ <strong>Sundays & Thursdays</strong> are reserved for flight logistics and cannot be booked as procedure dates.
            </div>
            {doctorUnavailableDates.size > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-xs text-orange-800">
                🩺 <strong>Strikethrough dates</strong> are marked unavailable by our doctors and cannot be selected.
              </div>
            )}
          </div>
        </div>
      </div>

      {form.preferred_date && <CapacityGate form={form} />}

      {form.preferred_date && items.length > 0 && (
        <TravelTimelineCard selectedDate={form.preferred_date} cartItems={items} />
      )}

      <div>
        <Label>Additional Notes (optional)</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Tell us about your goals..."
          className="mt-1.5 h-24"
        />
      </div>
    </div>
  );
}

export { procedures };