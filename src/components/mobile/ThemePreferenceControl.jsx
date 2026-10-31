import React from 'react';
import { Check, Moon, Sun, SunMoon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileTheme } from '@/context/MobileThemeContext';
import MSafeCard from './MSafeCard';
import MSafeText from './MSafeText';

/**
 * ThemePreferenceControl — the Auto / Light / Dark choice, and an honest account
 * of what Auto is currently using.
 *
 * Three facts are surfaced instead of hidden, because each one changes what the
 * traveller is looking at: which zone the clock comes from (trip destination,
 * their own choice, or the device), the local time in that zone, and whether a
 * usable zone was found at all. Approximate geolocation is never read, so the
 * "device" wording is the honest one — it is a browser setting, not a position.
 */

const OPTIONS = [
  { value: 'auto', label: 'Auto', Icon: SunMoon, hint: 'Follows local time' },
  { value: 'light', label: 'Light', Icon: Sun, hint: 'Always light' },
  { value: 'dark', label: 'Dark', Icon: Moon, hint: 'Always dark' },
];

const SOURCE_COPY = {
  journey: 'your trip destination',
  traveler: 'the time zone you chose',
  device: 'this device',
  fallback: 'no usable time zone',
};

export default function ThemePreferenceControl() {
  const { mode, setMode, resolved, clock, zoneName, source, usingFallback } = useMobileTheme();

  const status = usingFallback
    ? 'Time zone unavailable — showing light by day and dark by night in UTC. Your exact location is not being used.'
    : `Using ${SOURCE_COPY[source] || 'your device'}${zoneName ? ` · ${zoneName}` : ''}${clock ? ` · ${clock} local` : ''}`;

  return (
    <MSafeCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <MSafeText variant="title" as="h3">Appearance</MSafeText>
          <MSafeText variant="body" className="mt-1">
            Day and night styling for your journey. Your choice is remembered on your account.
          </MSafeText>
        </div>
        <span
          className="shrink-0 rounded-full border border-msafe-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-msafe-muted"
          aria-live="polite"
        >
          {resolved === 'night' ? 'Night' : 'Day'}
        </span>
      </div>

      <div role="radiogroup" aria-label="Appearance" className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, Icon, hint }) => {
          const selected = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label} — ${hint}`}
              onClick={() => setMode(value)}
              className={cn(
                'flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msafe-gold focus-visible:ring-offset-2',
                selected
                  ? 'border-msafe-gold bg-msafe-raised text-msafe-gold-ink'
                  : 'border-msafe-border bg-msafe-canvas text-msafe-muted hover:border-msafe-gold',
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="text-[13px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      <MSafeText as="p" variant="meta" className="mt-3">
        {status}
      </MSafeText>
      <MSafeText as="p" variant="meta" className="mt-1">
        {mode === 'auto'
          ? 'Light from 06:00 to 17:59 local, dark from 18:00. Updates by itself when you travel.'
          : 'Manual choice — this overrides the automatic day/night styling until you choose Auto again.'}
      </MSafeText>
    </MSafeCard>
  );
}