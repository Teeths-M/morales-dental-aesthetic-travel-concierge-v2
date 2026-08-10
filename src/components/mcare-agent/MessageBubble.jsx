import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, Paperclip, CheckCheck, Download, Volume2, Play, Pause } from 'lucide-react';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
import SafetyGateCard from '@/components/mcare-agent/SafetyGateCard';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import { MAP_APPS, orderedMapApps, openInMapsApp, generateMapLink } from '@/lib/mapLinks';
import { pickMessageReaction } from '@/lib/mcareReactionHeuristic';
import { downloadQrSvgAsPng } from '@/lib/qrDownload';
import { generateWaveformBars } from '@/lib/voiceMessageAudio';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/i18n';

const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url || '');
const isAudioUrl = (url) => /\.(webm|ogg|mp3|wav|m4a|opus)(\?|$)/i.test(url || '');
const fileNameFromUrl = (url) => decodeURIComponent((url || '').split('/').pop()?.split('?')[0] || 'document');

// Extract a {{choices:a|b|c}} token the agent emits for closed-set questions.
// The UI strips it from the visible text and renders it as tappable chips.
const extractChoices = (raw) => {
  if (!raw) return { text: '', choices: [] };
  const match = raw.match(/\{\{choices:([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), choices: [] };
  const text = raw.replace(match[0], '').trim();
  const choices = match[1].split('|').map(s => s.trim()).filter(Boolean);
  return { text, choices };
};

// Extract a {{maps:LABEL|DESTINATION}} token M-Care emits to offer one-tap
// directions. DESTINATION may be an address string or "lat,lng" coordinates.
// The UI strips the token and renders three tappable app buttons instead.
const extractMaps = (raw) => {
  if (!raw) return { text: '', maps: null };
  const match = raw.match(/\{\{maps:([^|]*)\|([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), maps: null };
  const text = raw.replace(match[0], '').trim();
  return { text, maps: { label: match[1].trim(), dest: match[2].trim() } };
};

// Extract a {{qr:LABEL|DESTINATION}} token M-Care emits when the traveler
// needs to hand navigation to someone ELSE (a driver, family, hotel staff) to
// scan on their own phone, or to save/print — distinct from {{maps:...}},
// which opens navigation on the traveler's own device right now. Same
// DESTINATION rules as the maps token (address or "lat,lng").
const extractQr = (raw) => {
  if (!raw) return { text: '', qr: null };
  const match = raw.match(/\{\{qr:([^|]*)\|([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), qr: null };
  const text = raw.replace(match[0], '').trim();
  return { text, qr: { label: match[1].trim(), dest: match[2].trim() } };
};

// Backward-compat: if M-Care emits a bare waze / google-maps / apple-maps URL
// (e.g. a markdown link), surface it as a tappable button too.
const MAP_URL_PATTERNS = [
  { id: 'waze',        re: /https?:\/\/(?:www\.|[a-z]+\.)?waze\.com\/[^\s)\]]+/gi },
  { id: 'google_maps', re: /https?:\/\/(?:www\.|maps\.)?google\.[a-z.]+\/maps\/[^\s)\]]+/gi },
  { id: 'apple_maps',  re: /https?:\/\/(?:www\.)?maps\.apple\.com\/[^\s)\]]+/gi },
];
const extractMapUrls = (text) => {
  if (!text) return [];
  const found = [];
  for (const { id, re } of MAP_URL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) found.push({ id, url: m[0] });
  }
  return found;
};

// Strip markdown emphasis markers so chat reads as clean plain text.
const stripMd = (s) => {
  if (!s) return s;
  return s
    .replace(/```([\s\S]*?)```/g, (_, c) => c.replace(/^\n/, ''))
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')   // horizontal rules
    .replace(/^\s*>\s?/gm, '')                 // blockquote markers
    .replace(/^\s*[-*+]\s+/gm, '')             // bullet list markers
    .replace(/^\s*\d+\.\s+/gm, '')             // numbered list markers
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')        // headers
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1');
};

// Renders a real, scannable QR code inline in the chat bubble — the driver
// or anyone else can scan it straight off the traveler's screen, or the
// traveler can download it. Value is a Google Maps universal link (resolves
// natively on iOS and Android) built the same way the {{maps:...}} buttons
// already do, via generateMapLink.
function InlineQrBlock({ label, dest }) {
  const containerRef = useRef(null);
  const url = generateMapLink(dest, 'google_maps');
  if (!url) return null;
  const filename = `${(label || 'morales').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'morales'}-qr.png`;
  const handleDownload = () => {
    downloadQrSvgAsPng(containerRef.current?.querySelector('svg'), filename);
  };
  return (
    <div className="mt-2 inline-flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3">
      <div ref={containerRef}>
        <QRCodeSVG value={url} size={120} bgColor="#ffffff" fgColor="#0f172a" level="M" />
      </div>
      {label && <p className="text-[11px] font-medium text-gray-600">{label}</p>}
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
      >
        <Download className="w-3 h-3" /> Save
      </button>
    </div>
  );
}

// Opt-in "Listen" button for an assistant message — generates and plays TTS
// audio on tap via speakMcareText (Core.GenerateSpeech, the same primitive
// walkieTalkieTranslate already proved out in production). Never auto-plays
// — unsolicited audio in a quiet or public setting would be the opposite of
// frictionless; the user asks for it, same as tapping to open a link.
function SpeakButton({ text, language }) {
  const [state, setState] = useState('idle'); // idle | loading | playing | error
  const audioRef = useRef(null);

  const handleClick = async () => {
    if (state === 'playing') {
      audioRef.current?.pause();
      setState('idle');
      return;
    }
    if (state === 'loading' || !text?.trim()) return;
    setState('loading');
    try {
      const res = await base44.functions.invoke('speakMcareText', { text, language });
      const audioUrl = res?.data?.audio_url;
      if (!audioUrl) { setState('error'); return; }
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => setState('idle');
      audioRef.current.onerror = () => setState('error');
      await audioRef.current.play();
      setState('playing');
    } catch {
      setState('error');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/60 active:scale-95 transition-colors"
      title={state === 'playing' ? 'Stop' : 'Listen'}
    >
      {state === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
      {state === 'error' ? 'Try again' : state === 'playing' ? 'Stop' : 'Listen'}
    </button>
  );
}

const VOICE_NOTE_BAR_COUNT = 26;

const formatVoiceDuration = (secs) => {
  if (secs == null || !isFinite(secs)) return '--:--';
  const total = Math.max(0, Math.round(secs));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// WhatsApp-style playback UI for a sent/received voice note. Distinct from
// SpeakButton above (that's assistant-reply TTS output) — this plays back the
// user's OWN recorded audio attachment. Mirrors SpeakButton's local play-state
// pattern (a plain useState + a lazily-created Audio() in a ref) but adds a
// waveform + scrub-synced fill, since a voice note needs to show playback
// position, not just idle/loading/playing.
function VoiceNotePlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [bars, setBars] = useState(null); // null while the waveform is still loading
  const [progress, setProgress] = useState(0); // 0-1 playback position
  const [duration, setDuration] = useState(null); // seconds, null until metadata loads
  const audioRef = useRef(null);

  // Fetch + analyze once per message (per url), cached in state — never
  // recomputed on re-render. A fetch/decode failure falls back to a flat,
  // neutral waveform rather than crashing or rendering nothing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetch(url).then(r => r.blob());
        const waveform = await generateWaveformBars(blob, VOICE_NOTE_BAR_COUNT);
        if (!cancelled) setBars(waveform);
      } catch {
        if (!cancelled) setBars(new Array(VOICE_NOTE_BAR_COUNT).fill(0.28));
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Stop playback if the bubble unmounts mid-play (e.g. conversation switch).
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const handleToggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration)) setDuration(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      });
      audio.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
      });
      audio.addEventListener('error', () => setPlaying(false));
      audioRef.current = audio;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const displayBars = bars || new Array(VOICE_NOTE_BAR_COUNT).fill(0.22);

  return (
    <div
      className="mt-1 flex items-center gap-2 rounded-full px-2.5 py-2 min-w-[190px]"
      style={{ background: 'rgba(6,11,22,0.35)', border: '1px solid #2A3F4A' }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full active:scale-95 transition-transform"
        style={{ background: '#D4AF37', color: '#060B16' }}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <Pause className="w-3.5 h-3.5" fill="currentColor" />
          : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex items-end gap-[2px] h-6 flex-1 min-w-0">
        {displayBars.map((v, idx) => {
          const played = idx / displayBars.length < progress;
          return (
            <span
              key={idx}
              className="w-[3px] rounded-full flex-shrink-0"
              style={{
                height: `${Math.max(3, Math.round(v * 22))}px`,
                background: played ? '#D4AF37' : 'rgba(255,255,255,0.28)',
              }}
            />
          );
        })}
      </div>
      <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
        {formatVoiceDuration(duration)}
      </span>
    </div>
  );
}

