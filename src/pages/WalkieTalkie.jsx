import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mic, Square, Languages, Volume2, AlertCircle, PhoneOff, Radio, Signal } from 'lucide-react';
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

export default function WalkieTalkie() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionType, setSessionType] = useState('travel');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [lastTranslation, setLastTranslation] = useState({ original: '', translated: '', sourceLang: '', targetLang: '', audioUrl: null });
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createSession = async () => {
    if (!user) {
      toast({ title: 'Authentication required', description: 'Please log in to use Walkie-Talkie', variant: 'destructive' });
      return;
    }

    setConnectionStatus('connecting');
    try {
      const response = await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'create_session',
        source_language: sourceLang,
        target_language: targetLang
      });

      if (response.data?.session_token) {
        setSessionToken(response.data.session_token);
        setSessionType(response.data.session_type);
        setConnectionStatus('connected');
        toast({
          title: 'Session started',
          description: response.data.session_type === 'medical' ? 'Medical package - unlimited usage' : 'Pay-per-use session',
        });
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({ title: 'Connection failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const endSession = async () => {
    if (!sessionToken) return;
    
    try {
      await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'end_session',
        session_token: sessionToken
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
    
    setSessionToken(null);
    setConnectionStatus('disconnected');
    toast({ title: 'Session ended', description: 'Walkie-Talkie disconnected' });
  };

  const startRecording = async () => {
    if (!sessionToken || connectionStatus !== 'connected') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
    } catch (error) {
      toast({ title: 'Microphone access denied', description: 'Please allow microphone access', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      // Upload audio to get URL
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: audioBlob });
      const audioUrl = uploadResponse.data?.file_url;

      if (!audioUrl) throw new Error('Upload failed');

      // Send for translation
      const response = await base44.functions.invoke('walkieTalkieTranslate', {
        action: 'translate_audio',
        session_token: sessionToken,
        audio_url: audioUrl,
        source_language: sourceLang,
        target_language: targetLang
      });

      if (response.data?.translated_text) {
        setLastTranslation({
          original: response.data.original_text,
          translated: response.data.translated_text,
          sourceLang: sourceLang,
          targetLang: targetLang,
          audioUrl: response.data.audio_url
        });

        // Auto-play translated audio
        const audio = new Audio(response.data.audio_url);
        setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => {});

        toast({ title: 'Translation complete', description: 'Message translated successfully' });
      }
    } catch (error) {
      toast({ title: 'Translation failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection lost';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950/20 to-slate-900">
      {/* Header */}
      <div className="border-b border-blue-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          <BackButton fallback="/dashboard" className="mb-6" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center border border-blue-800/50">
                <Radio className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Real-Time Translation</p>
                <h1 className="text-2xl font-bold text-white">Walkie-Talkie</h1>
              </div>
            </div>
            
            {/* Session Status */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className="text-slate-300 text-sm font-semibold">{getStatusText()}</span>
            </div>
          </div>
          
          {/* Session Type Badge */}
          {sessionToken && (
            <div className="mt-4 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                sessionType === 'medical' 
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/50' 
                  : 'bg-amber-900/40 text-amber-300 border border-amber-800/50'
              }`}>
                {sessionType === 'medical' ? 'Medical Package - Unlimited' : 'Pay-Per-Use'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!sessionToken ? (
          /* Session Setup */
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-white font-bold text-lg mb-2">Start New Session</h2>
              <p className="text-slate-400 text-sm">Select your languages and connect to begin translating</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">Your Language</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">Translate To</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={createSession}
              disabled={connectionStatus === 'connecting'}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Radio className="w-5 h-5" />
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
            </button>
          </div>
        ) : (
          /* Active Session */
          <div className="space-y-6">
            {/* Push to Talk Button */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center">
              <p className="text-slate-400 text-sm font-semibold mb-6 uppercase tracking-wider">
                {isRecording ? 'Recording...' : 'Push to Talk'}
              </p>
              
              <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/50 animate-pulse' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-2xl shadow-blue-500/30'
                }`}
              >
                {isRecording ? (
                  <Square className="w-16 h-16 text-white" />
                ) : (
                  <Mic className="w-16 h-16 text-white" />
                )}
                
                {/* Ripple effect when recording */}
                {isRecording && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-red-400"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-red-400"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                    />
                  </>
                )}
              </motion.button>

              <p className="text-slate-500 text-xs mt-6">
                {isRecording ? 'Release to send' : 'Hold button to record'}
              </p>
            </div>

            {/* Translation Display */}
            <AnimatePresence>
              {lastTranslation.translated && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">Latest Translation</h3>
                    {isPlaying && (
                      <span className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        Playing audio...
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
                      <p className="text-slate-400 text-xs font-semibold uppercase mb-1">
                        Original ({LANGUAGES.find(l => l.code === lastTranslation.sourceLang)?.name || lastTranslation.sourceLang})
                      </p>
                      <p className="text-white text-base leading-relaxed">{lastTranslation.original}</p>
                    </div>
                    
                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-800/50">
                      <p className="text-blue-300 text-xs font-semibold uppercase mb-1">
                        Translated ({LANGUAGES.find(l => l.code === lastTranslation.targetLang)?.name || lastTranslation.targetLang})
                      </p>
                      <p className="text-blue-100 text-base leading-relaxed">{lastTranslation.translated}</p>
                    </div>
                  </div>

                  {lastTranslation.audioUrl && (
                    <button
                      onClick={() => {
                        const audio = new Audio(lastTranslation.audioUrl);
                        setIsPlaying(true);
                        audio.onended = () => setIsPlaying(false);
                        audio.play();
                      }}
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                      Replay audio
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connection Error State */}
            {connectionStatus === 'error' && (
              <div className="bg-red-900/30 border border-red-800/50 rounded-2xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-300 font-bold mb-2">Connection Lost</p>
                <p className="text-red-400/70 text-sm mb-4">Trying to reconnect...</p>
                <button
                  onClick={createSession}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Reconnect
                </button>
              </div>
            )}

            {/* End Session Button */}
            <button
              onClick={endSession}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End Session
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">How It Works</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Hold the microphone button to record your message</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>Release to send - audio is transcribed and translated</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Translated text appears instantly with audio playback</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Medical package users: unlimited free usage · Travel users: pay-per-session</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}