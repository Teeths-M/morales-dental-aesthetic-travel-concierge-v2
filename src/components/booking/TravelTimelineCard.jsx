import React, { useMemo } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Plane, CalendarDays, Moon, AlertTriangle, Sparkles } from 'lucide-react';

// Flight days: 0 = Sunday, 4 = Thursday
const FLIGHT_DAYS = [0, 4];

// Procedure recovery data defaults — used when ProcedurePricing DB data is unavailable
const PROCEDURE_DEFAULTS = {
  dental_implants:      { preparation_days: 1, min_safe_recovery_days: 5 },
  all_on_4:             { preparation_days: 2, min_safe_recovery_days: 7 },
  porcelain_veneers:    { preparation_days: 1, min_safe_recovery_days: 3 },
  smile_makeover:       { preparation_days: 2, min_safe_recovery_days: 5 },
  bone_regeneration:    { preparation_days: 2, min_safe_recovery_days: 7 },
  teeth_whitening:      { preparation_days: 1, min_safe_recovery_days: 2 },
  rhinoplasty:          { preparation_days: 2, min_safe_recovery_days: 10 },
  breast_surgery:       { preparation_days: 2, min_safe_recovery_days: 7  },
  liposuction:          { preparation_days: 1, min_safe_recovery_days: 5  },
  tummy_tuck:           { preparation_days: 2, min_safe_recovery_days: 10 },
  facelift:             { preparation_days: 2, min_safe_recovery_days: 10 },
  brow_lift:            { preparation_days: 1, min_safe_recovery_days: 7  },
  blepharoplasty:       { preparation_days: 1, min_safe_recovery_days: 5  },
  otoplasty:            { preparation_days: 1, min_safe_recovery_days: 5  },
  thigh_arm_lift:       { preparation_days: 2, min_safe_recovery_days: 10 },
  laser_resurfacing:    { preparation_days: 1, min_safe_recovery_days: 4  },
  mole_removal:         { preparation_days: 1, min_safe_recovery_days: 3  },
  lipoma_removal:       { preparation_days: 1, min_safe_recovery_days: 3  },
  gastric_sleeve:       { preparation_days: 3, min_safe_recovery_days: 10 },
  gastric_bypass:       { preparation_days: 3, min_safe_recovery_days: 12 },
  gastric_band_revision:{ preparation_days: 2, min_safe_recovery_days: 7  },
  gynecological_exams:  { preparation_days: 1, min_safe_recovery_days: 2  },
  ivf:                  { preparation_days: 3, min_safe_recovery_days: 5  },
  egg_freezing:         { preparation_days: 2, min_safe_recovery_days: 3  },
  oncology_surgery:     { preparation_days: 3, min_safe_recovery_days: 14 },
  tumor_testing:        { preparation_days: 1, min_safe_recovery_days: 2  },
  joint_replacement:    { preparation_days: 3, min_safe_recovery_days: 14 },
  spine_surgery:        { preparation_days: 3, min_safe_recovery_days: 14 },
  sports_arthroscopy:   { preparation_days: 1, min_safe_recovery_days: 7  },
  fracture_surgery:     { preparation_days: 2, min_safe_recovery_days: 10 },
  other:                { preparation_days: 2, min_safe_recovery_days: 7  },
};

// Snap a date to the nearest flight day:
// direction = 'back'    => most recent preceding Sunday or Thursday
// direction = 'forward' => next upcoming Sunday or Thursday
function snapToFlightDay(date, direction = 'back') {
  const d = new Date(date);
  for (let i = 0; i <= 7; i++) {
    const offset = direction === 'back' ? -i : i;
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + offset);
    if (FLIGHT_DAYS.includes(candidate.getDay())) return candidate;
  }
  return d;
}

