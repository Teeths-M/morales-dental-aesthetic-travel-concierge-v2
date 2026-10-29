import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { enqueueIncidentAction, flushIncidentQueue } from '@/lib/incidentOfflineQueue';

/**
 * DispatchOfferResponse — the responder's one-offer page, reached by the
 * unguessable offer token sent in the SMS.
 *
 * Accept and decline are the only actions. If the device is offline the
 * action is queued locally with the moment it was pressed, and replayed on
 * reconnect preserving that timestamp — so an accept that happened inside the
 * 90 seconds is never misrepresented as arriving after it expired.
 */
export default function DispatchOfferResponse() {
  const { token } = useParams();
  const [state, setState] = useState({ phase: 'idle', message: null });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      flushIncidentQueue((name, params) => base44.functions.invoke(name, params)).catch(() => {});
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
      });
      const body = res?.data ?? res;

      if (body?.expired) {
        setState({ phase: 'expired', message: 'This offer had already expired. The next responder has been contacted.' });
      } else if (body?.already_responded) {
        setState({ phase: 'done', message: `This offer was already answered (${body.offer_status}).` });
      } else if (body?.accepted) {
        setState({ phase: 'done', message: 'Accepted. The patient and their care team have been told you are on the way.' });
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

  const disabled = state.phase === 'sending' || state.phase === 'done' || state.phase === 'expired' || state.phase === 'queued';

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Morales emergency dispatch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are being offered an emergency response job. Offers expire 90 seconds after they are sent.
            {!online && ' You are currently offline.'}
          </p>

          {state.message && (
            <p className={`rounded-md border p-3 text-sm ${state.phase === 'expired' ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-secondary text-foreground'}`}>
              {state.message}
            </p>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}