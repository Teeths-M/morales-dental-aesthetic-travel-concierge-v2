import { Moon, Sun, Globe, Timer, ShieldCheck } from 'lucide-react';
import { RETENTION } from '@/lib/tripAssistance';

function Chip({ icon: Icon, label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-border bg-card text-foreground',
    warn: 'border-amber-300/70 bg-amber-50 text-amber-900',
    ok: 'border-emerald-300/70 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-tight">{value}</p>
    </div>
  );
}

/**
 * AssistanceStatusBar — the four facts that decide whether a request may be
 * made at all: how many are left today, how many are left on the trip, whether
 * it is quiet hours, and what happens to the record afterwards.
 *
 * Shown before the categories, because a traveller who is out of allowance
 * should learn that before they write a request they cannot send.
 */
export default function AssistanceStatusBar({ policy, usage, quiet }) {
  const languages = (policy?.languages || []).join(' · ') || '—';
  const retention = policy?.retention_days_outcomes || RETENTION.outcomesDays;
  const audio = policy?.retention_days_audio || RETENTION.audioDays;

  return (
    <section aria-label="Allowance and quiet hours" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Chip
        icon={Timer}
        label="Left today"
        value={`${usage?.per_day_remaining ?? 0} of ${policy?.per_day_cap ?? 0}`}
        tone={usage?.per_day_remaining > 0 ? 'neutral' : 'warn'}
      />
      <Chip
        icon={ShieldCheck}
        label="Left this trip"
        value={`${usage?.per_trip_remaining ?? 0} of ${policy?.per_trip_cap ?? 0}`}
      />
      <Chip
        icon={quiet?.is_quiet_now ? Moon : Sun}
        label="Quiet hours"
        value={quiet?.is_quiet_now ? `Quiet until ${quiet.ends_at_label}` : quiet?.window_label || 'None'}
        tone={quiet?.is_quiet_now ? 'warn' : 'ok'}
      />
      <Chip icon={Globe} label="Languages" value={languages} />
      <p className="col-span-2 text-[11px] leading-relaxed text-muted-foreground sm:col-span-4">
        Errands may be called outside quiet hours only if you ask for the call. Anything at tier 3
        ignores quiet hours. Records keep the structured outcome for {retention} days after your
        trip ends; call recordings, if any exist, are deleted after {audio} days unless they belong
        to an incident.
      </p>
    </section>
  );
}