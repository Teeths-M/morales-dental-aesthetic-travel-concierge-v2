import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { HandHeart, Loader2, WifiOff, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SafetyQuestion from '@/components/minor/SafetyQuestion';
import ModuleDisabledNotice from '@/components/minor/ModuleDisabledNotice';
import {
  enqueueTrigger,
  enqueueSafetyAnswer,
  flushMinorQueue,
  hasQueuedActions,
} from '@/lib/minorOfflineQueue';

/**
 * getQuickCoords — never blocks the alarm. Five seconds, then we go without.
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
      { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 30000 },
    );
  });
}

/**
 * MinorHelp — the minor's own screen, reached from a link on their device.
 *
 * One enormous button, and after it one question. Nothing else. The photo and
 * the rest of the child's record are never sent to this page, and this page can
 * never answer for the adult side.
 *
 * Offline behaviour is the important part: the moment the button is pressed is
 * captured on the device BEFORE any network attempt, and if the send fails the
 * action is queued with that original timestamp. A child in a basement with one
 * bar of signal still raised the alarm at the moment they pressed it, and the
 * server records it that way.
 */
export default function MinorHelp() {
  const { token } = useParams();
  const [phase, setPhase] = useState('idle'); // idle | sending | question | answered | queued | invalid
  const [caseId, setCaseId] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [sendingAnswer, setSendingAnswer] = useState(false);
  const [answerNote, setAnswerNote] = useState('');
  const [offline, setOffline] = useState(false);
  const answeredRef = useRef(false);

  const flush = useCallback(async () => {
    if (!hasQueuedActions()) return;
    const results = await flushMinorQueue((fn, payload) => base44.functions.invoke(fn, payload));
    const allOk = results.every((r) => r.ok);
    if (allOk) setOffline(false);
  }, []);

  useEffect(() => {
    flush();

    const onOnline = () => { flush(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  const raiseAlarm = async () => {
    setPhase('sending');

    // Stamped before the network is touched — this is the moment that counts.
    const occurredAt = new Date().toISOString();
    const coords = await getQuickCoords();

    try {
      const res = await base44.functions.invoke('openReunificationCase', {
        token,
        kind: 'help',
        occurred_at: occurredAt,
        ...(coords || {}),
      });
      const data = res?.data ?? res;

      if (!data?.case_id) throw new Error('no case returned');

      setCaseId(data.case_id);
      setFirstName(data.first_name || '');
      setPhase('question');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setPhase('invalid');
        return;
      }
      // Queued, not lost. The original timestamp travels with it.
      enqueueTrigger({ token, kind: 'help', ...(coords || {}) });
      setOffline(true);
      setPhase('queued');
    }
  };

  const submitAnswer = async (payload) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setSendingAnswer(true);
    setAnswerNote('');

    const coords = await getQuickCoords(4000);

    try {
      await base44.functions.invoke('recordMinorSafetyUpdate', {
        token,
        occurred_at: new Date().toISOString(),
        answer: payload.answer ?? null,
        transcript: payload.transcript ?? null,
        ...(coords || {}),
      });
      setPhase('answered');
    } catch {
      enqueueSafetyAnswer({
        token,
        answer: payload.answer ?? null,
        transcript: payload.transcript ?? null,
        ...(coords || {}),
      });
      setOffline(true);
      setAnswerNote("We saved your answer on this phone and will send it as soon as there is signal.");
      setPhase('answered');
    } finally {
      setSendingAnswer(false);
    }
  };

  if (phase === 'invalid') {
    return <ModuleDisabledNotice title="This link is not valid" />;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-md">

        {offline && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>No signal. Anything you do is saved on this phone and sent the moment it reconnects.</span>
          </div>
        )}

        {phase === 'idle' && (
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">M-Care</p>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {firstName ? `Hi ${firstName}.` : 'Are you okay?'}
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              Press the button and someone who can help will come. You do not need to explain anything.
            </p>

            <button
              type="button"
              onClick={raiseAlarm}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-8 text-lg font-bold text-primary-foreground shadow-sm"
            >
              <HandHeart className="h-6 w-6" aria-hidden="true" />
              I need help
            </button>
          </div>
        )}

        {phase === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Telling someone now…</p>
          </div>
        )}

        {phase === 'queued' && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Your alarm is saved</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This phone has no signal, so the alert will send itself the moment it reconnects —
              stamped with the exact time you pressed the button. Stay where you are if it is safe to do so.
            </p>
          </div>
        )}

        {phase === 'question' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="mb-5 rounded-lg bg-primary/5 px-3 py-2 text-center text-xs text-primary">
              Help is on the way{caseId ? ` — case ${caseId}` : ''}.
            </p>
            <SafetyQuestion onAnswer={submitAnswer} disabled={sendingAnswer} />
          </div>
        )}

        {phase === 'answered' && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Thank you for telling me</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your guardian and the adult leading your trip have been contacted. Keep this screen
              open if you can.
            </p>
            {answerNote && (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{answerNote}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}