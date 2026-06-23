import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mic, Square, Volume2, PhoneOff, Radio, Signal, WifiOff, AlertCircle, HelpCircle } from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { useToast } from '@/components/ui/use-toast';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
];

// Human-readable status labels (no jargon)
function statusLabel(status) {
  switch (status) {
    case 'connected':   return 'Connected — ready to speak';
    case 'connecting':  return 'Connecting…';
    case 'translating': return 'Translating your message…';
    case 'error':       return 'Something went wrong';
    default:            return 'Not connected';
  }
}

function statusDot(status) {
  switch (status) {
    case 'connected':   return 'bg-emerald-500';
    case 'connecting':  return 'bg-amber-500 animate-pulse';
    case 'translating': return 'bg-blue-500 animate-pulse';
    case 'error':       return 'bg-red-500';
    default:            return 'bg-slate-500';
  }
}

// ── Mic permission denied — step-by-step fix card ────────────────────────────
function MicDeniedCard({ onRetry }) {
  return (
    <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-800/30 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
        <p className="text-red-300 font-semibold">Microphone access is blocked</p>
      </div>
      <p className="text-red-400/80 text-sm">
        This app needs your microphone to record voice messages. Here's how to allow it:
      </p>
      <ol className="space-y-2 text-sm text-red-300/90">
        <li className="flex gap-2"><span className="font-semibold text-amber-400">1.</span> Look for a microphone or camera icon in your browser's address bar (top of the screen).</li>
        <li className="flex gap-2"><span className="font-semibold text-amber-400">2.</span> Tap it and choose <strong>"Allow"</strong> for this site.</li>
        <li className="flex gap-2"><span className="font-semibold text-amber-400">3.</span> If you don't see it, open your phone or browser <strong>Settings → Privacy → Microphone</strong> and switch it on for this browser.</li>
        <li className="flex gap-2"><span className="font-semibold text-amber-400">4.</span> Come back here and tap <strong>Try Again</strong>.</li>
      </ol>
      <button
        onClick={onRetry}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold text-sm hover:from-amber-500 hover:to-amber-400 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}

export default function WalkieTalkie() {
  const { toast } = useToast();
  const [user, setUser]                     = useState(null);
  const [sessionToken, setSessionToken]     = useState(null);
  const [sessionType, setSessionType]       = useState('travel');
  const [sourceLang, setSourceLang]         = useState('en');
  const [targetLang, setTargetLang]         = useState('es');
  const [isRecording, setIsRecording]       = useState(false);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastTranslation, setLastTranslation]   = useState({ original: '', translated: '', sourceLang: '', targetLang: '', audioUrl: null });
  const [micDenied, setMicDenied]           = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [isOnline, setIsOnline]             = useState(navigator.onLine);
  const [mediaRecorder, setMediaRecorder]   = useState(null);
  const audioChunksRef                      = useRef([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', dn);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); };
  }, []);

  const createSession = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to use Walkie-Talkie.', variant: 'destructive' });
      return;
    }
    if (!isOnline) return;

    setConnectionStatus('connecting');
    setMicDenied(false);
    setTranslateError('');
    try {
      const response = await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'create_session',
        source_language: sourceLang,
        target_language: targetLang,
      });

      if (response.data?.session_token) {
        setSessionToken(response.data.session_token);
        setSessionType(response.data.session_type);
        setConnectionStatus('connected');
        toast({
          title: 'Session started',
          description: response.data.session_type === 'medical' ? 'Medical package — unlimited usage' : 'Pay-per-use session',
        });
      } else {
        throw new Error('No session token');
      }
    } catch (_) {
      setConnectionStatus('error');
      toast({ title: "Couldn't connect", description: 'Please check your internet connection and try again.', variant: 'destructive' });
    }
  };

  const endSession = async () => {
    if (!sessionToken) return;
    try {
      await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'end_session',
        session_token: sessionToken,
      });
    } catch (_) { /* session already closed */ }

    setSessionToken(null);
    setConnectionStatus('disconnected');
    setLastTranslation({ original: '', translated: '', sourceLang: '', targetLang: '', audioUrl: null });
    toast({ title: 'Session ended', description: 'Walkie-Talkie disconnected.' });
  };

  const startRecording = async () => {
    if (!sessionToken || connectionStatus !== 'connected' || !isOnline) return;
    setMicDenied(false);
    setTranslateError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicDenied(true);
      } else {
        toast({ title: "Couldn't start recording", description: 'Please try again.', variant: 'destructive' });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setConnectionStatus('translating');
    setTranslateError('');

    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: audioBlob });
      const audioUrl = uploadResponse.data?.file_url || uploadResponse.file_url;

      if (!audioUrl) throw new Error('Upload failed');

      const response = await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'translate_audio',
        session_token: sessionToken,
        audio_url: audioUrl,
        source_language: sourceLang,
        target_language: targetLang,
      });

      if (response.data?.error) throw new Error(response.data.error);
      if (!response.data?.translated_text) throw new Error('No translation returned');

      setLastTranslation({
        original:   response.data.original_text || '',
        translated: response.data.translated_text,
        sourceLang,
        targetLang,
        audioUrl:   response.data.audio_url || null,
      });

      if (response.data.audio_url) {
        const audio = new Audio(response.data.audio_url);
        setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => setIsPlaying(false));
      }

      setConnectionStatus('connected');
    } catch (_) {
      setConnectionStatus('error');
      setTranslateError("We couldn't translate your message. Please hold the button again and speak clearly, then release.");
      setTimeout(() => {
        setConnectionStatus('connected');
        setTranslateError('');
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-amber-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          <BackButton fallback="/dashboard" className="mb-6" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-900/40 to-amber-800/30 rounded-2xl flex items-center justify-center border border-amber-700/40 shadow-lg shadow-amber-900/20">
                <Radio className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400/90 text-xs font-semibold uppercase tracking-widest">Real-Time Translation</p>
                <h1 className="text-2xl font-semibold text-white">Walkie-Talkie</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusDot(connectionStatus)} shadow-lg`} />
              <span className="text-slate-300 text-sm font-semibold">{statusLabel(connectionStatus)}</span>
            </div>
          </div>

          {sessionToken && (
            <div className="mt-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                sessionType === 'medical'
                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
                  : 'bg-amber-900/50 text-amber-300 border-amber-700/40'
              }`}>
                {sessionType === 'medical' ? 'Medical Package — Unlimited' : 'Pay-Per-Use'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-3 bg-amber-900/30 border border-amber-700/40 rounded-2xl px-5 py-4">
            <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">You're offline</p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Voice translation requires an internet connection. Your session will resume when you reconnect.
              </p>
            </div>
          </div>
        )}

        {/* Mic denied card (shown inline, not as a toast) */}
        {micDenied && <MicDeniedCard onRetry={() => { setMicDenied(false); startRecording(); }} />}

        {!sessionToken ? (
          /* ── Session Setup ── */
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm border border-amber-900/20 rounded-2xl p-8 space-y-6 shadow-xl shadow-amber-900/10">
            <div>
              <h2 className="text-white font-semibold text-lg mb-1">Start a Translation Session</h2>
              <p className="text-slate-400 text-sm">Choose your languages, then press the big button below to speak.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">Your Language</label>
                <select
                  value={sourceLang}
                  onChange={e => setSourceLang(e.target.value)}
                  className="w-full bg-slate-950/80 border border-amber-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">Translate To</label>
                <select
                  value={targetLang}
                  onChange={e => setTargetLang(e.target.value)}
                  className="w-full bg-slate-950/80 border border-amber-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={createSession}
              disabled={connectionStatus === 'connecting' || !isOnline}
              className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 active:scale-[0.98]"
            >
              <Radio className="w-5 h-5" />
              {connectionStatus === 'connecting' ? 'Connecting…' : 'Start Session'}
            </button>
          </div>
        ) : (
          /* ── Active Session ── */
          <div className="space-y-6">
            {/* Push-to-talk button */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm border border-amber-900/20 rounded-2xl p-8 flex flex-col items-center shadow-xl shadow-amber-900/10">
              <p className="text-amber-400/90 text-sm font-semibold mb-2 uppercase tracking-wider">
                {isRecording ? 'Recording — release when done' : 'Hold to Speak'}
              </p>
              <p className="text-slate-500 text-xs mb-6">
                {isRecording ? 'Speak clearly into your microphone' : 'Press and hold the button, speak, then release'}
              </p>

              <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={e => { e.preventDefault(); startRecording(); }}
                onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                disabled={!isOnline || connectionStatus === 'translating'}
                aria-label={isRecording ? 'Recording — release to send' : 'Hold to speak'}
                className={`relative w-52 h-52 sm:w-56 sm:h-56 rounded-full flex items-center justify-center transition-all shadow-2xl touch-manipulation select-none ${
                  !isOnline || connectionStatus === 'translating'
                    ? 'bg-slate-700 shadow-slate-900/50 cursor-not-allowed opacity-50'
                    : isRecording
                    ? 'bg-gradient-to-br from-red-600 via-red-500 to-red-600 shadow-red-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 shadow-amber-500/40 hover:shadow-amber-500/60'
                }`}
              >
                {connectionStatus === 'translating'
                  ? <Signal className="w-20 h-20 text-white drop-shadow-lg animate-pulse" />
                  : isRecording
                  ? <Square className="w-20 h-20 text-white drop-shadow-lg" />
                  : <Mic   className="w-20 h-20 text-white drop-shadow-lg" />
                }

                <div className={`absolute inset-2 rounded-full border-2 pointer-events-none ${
                  isRecording ? 'border-red-300/50' : 'border-amber-300/40'
                }`} />

                {isRecording && (
                  <>
                    <motion.div className="absolute inset-0 rounded-full border-4 border-red-400/60 pointer-events-none"
                      initial={{ scale: 1, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1 }} />
                    <motion.div className="absolute inset-0 rounded-full border-4 border-red-400/60 pointer-events-none"
                      initial={{ scale: 1, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.5 }} />
                  </>
                )}
              </motion.button>

              <p className="text-slate-400 text-xs mt-6 font-medium text-center">
                {connectionStatus === 'translating'
                  ? 'Translating your message…'
                  : isRecording
                  ? 'Release to send'
                  : 'Hold button to record'}
              </p>
            </div>

            {/* Translate error */}
            {translateError && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/30 rounded-2xl px-5 py-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{translateError}</p>
              </div>
            )}

            {/* Translation result */}
            <AnimatePresence>
              {lastTranslation.translated && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm border border-amber-900/20 rounded-2xl p-6 space-y-4 shadow-xl shadow-amber-900/10"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-400/90 font-semibold text-sm uppercase tracking-wider">Latest Translation</h3>
                    {isPlaying && (
                      <span className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                        <Volume2 className="w-4 h-4 animate-pulse" /> Playing…
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-amber-900/20">
                      <p className="text-slate-400 text-xs font-semibold uppercase mb-1">
                        What you said ({LANGUAGES.find(l => l.code === lastTranslation.sourceLang)?.name})
                      </p>
                      <p className="text-white text-base leading-relaxed">{lastTranslation.original}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 rounded-xl p-4 border border-amber-700/30">
                      <p className="text-amber-400/90 text-xs font-semibold uppercase mb-1">
                        Translation ({LANGUAGES.find(l => l.code === lastTranslation.targetLang)?.name})
                      </p>
                      <p className="text-amber-100 text-base leading-relaxed">{lastTranslation.translated}</p>
                    </div>
                  </div>

                  {lastTranslation.audioUrl && (
                    <button
                      onClick={() => {
                        const audio = new Audio(lastTranslation.audioUrl);
                        setIsPlaying(true);
                        audio.onended = () => setIsPlaying(false);
                        audio.onerror = () => setIsPlaying(false);
                        audio.play().catch(() => setIsPlaying(false));
                      }}
                      className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors"
                    >
                      <Volume2 className="w-4 h-4" /> Replay audio
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* End session */}
            <button
              onClick={endSession}
              className="w-full bg-slate-900/60 hover:bg-slate-800/60 border border-amber-900/20 text-slate-300 hover:text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:border-amber-700/40 active:scale-[0.98]"
            >
              <PhoneOff className="w-5 h-5" /> End Session
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-sm border border-amber-900/20 rounded-2xl p-6 shadow-lg shadow-amber-900/5">
          <h3 className="text-amber-400/90 font-semibold text-sm mb-3">How It Works</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex items-start gap-2"><span className="text-amber-500 font-semibold">1.</span><span>Choose your language and tap <strong>Start Session</strong>.</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500 font-semibold">2.</span><span><strong>Hold the button</strong> and speak, then <strong>release</strong> to send.</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500 font-semibold">3.</span><span>Your words appear in both languages with audio playback.</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500 font-semibold">4.</span><span>Medical package users: unlimited free usage · Others: pay-per-session.</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