function StatusIcon({ status }) {
  if (['completed', 'success'].includes(status)) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (['failed', 'error'].includes(status)) return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  if (['pending', 'running', 'in_progress'].includes(status)) return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
  return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const hide = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;
  const label = toolCall.display_projection?.label || toolCall.name;
  const activeLabel = toolCall.display_projection?.active_label;
  const errorLabel = toolCall.display_projection?.error_label;

  let statusText = toolCall.status;
  if (hide) {
    if (['failed', 'error'].includes(toolCall.status)) statusText = errorLabel || toolCall.status;
    else if (['pending', 'running', 'in_progress'].includes(toolCall.status)) statusText = activeLabel || toolCall.status;
    else statusText = label;
  }

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }
  let parsedResults = toolCall.results;
  if (typeof toolCall.results === 'string') {
    try { parsedResults = JSON.parse(toolCall.results); } catch { /* keep raw */ }
  }
  const isFailed = ['failed', 'error'].includes(toolCall.status) ||
    (typeof parsedResults === 'object' && parsedResults?.success === false);

  return (
    <div className="mt-2 text-xs rounded-lg border border-border bg-secondary/40 overflow-hidden">
      <button
        onClick={() => !hide && setExpanded(!expanded)}
        className={`flex items-center gap-2 w-full px-3 py-2 ${hide ? 'cursor-default' : 'hover:bg-secondary/70'}`}
      >
        {!hide && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        <StatusIcon status={toolCall.status} />
        <span className="font-medium text-foreground">{label}</span>
        <span className={isFailed ? 'text-red-500' : 'text-muted-foreground'}>— {statusText}</span>
      </button>
      {expanded && !hide && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/60">
          {parsedArgs && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Parameters:</p>
              <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults !== undefined && parsedResults !== null && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Result:</p>
              <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// accent (hex) overrides the user bubble color (M-Safe purple). showAvatar adds
// the purple "M" avatar to agent messages; showMeta adds a time + delivery check
// under user messages. showReaction adds a small emoji tapback on the patient's
// own message when pickMessageReaction() finds a signal worth reacting to
// (deterministic, client-side only — see src/lib/mcareReactionHeuristic.js,
// the agent itself never decides this). All optional → default rendering is
// unchanged.
export default function MessageBubble({ message, onRespond, accent = null, showAvatar = false, showMeta = false, showReaction = false, onChoice = null, revealUpTo = undefined, extraAudioUrl = undefined }) {
  const { i18n } = useTranslation();
  const isUser = message.role === 'user';
  // extraAudioUrl is a real, playable TTS audio URL attached client-side to
  // an assistant reply (see MCareOrb.jsx's voiceReplyAudioUrls) — not part
  // of message.file_urls itself (that array is server-authoritative and can
  // get replaced from under us), but rendered through the exact same
  // attachment path so it reuses VoiceNotePlayer with no new component.
  const allFileUrls = extraAudioUrl
    ? [...(message.file_urls || []), extraAudioUrl]
    : (message.file_urls || []);
  // A "pure voice note" is a USER message whose only attachment is a single
  // audio file — real WhatsApp voice notes show just the waveform/player,
  // never a visible transcript, even though the real transcript still exists
  // behind the scenes as message.content (it was sent to the agent, just not
  // shown to the human reader here). Restricted to isUser: an assistant
  // reply must always keep its text visible (safety-relevant information,
  // sighted/admin users, screen readers) — its audio bubble is an addition,
  // never a replacement. Any message with text-only, an image, or an audio
  // file alongside other attachments/text still renders normally.
  const isPureVoiceNote = isUser && allFileUrls.length === 1 && isAudioUrl(allFileUrls[0]);
  const hasAudioAttachment = allFileUrls.some(isAudioUrl);
  const ts = message.created_date || message.timestamp;
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  const reaction = isUser && showReaction ? pickMessageReaction(message.content) : null;
  const userBubbleClass = isUser
    ? (accent ? 'text-white' : 'bg-primary text-primary-foreground')
    : 'bg-card border border-border text-card-foreground';
  const userBubbleStyle = isUser && accent ? { background: accent } : undefined;
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start items-end gap-2'}>
      {!isUser && showAvatar && (
        <McareAvatar size={28} />
      )}
      <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${userBubbleClass}`} style={userBubbleStyle}>
        {(() => {
          const { text: t1, choices } = extractChoices(message.content);
          const { text: t2, maps } = extractMaps(t1);
          const { text, qr } = extractQr(t2);
          const mapUrls = extractMapUrls(text);
          const chipBase = 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 active:scale-95';
          // revealUpTo (word count) is undefined for every message except
          // the one Talk Mode is currently speaking — see MCareOrb.jsx. When
          // undefined, displayText === text exactly, so default rendering
          // (Talk Mode off, or any other message) is byte-identical to before.
          const displayText = typeof revealUpTo === 'number'
            ? text.split(/\s+/).filter(Boolean).slice(0, Math.max(revealUpTo, 0)).join(' ')
            : text;
          return (
            <>
              {displayText && !isPureVoiceNote && <p className="text-sm whitespace-pre-wrap">{stripMd(displayText)}</p>}
              {choices.length > 0 && onChoice && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {choices.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onChoice(c)}
                      className={chipBase}
                      style={isUser
                        ? { borderColor: 'rgba(255,255,255,0.45)', color: '#fff', background: 'rgba(255,255,255,0.14)' }
                        : { borderColor: accent || '#6C47FF', color: accent || '#6C47FF', background: 'transparent' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {maps && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {orderedMapApps().map(app => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => openInMapsApp(app.id, maps.dest)}
                      className={chipBase}
                      style={{ borderColor: '#16a34a', color: '#16a34a', background: 'transparent' }}
                      title={`Open ${maps.label} in ${app.label}`}
                    >
                      <span>{app.emoji}</span> Open in {app.label}
                    </button>
                  ))}
                </div>
              )}
              {qr && <InlineQrBlock label={qr.label} dest={qr.dest} />}
              {!isUser && text && typeof revealUpTo !== 'number' && !hasAudioAttachment && <SpeakButton text={text} language={i18n.language} />}
              {mapUrls.length > 0 && !maps && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mapUrls.map((u, i) => {
                    const app = MAP_APPS.find(a => a.id === u.id);
                    return (
                      <a
                        key={i}
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className={chipBase}
                        style={{ borderColor: '#16a34a', color: '#16a34a', background: 'transparent' }}
                      >
                        <span>{app?.emoji}</span> Open in {app?.label}
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
        {allFileUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {allFileUrls.map((url, i) => isImageUrl(url)
              ? (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                  <img src={url} alt="attachment" className="rounded-lg max-h-40 border border-border object-cover" />
                </a>
              )
              : isAudioUrl(url)
              ? <VoiceNotePlayer key={i} url={url} />
              : (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[180px] truncate">{fileNameFromUrl(url)}</span>
                </a>
              )
            )}
          </div>
        )}
        {message.tool_calls?.map((toolCall, idx) => (toolCall.name === 'computeSafeTScreening' || toolCall.name === 'safeT4LifeScan')
          ? <SafetyGateCard key={idx} toolCall={toolCall} onRespond={onRespond} />
          : <ToolCallDisplay key={idx} toolCall={toolCall} />)}
        {isUser && showMeta && time && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
            <span>{time}</span>
            <CheckCheck className="w-3 h-3" style={{ color: '#5EEAD4' }} />
          </div>
        )}
        {reaction && (
          <motion.span
            role="img"
            aria-label={`M-Care reacted with ${reaction}`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 15 }}
            className="absolute -bottom-3 -left-1 flex items-center justify-center w-6 h-6 rounded-full text-sm bg-[#0C1A1D] border border-white/10 shadow-lg"
          >
            {reaction}
          </motion.span>
        )}
      </div>
    </div>
  );
}