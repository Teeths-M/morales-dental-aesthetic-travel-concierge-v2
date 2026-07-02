import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plane, Moon, Sparkles, Plus, Minus } from 'lucide-react';

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
  const [extraDays, setExtraDays] = useState(0); // client can only add days on top of minimum

  const base = useMemo(() => {
    if (!selectedDate || !cartItems?.length) return null;

    const procedureDate = parseDateStr(selectedDate);

    // Arrival = most recent Sunday or Thursday BEFORE the procedure date
    const arrivalDate = snapToFlightDay(procedureDate, 'back');

    return { arrivalDate, procedureDate };
  }, [selectedDate, cartItems]);

  if (!base) return null;

  const { arrivalDate, procedureDate } = base;

  // Departure = next Sunday or Thursday after (procedure date + extraDays)
  const earliestDeparture = new Date(procedureDate);
  earliestDeparture.setDate(procedureDate.getDate() + extraDays);
  const departureDate = snapToFlightDay(earliestDeparture, 'forward');

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.round((departureDate.getTime() - arrivalDate.getTime()) / msPerDay) + 1;
  const totalNights = totalDays - 1;
  const isExtended = extraDays > 0;

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
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#C5A059' }}>Medical Travel Review</p>
          <h4 className="text-sm font-semibold text-white">Recommended Medical Travel Timeline</h4>
        </div>
        {/* Trip duration badge + stepper */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => setExtraDays(d => Math.max(0, d - 1))}
            disabled={extraDays === 0}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)', color: '#C5A059' }}
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)', color: '#C5A059' }}>
            <Moon className="w-3 h-3" />
            {totalDays} Days · {totalNights} Nights
          </div>
          <button
            onClick={() => setExtraDays(d => d + 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)', color: '#C5A059' }}
          >
            <Plus className="w-3 h-3" />
          </button>
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
          background: isExtended ? 'rgba(197,160,89,0.08)' : 'rgba(197, 160, 89, 0.08)',
          border: '1px solid rgba(197,160,89,0.25)',
        }}
      >
        {isExtended ? (
          <div className="flex gap-3">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C5A059' }} />
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#C5A059' }}>✨ Extended Stay Selected (+{extraDays} day{extraDays !== 1 ? 's' : ''})</p>
              <p className="text-xs leading-relaxed text-white/70">
                Your return date has been adjusted. Use − to reduce your stay back to the 3-day minimum.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C5A059' }} />
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#C5A059' }}>✨ Recommended Minimum Window</p>
              <p className="text-xs leading-relaxed text-white/70">
                Arrive on the nearest flight day before your procedure, then fly home on the next available flight day. Use + to extend your stay if you'd like more recovery time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ icon, label, value, sub, accent = false, highlight = false }) {
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
        <p className="text-sm font-semibold text-white truncate">{value}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
      </div>
      {highlight && (
        <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(197,160,89,0.2)', color: '#C5A059', border: '1px solid rgba(197,160,89,0.4)' }}>
          Surgery Day
        </span>
      )}
    </div>
  );
}