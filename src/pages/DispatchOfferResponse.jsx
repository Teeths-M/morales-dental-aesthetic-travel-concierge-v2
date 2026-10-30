import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { enqueueIncidentAction, flushIncidentQueue } from '@/lib/incidentOfflineQueue';
import { MapPin, Clock, CheckCircle2, Navigation, AlertTriangle } from 'lucide-react';

const ETA_CHOICES = [10, 15, 20, 30, 45];

/**
 * DispatchOfferResponse — the responder's page, reached by the unguessable
 * offer token sent in the SMS.
 *
 * Three separate steps, because they are three separate facts:
 *   accept      → the ETA starts existing, and the arrival deadline is set from
 *                 that moment with max(10 min, half the ETA) capped at 25
 *   I'm here    → a GPS check-in that only validates inside the confirmed
 *                 destination's radius. A tap alone cannot record an arrival.
 *   what I saw  → the in-person outcome. This beats a phone call, because he is
 *                 already standing there.
 *
 * If the device is offline the accept/decline is queued with the moment it was
 * pressed, and replayed on reconnect preserving that timestamp.
 */
export default function DispatchOfferResponse() {
  const { token } = useParams();
  const [state, setState] = useState({ phase: 'idle', message: null });
  const [offer, setOffer] = useState(null);
  const [brief, setBrief] = useState(null);
  const [incident, setIncident] = useState(null);
  const [eta, setEta] = useState('');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const loadState = async () => {
    try {
      const res = await base44.functions.invoke('getDispatchOfferState', { offer_token: token });
      const body = res?.data || res;
      if (body?.offer) {
        setOffer(body.offer);
        setBrief(body.offer.driver_brief || null);
        setIncident(body.incident || null);
      }
    } catch { /* the accept/decline path still works without this */ }
  };

  useEffect(() => {
    loadState();
    const goOnline = () => {
      setOnline(true);
      flushIncidentQueue((name, params) => base44.functions.invoke(name, params)).catch(() => {});
      loadState();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const respond = async (action) => {
    setState({ phase: 'sending', message: null });

    if (!online) {
      enqueueIncidentAction({ offer_token: token, action });
      setState({
        phase: 'queued',
        message: 'You are offline. Your response is saved on this device with the time you pressed it, and will be sent the moment you reconnect.',
      });
      return;
    }

    try {
      const res = await base44.functions.invoke('respondToDispatchOffer', {
        offer_token: token,
        action,
        occurred_at: new Date().toISOString(),
        eta_seconds: action === 'accept' && eta ? Number(eta) * 60 : null,
      });
      const body = res?.data ?? res;

      if (body?.expired) {
        setState({ phase: 'expired', message: 'This offer had already expired. The next responder has been contacted.' });
      } else if (body?.already_responded) {
        setState({ phase: 'done', message: `This offer was already answered (${body.offer_status}).` });
      } else if (body?.accepted) {
        setState({ phase: 'accepted', message: 'Accepted. Your arrival time is now being tracked.' });
        loadState();
      } else {
        setState({ phase: 'done', message: 'Declined. The next responder has been contacted.' });
      }
    } catch (error) {
      enqueueIncidentAction({ offer_token: token, action });
      setState({
        phase: 'queued',
        message: `Couldn't reach the server. Your response is saved on this device and will be sent automatically (${String(error?.message || error)}).`,
      });
    }
  };

  const checkIn = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('This device cannot provide a GPS position, so arrival cannot be recorded.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await base44.functions.invoke('tripCardArrival', {
            offer_token: token,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          const body = res?.data || res;
          if (body?.error) {
            setLocError(body.distance_m != null
              ? `${body.error} You are ${body.distance_m} m from the confirmed destination.`
              : body.error);
          } else {
            await loadState();
            setState({ phase: 'arrived', message: 'Arrival recorded from your position.' });
          }
        } catch (e) {
          setLocError(e?.response?.data?.error || 'The check-in could not be sent. Try again where you have signal.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocError('Location permission is needed to record arrival — a tap alone cannot, because the arrival time is a fact the record is judged on later.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const confirmInPerson = async (outcome) => {
    try {
      const res = await base44.functions.invoke('tripCardDriverConfirm', {
        offer_token: token,
        outcome,
      });
      const body = res?.data || res;
      if (body?.error) {
        setLocError(body.error);
        return;
      }
      setState({
        phase: 'confirmed',
        message: outcome === 'traveller_safe'
          ? 'Recorded. The care team has your in-person confirmation.'
          : 'Recorded, and the care team has been paged with what you found.',
      });
      loadState();
    } catch (e) {
      setLocError(e?.response?.data?.error || 'That could not be saved. Try again.');
    }
  };

  const status = offer?.status || null;
  const arrived = !!offer?.arrived_at;
  const canAccept = !status || status === 'OFFERED';
  const disabled = state.phase === 'sending' || state.phase === 'done' || state.phase === 'expired' || state.phase === 'queued';

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">M-Care emergency dispatch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canAccept ? (
            <p className="text-sm text-muted-foreground">
              You are being offered an emergency response job. Offers expire 90 seconds after they are sent.
              {!online && ' You are currently offline.'}
            </p>
          ) : null}

          {state.message && (
            <p className={`rounded-md border p-3 text-sm ${state.phase === 'expired' ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-secondary text-foreground'}`}>
              {state.message}
            </p>
          )}

          {canAccept && (
            <>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Your ETA once you accept (optional)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ETA_CHOICES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEta(eta === String(m) ? '' : String(m))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        eta === String(m) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  Your arrival deadline starts when you accept: this ETA plus a buffer of max(10 min, half the ETA), capped at 25.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => respond('accept')}
                  disabled={disabled}
                  className="flex-1 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond('decline')}
                  disabled={disabled}
                  className="flex-1 rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </>
          )}

          {!canAccept && status !== 'OFFERED' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Job status</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {status}
                  {offer?.arrival_deadline_missed_at ? ' — arrival deadline missed' : ''}
                  {offer?.superseded ? ' — superseded' : ''}
                </p>
                {incident?.traveller_first_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Traveller: {incident.traveller_first_name}
                  </p>
                )}
                {offer?.arrival_deadline_at && !arrived && (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-foreground">
                    <Clock className="w-3 h-3" />
                    Arrive by {new Date(offer.arrival_deadline_at).toLocaleTimeString()}
                  </p>
                )}
              </div>

              {brief?.destination && (
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Navigation className="w-3 h-3" /> Go to
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{brief.destination}</p>
                  {Array.isArray(brief.addresses) && brief.addresses.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                      <p className="text-[10.5px] text-muted-foreground">
                        Both reported places — each labelled by who reported it.
                      </p>
                      {brief.addresses.map((a, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 w-3 h-3 shrink-0 text-muted-foreground" />
                          <span className="text-[11.5px] text-foreground">
                            {a.label}
                            <span className="block text-[10.5px] text-muted-foreground">
                              reported by {String(a.reported_by || '').replace(/_/g, ' ')}
                              {a.reported_at ? ` · ${new Date(a.reported_at).toLocaleTimeString()}` : ''}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {status === 'ACCEPTED' && !arrived && (
                <button
                  type="button"
                  onClick={checkIn}
                  disabled={locating}
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {locating ? 'Getting your position…' : 'I have arrived — check in my location'}
                </button>
              )}

              {arrived && (
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Arrival recorded
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(offer.arrived_at).toLocaleTimeString()}
                    {offer.gps_checkin_distance_m != null ? ` · ${offer.gps_checkin_distance_m} m from the destination` : ''}
                  </p>

                  {offer.in_person_outcome ? (
                    <p className="mt-2 text-[11.5px] text-foreground">
                      You reported: {String(offer.in_person_outcome).replace(/_/g, ' ')}
                    </p>
                  ) : (
                    <div className="mt-2.5 space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        What did you find when you got there?
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => confirmInPerson('traveller_safe')}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Traveller is safe
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmInPerson('help_needed')}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-secondary"
                        >
                          Help is needed
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmInPerson('unknown')}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Can&apos;t tell
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {locError && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> {locError}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}