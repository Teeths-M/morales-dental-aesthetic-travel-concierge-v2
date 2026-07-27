import React, { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Matches QuestionCard.jsx's CALM palette exactly — this field lives inside
// that flow's cards, not the global dashboard theme.
const TEXT = '#17302C';
const TEXT_FAINT = '#8A9B96';
const BORDER = '#E2E9E6';

const triggerStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  background: '#EEF3F1',
  border: `1px solid ${BORDER}`,
  fontSize: 15,
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
};

/**
 * Expedia/Airbnb-style popover calendar for the travel intake flow's date
 * steps. `value`/`onChange` stay ISO 'yyyy-MM-dd' strings — the same
 * contract the native <input type="date"> it replaces used, so nothing
 * downstream (fieldMap.js, the entity's date format) changes.
 */
export default function DateField({ value, onChange, minDate, placeholder = 'Select a date' }) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={triggerStyle}>
          <span style={{ color: selected ? TEXT : TEXT_FAINT }}>
            {selected ? format(selected, 'MMM d, yyyy') : placeholder}
          </span>
          <CalendarIcon size="18" color={TEXT_FAINT} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="bg-white border border-[#E2E9E6] rounded-2xl shadow-lg p-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected || minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, 'yyyy-MM-dd'));
            setOpen(false);
          }}
          classNames={{
            day_selected: 'bg-[#0E8A7D] text-white hover:bg-[#0E8A7D] hover:text-white focus:bg-[#0E8A7D] focus:text-white',
            day_today: 'border border-[#D4AF37] text-[#17302C]',
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
