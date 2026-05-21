import React from 'react';
import { canReachProcedureDate, dayNames, formatDate, isoDate, addDays } from './dateUtils';

export default function FlightDatePicker({ destination, value, onChange }) {
  const days = Array.from({ length: 75 }, (_, i) => addDays(new Date(), i + 1));
  const flightDays = destination?.flight_days || [];
  const buffer = destination?.default_buffer_days || 1;

  return (
    <div className="space-y-4">
      {destination && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Flights to {destination.country} operate only on {flightDays.map(d => dayNames[d]).join(' and ')}. Your procedure must be scheduled with enough time to arrive at least {buffer} day before care.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {days.map((day) => {
          const allowed = destination ? canReachProcedureDate(day, flightDays, buffer) : false;
          const selected = value === isoDate(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!allowed}
              onClick={() => onChange(isoDate(day))}
              className={`rounded-xl border p-3 text-left text-sm transition ${selected ? 'border-primary bg-primary text-primary-foreground' : allowed ? 'border-border bg-card hover:border-primary' : 'cursor-not-allowed border-muted bg-muted/50 text-muted-foreground opacity-60'}`}
            >
              {formatDate(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}