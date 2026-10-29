import { useState, useRef, useEffect } from 'react';
import { Mic, Check, X } from 'lucide-react';

/**
 * SafetyQuestion — the one question the minor is asked, and nothing else.
 *
 * "Are you safe right now?" Answerable three ways: tap Yes, tap No, or speak.
 * There is no text box, no follow-up, and no second question, because a
 * frightened child should be given buttons, not a form.
 *
 * Voice uses the browser's speech recognition when the device supports it. If it
 * does not, the microphone is hidden rather than shown and broken — an answer
 * that silently fails to record would read as safety when it was silence.
 *
 * The component never decides anything. It hands the raw answer up; the server
 * classifies an unrecognised spoken answer as 'unknown' and stores the
 * transcript verbatim for a human to read.
 */
export default function SafetyQuestion({ onAnswer, disabled = false }) {
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const speechSupported = typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => {
    try { recognitionRef.current?.abort?.(); } catch { /* already stopped */ }
  }, []);

  const startVoice = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setError('Voice is not available on this device. Tap Yes or No instead.');
      return;
    }

    setError('');
    setSpoken('');
    setListening(true);

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // One short utterance — stop on the first result rather than streaming.
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
      setSpoken(transcript);
      setListening(false);
      if (transcript) onAnswer({ transcript });
      else setError('I did not catch that. Tap Yes or No, or try again.');
    };

    recognition.onerror = () => {
      setListening(false);
      setError('Voice did not work. Tap Yes or No instead.');
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('Voice did not start. Tap Yes or No instead.');
    }
  };

  return (
    <div className="w-full">
      <p className="text-center text-lg font-semibold text-foreground mb-1">
        Are you safe right now?
      </p>
      <p className="text-center text-sm text-muted-foreground mb-6">
        There is no wrong answer. Someone is already on their way to help.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled || listening}
          onClick={() => onAnswer({ answer: 'yes' })}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 bg-card px-4 py-6 text-base font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-50"
        >
          <Check className="h-5 w-5" aria-hidden="true" />
          Yes, I'm safe
        </button>

        <button
          type="button"
          disabled={disabled || listening}
          onClick={() => onAnswer({ answer: 'no' })}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-destructive/40 bg-card px-4 py-6 text-base font-semibold text-foreground transition-colors hover:border-destructive disabled:opacity-50"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          No, I need help
        </button>
      </div>

      {speechSupported && (
        <button
          type="button"
          disabled={disabled || listening}
          onClick={startVoice}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-medium text-foreground disabled:opacity-50"
        >
          <Mic className={`h-4 w-4 ${listening ? 'animate-pulse' : ''}`} aria-hidden="true" />
          {listening ? 'Listening…' : 'Say it instead'}
        </button>
      )}

      {spoken && <p className="mt-3 text-center text-xs text-muted-foreground">Heard: “{spoken}”</p>}
      {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}