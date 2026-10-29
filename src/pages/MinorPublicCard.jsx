import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ModuleDisabledNotice from '@/components/minor/ModuleDisabledNotice';

/**
 * getQuickCoords — a location fix that is allowed to fail.
 *
 * Capped at 5 seconds on purpose. A stranger holding a lost child's card must
 * not stand there waiting for a GPS lock before the alarm is raised — if the fix
 * is slow we send without it and the server falls back to the minor's last known
 * position instead.
 */
function getQuickCoords(maxWaitMs = 5000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => resolve(null), maxWaitMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 60000 },
    );
  });
}

/**
 * MinorPublicCard — everything a stranger sees when they scan the printed card.
 *
 * The whole disclosure surface is a first name, a case id, and a phone number to
 * call. No surname, no date of birth, no photo, no guardian details. The scan
 * itself is one of the four triggers, so merely opening this page raises the
 * alarm — which is the point: the person who found the child should not have to
 * work out how to report it.
 */
export default function MinorPublicCard() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');

    const coords = await getQuickCoords();

    try {
      const res = await base44.functions.invoke('getMinorCardContext', {
        token,
        occurred_at: new Date().toISOString(),
        ...(coords || {}),
      });
      const data = res?.data ?? res;
      setCard(data);
      setState('ready');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setState('invalid');
      } else {
        setError('We could not reach Morales just now. Please call the number below.');
        setState('error');
      }
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (state === 'invalid') {
    return <ModuleDisabledNotice title="This card is not recognised" />;
  }

  const phone = card?.care_team_phone;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-12 bg-background">
      <div className="w-full max-w-md">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Raising the alarm…</p>
          </div>
        )}

        {state !== 'loading' && (
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-widest">Morales care</span>
            </div>

            <h1 className="text-2xl font-semibold text-foreground">
              This card belongs to {card?.first_name || 'a child'}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {card?.case_id
                ? 'Their care team has already been alerted and someone is being contacted right now. Please stay with them.'
                : 'Please call the Morales care team using the button below.'}
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {card?.case_id && (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                Case {card.case_id}
              </p>
            )}

            {phone ? (
              <a
                href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                Call Morales now
              </a>
            ) : (
              <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                No care-team number is configured. Please contact the local authorities.
              </p>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              Nothing else about this child is shown here. Opening this page told their care team
              where you are.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}