function parseDateStr(str) {
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function fmtDate(date) {
  return format(date, 'MMMM d, yyyy');
}

export default function TravelTimelineCard({ selectedDate, cartItems }) {
  const timeline = useMemo(() => {
    if (!selectedDate || !cartItems?.length) return null;

    // Extract max preparation_days and min_safe_recovery_days across all selected procedures
    let maxPrep = 1;
    let maxRecovery = 3;

    for (const item of cartItems) {
      const key = item.value || item.procedure_value || item.id;
      const defaults = PROCEDURE_DEFAULTS[key] || PROCEDURE_DEFAULTS['other'];
      const prep = item.preparation_days ?? defaults.preparation_days;
      const recovery = item.min_safe_recovery_days ?? defaults.min_safe_recovery_days;
      if (prep > maxPrep) maxPrep = prep;
      if (recovery > maxRecovery) maxRecovery = recovery;
    }

    const procedureDate = parseDateStr(selectedDate);

    // Raw ideal dates before snapping
    const rawArrival = new Date(procedureDate);
    rawArrival.setDate(procedureDate.getDate() - maxPrep);

    const rawDeparture = new Date(procedureDate);
    rawDeparture.setDate(procedureDate.getDate() + maxRecovery + 1);

    // Snap to nearest valid flight day
    const arrivalDate  = snapToFlightDay(rawArrival, 'back');
    const departureDate = snapToFlightDay(rawDeparture, 'forward');

    // Total trip = departure - arrival (inclusive)
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((departureDate - arrivalDate) / msPerDay) + 1;
    const totalNights = totalDays - 1;

    const isExtended = totalDays > 14;

    return { arrivalDate, procedureDate, departureDate, totalDays, totalNights, isExtended, maxPrep, maxRecovery };
  }, [selectedDate, cartItems]);

  if (!timeline) return null;

  const { arrivalDate, procedureDate, departureDate, totalDays, totalNights, isExtended } = timeline;

  return (
    <div
      className="rounded-2xl overflow-hidden border mt-6"
      style={{ borderColor: '#C5A059', background: 'linear-gradient(135deg, #0F3A20 0%, #1a4f2e 60%, #0c2e19 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(197,160,89,0.25)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.3)' }}>
          <Plane className="w-4 h-4" style={{ color: '#C5A059' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C5A059' }}>SAFE-T4LIFE™ Engine</p>
          <h4 className="text-sm font-bold text-white">Recommended Medical Travel Timeline</h4>
        </div>
        {/* Trip duration badge */}
        <div className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5" style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)', color: '#C5A059' }}>
          <Moon className="w-3 h-3" />
          {totalDays} Days · {totalNights} Nights
        </div>
      </div>

      {/* Timeline rows */}
      <div className="px-5 py-4 space-y-3">
        <TimelineRow
          icon="✈️"
          label="Recommended Arrival"
          value={fmtDate(arrivalDate)}
          sub="Check into hotel, pre-op orientation"
          accent
        />
        <div className="h-px opacity-10 bg-white" />
        <TimelineRow
          icon="🏥"
          label="Procedure Date"
          value={fmtDate(procedureDate)}
          sub="Surgery / treatment day"
          highlight
        />
        <div className="h-px opacity-10 bg-white" />
        <TimelineRow
          icon="🛫"
          label="Recommended Return"
          value={fmtDate(departureDate)}
          sub="Post-op cleared — fly home"
          accent
        />
      </div>

      {/* Compliance notice */}
      <div
        className="mx-5 mb-5 rounded-xl p-4"
        style={{
          background: isExtended ? 'rgba(217, 119, 6, 0.12)' : 'rgba(197, 160, 89, 0.08)',
          border: `1px solid ${isExtended ? 'rgba(217,119,6,0.35)' : 'rgba(197,160,89,0.25)'}`,
        }}
      >
        {isExtended ? (
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} />
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: '#fbbf24' }}>⚠️ Safety Compliance Notice</p>
              <p className="text-xs leading-relaxed text-white/70">
                Based on your selected combination of treatments, extended recovery time is recommended for your absolute biological safety. If you have limited travel availability, your assigned doctor can review your profile for a custom compressed timeline override.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C5A059' }} />
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: '#C5A059' }}>✨ SAFE-T4LIFE™ Optimization</p>
              <p className="text-xs leading-relaxed text-white/70">
                This timeline is balanced for both safe clinical recovery and realistic vacation schedules. Most patients safely complete treatment and return home comfortably within a 1–2 week window, continuing minor follow-up care remotely.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ icon, label, value, sub, accent, highlight }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{
          background: highlight
            ? 'rgba(197,160,89,0.2)'
            : 'rgba(255,255,255,0.05)',
          border: highlight ? '1px solid rgba(197,160,89,0.5)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
      </div>
      {highlight && (
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(197,160,89,0.2)', color: '#C5A059', border: '1px solid rgba(197,160,89,0.4)' }}>
          Surgery Day
        </span>
      )}
    </div>
  );
}