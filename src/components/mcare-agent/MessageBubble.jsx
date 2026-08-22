import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, Paperclip, CheckCheck, Download, Volume2, Play, Pause } from 'lucide-react';
import { QRCodeSVG as _QRCodeSVG } from 'qrcode.react';
import SafetyGateCard from '@/components/mcare-agent/SafetyGateCard';
import DocumentScannerCard from '@/components/mcare/DocumentScannerCard';
import OutreachDraftCard from '@/components/mcare/OutreachDraftCard';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import ProviderStatusBadge from '@/components/mcare-agent/ProviderStatusBadge';
import DriverMapWidget from '@/components/mcare-agent/DriverMapWidget';
import { MAP_APPS, orderedMapApps, openInMapsApp, generateMapLink, buildOfflineGeoUri } from '@/lib/mapLinks';
import { pickMessageReaction } from '@/lib/mcareReactionHeuristic';
import { downloadQrSvgAsPng } from '@/lib/qrDownload';
import { generateWaveformBars } from '@/lib/voiceMessageAudio';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/i18n';
import { searchProcedures } from '@/components/procedures/ProcedureData';

const QRCodeSVG = /** @type {any} */ (_QRCodeSVG);

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url || '');
const isAudioUrl = (url) => /\.(webm|ogg|mp3|wav|m4a|opus)(\?|$)/i.test(url || '');
const fileNameFromUrl = (url) => decodeURIComponent((url || '').split('/').pop()?.split('?')[0] || 'document');

// Strip a [[LOCATION_CONTEXT: ...]] block MCareOrb.jsx silently prepends to
// the first message of a session with the traveler's auto-detected
// approximate location (see src/lib/locationContext.js) — a machine-
// readable hint for the agent, never shown to the user as raw text; the
// user only ever sees their own typed words.
const extractLocationContext = (raw) => {
  if (!raw) return { text: '', locationContext: null };
  const match = raw.match(/\[\[LOCATION_CONTEXT:\s*([\s\S]*?)\]\]\s*/);
  if (!match) return { text: raw, locationContext: null };
  const text = raw.replace(match[0], '');
  return { text, locationContext: match[1].trim() };
};

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

// Extract a {{sharelink:LABEL|URL}} token — a real Morales URL (e.g. a live-
// location share link) that needs to render as a tappable "open" button, not
// inert plain text. Distinct from {{maps:...}}/{{qr:...}}, whose DESTINATION
// is an address/coords pair fed into generateMapLink() — a share-location
// link is a real app URL already, not a maps destination, so it gets its own
// simple one-button token rather than being forced through that pipeline.
const extractShareLink = (raw) => {
  if (!raw) return { text: '', shareLink: null };
  const match = raw.match(/\{\{sharelink:([^|]*)\|([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), shareLink: null };
  const text = raw.replace(match[0], '').trim();
  return { text, shareLink: { label: match[1].trim(), url: match[2].trim() } };
};

// Extract a {{media:PROCEDURE_NAME}} token M-Care emits after explaining a
// procedure/risk in words and getting an explicit yes to see a diagram — the
// UI resolves PROCEDURE_NAME against the real, already-existing procedure
// catalog (ProcedureData.jsx's searchProcedures, the same fuzzy lookup this
// app already uses on /procedures) and renders a real hosted image, never
// something generated or invented on the fly. If no real match clears that
// lookup's own threshold, the UI says so plainly instead of showing anything.
const extractMedia = (raw) => {
  if (!raw) return { text: '', media: null };
  const match = raw.match(/\{\{media:([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), media: null };
  const text = raw.replace(match[0], '').trim();
  return { text, media: match[1].trim() };
};

// Extract a {{doctormedia:DOCTOR_NAME|TYPE|URL}} token M-Care emits when a
// matched doctor's own real portfolio (matchDoctorsForProcedure's `portfolio`
// field — a doctor's own self-uploaded image/video, already shown publicly
// on ProviderDetail.jsx) actually contains something and the traveler said
// yes to seeing it. URL must be a real one the agent got back from that tool
// call this turn — the UI only ever renders exactly what the token names, it
// never looks anything up or invents a URL itself. TYPE is 'image' or
// 'video'; anything else falls back to 'image' rather than rendering broken.
const extractDoctorMedia = (raw) => {
  if (!raw) return { text: '', doctorMedia: null };
  const match = raw.match(/\{\{doctormedia:([^|]*)\|([^|]*)\|([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), doctorMedia: null };
  const text = raw.replace(match[0], '').trim();
  const type = match[2].trim().toLowerCase() === 'video' ? 'video' : 'image';
  return { text, doctorMedia: { name: match[1].trim(), type, url: match[3].trim() } };
};

// Extract a {{drivermap:REQUEST_ID}} token M-Care emits at the end of a ride
// dispatch reply. REQUEST_ID is the RecoveryTransportRequest id the dispatch
// returned. The UI strips the token and renders an inline live driver-tracking
// map widget (DriverMapWidget) right inside the chat bubble — the traveler
// watches the matched driver approach in real time without leaving the chat.
const extractDriverMap = (raw) => {
  if (!raw) return { text: '', driverMap: null };
  const match = raw.match(/\{\{drivermap:([\s\S]*?)\}\}/);
  if (!match) return { text: raw.trim(), driverMap: null };
  const text = raw.replace(match[0], '').trim();
  return { text, driverMap: match[1].trim() };
};

// Extract every {{providerstatus:TIER|Name}} token M-Care emits — a single
// reply routinely names several providers at once (e.g. a list of web-
// discovered candidates), unlike {{maps:...}}/{{qr:...}} which only ever
// appear once per message, so this must find ALL matches, not just the
// first — an earlier version only stripped one occurrence and left every
// token after it leaking into the visible text as raw {{...}} syntax.
// TIER is 'discovered' (a discoverProviderCandidates/Tavily result) or
// 'approved' (a matchDoctorsForProcedure result — every doctor that tool
// can return already cleared Morales's full pipeline). 'verified' is a real
// tier in the data model but not yet emitted by any tool — see
// ProviderStatusBadge.jsx.
// Tolerant of case and incidental whitespace around the delimiters (i flag,
// \s* around providerstatus/:/|) — a live reply that drifts slightly from
// the exact spec byte format (a stray space, a capital letter) must still
// render as a badge, not just avoid leaking as raw text.
const extractProviderStatus = (raw) => {
  if (!raw) return { text: '', providerStatuses: [] };
  const matches = [...raw.matchAll(/\{\{\s*providerstatus\s*:\s*([^|]*?)\s*\|\s*([\s\S]*?)\s*\}\}/gi)];
  if (matches.length === 0) return { text: raw.trim(), providerStatuses: [] };
  let text = raw;
  for (const m of matches) text = text.replace(m[0], '');
  return {
    text: text.trim(),
    providerStatuses: matches.map(m => ({ tier: m[1].trim().toLowerCase(), name: m[2].trim() })),
  };
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
// traveler can download it. Prefers a real geo: URI (RFC 5870,
// buildOfflineGeoUri) when DEST is real coordinates — this is what lets an
// already-installed offline map app show the pin without any data
// connection, unlike a Google Maps https:// link, which generally needs one.
// Falls back to the same Google Maps universal link the {{maps:...}} buttons
// use when only an address string is available (an address can never be
// resolved offline by any client-side trick).
export function InlineQrBlock({ label, dest }) {
  const containerRef = useRef(null);
  const geoUri = buildOfflineGeoUri(dest, label);
  const url = geoUri || generateMapLink(dest, 'google_maps');
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
      {geoUri && <p className="text-[10px] text-emerald-600">📡 Works without a data connection</p>}
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

// Renders a QR code for a real Morales share-link URL (e.g. a live-location
// streaming link) — a convenience for handing the link to another device by
// scanning instead of retyping, NOT an offline pin the way InlineQrBlock's
// geo: URI is. Deliberately encodes the URL as-is rather than resolving it
// through generateMapLink (this isn't a maps destination) and deliberately
// carries no "works offline" claim — opening it still requires a real
// network round-trip to Morales' own backend, since the whole point of a
// live-location link is streaming GPS to a server, which can never work
// without a data connection.
function ShareLinkQrBlock({ label, url }) {
  const containerRef = useRef(null);
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
      <p className="text-[10px] text-gray-500">Needs a data connection to open</p>
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

// A query WORD must literally appear in the candidate's title or keywords for
// the catalog match to count as real — rejects pure character-overlap false
// positives (e.g. "spine surgery" vs Rhinoplasty's "nose surgery" keyword,
// which shares most letters but no actual word). A genuine exact/typo match
// like "rhinoplasty"→"Rhinoplasty" or "nose job"→"nose job" still passes,
// because a whole query token is found inside the title or a keyword.
const PROCEDURE_STOPWORDS = new Set(['surgery', 'procedure', 'operation', 'the', 'a', 'an', 'of', 'for']);
function isGenuineCatalogMatch(query, candidate) {
  if (!query || !candidate) return false;
  const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !PROCEDURE_STOPWORDS.has(w));
  const hay = `${candidate.title || ''} ${(candidate.keywords || []).join(' ')}`.toLowerCase();
  return qTokens.some((tok) => hay.includes(tok));
}

// Renders a real, already-hosted illustrative image for the procedure M-Care
// just named — two tiers, both real, never a fabricated or AI-generated-on-
// the-fly image. Tier 1: ProcedureData.jsx's static searchProcedures (the
// same fuzzy scorer this app already uses on /procedures) — instant, covers
// the original curated 69. Tier 2, only if tier 1 finds nothing: the live
// getProcedureIllustration function, which fuzzy-matches against
// ProcedureKnowledge's expanded catalog (generateProcedureIllustrations'
// batch-generated diagrams) — a brief loading state while that call is in
// flight. Honest empty state if neither tier clears its own match threshold.
function ProcedureMediaCard({ query }) {
  // searchProcedures (the shared /procedures fuzzy catalog) is deliberately
  // loose — its character-overlap scorer is anagram-aware, so a non-catalog
  // query like "spine surgery" shares enough letters with Rhinoplasty's
  // "nose surgery" keyword to clear the threshold and render a WRONG image.
  // For the chat image card we only accept a genuine match: a query WORD must
  // actually appear in the title or a keyword (not just overlap as letters).
  // This is scoped to image resolution only — /procedures keeps its own looser
  // behavior, since that page shows the candidate's own title/keywords back to
  // a user who typed them, so a loose guess there is harmless.
  const staticCandidates = searchProcedures(query);
  const staticMatch = staticCandidates.length > 0 && isGenuineCatalogMatch(query, staticCandidates[0])
    ? staticCandidates[0]
    : null;
  const [liveMatch, setLiveMatch] = useState(undefined); // undefined = not checked yet, null = checked, nothing found
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (staticMatch) return; // tier 1 already has a real match, skip tier 2 entirely
    let cancelled = false;
    setLiveLoading(true);
    base44.functions.invoke('getProcedureIllustration', { query })
      .then((res) => {
        if (cancelled) return;
        // base44.functions.invoke resolves to the raw axios response, not the
        // JSON body -- the real payload is res.data (see DriverMapWidget.jsx
        // for the sibling bug this pattern caused).
        const body = res?.data;
        setLiveMatch(body?.found ? { image: body.image_url, title: body.title, desc: body.desc } : null);
      })
      .catch(() => { if (!cancelled) setLiveMatch(null); })
      .finally(() => { if (!cancelled) setLiveLoading(false); });
    return () => { cancelled = true; };
  }, [staticMatch, query]);

  const match = staticMatch || liveMatch;

  if (!match) {
    if (liveLoading) {
      return (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Looking for a diagram...
        </div>
      );
    }
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        I don't have a diagram for that yet.
      </div>
    );
  }
  return (
    <div className="mt-2 max-w-[240px] overflow-hidden rounded-xl border border-border bg-white">
      <img src={match.image} alt={match.title} className="w-full h-32 object-cover" />
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-800">{match.title}</p>
        {match.desc && <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{match.desc}</p>}
      </div>
    </div>
  );
}

// Renders a matched doctor's own real, self-uploaded portfolio media (an
// image or video they personally added via DoctorPortfolio.jsx — already
// shown publicly on ProviderDetail.jsx, so this is not a new exposure). The
// URL always comes from a real matchDoctorsForProcedure tool result the
// agent already received this turn, never invented or looked up here — if a
// doctor's own upload fails to load, it fails visibly rather than silently
// falling back to the generic procedure stock image, which would misrepresent
// a generic illustration as this doctor's own real result.
function DoctorMediaCard({ name, type, url }) {
  if (!url) return null;
  return (
    <div className="mt-2 max-w-[240px] overflow-hidden rounded-xl border border-border bg-white">
      {type === 'video' ? (
        <video src={url} controls className="w-full h-32 bg-black object-cover" />
      ) : (
        <img src={url} alt={name ? `${name}'s portfolio` : 'Doctor portfolio'} className="w-full h-32 object-cover" />
      )}
      {name && (
        <div className="p-2.5">
          <p className="text-[11px] text-gray-500">From Dr. {name}&apos;s own portfolio</p>
        </div>
      )}
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
  // get replaced from under us). Rendered directly as a VoiceNotePlayer
  // below rather than merged into message.file_urls and re-detected via
  // isAudioUrl()'s extension regex: its type is already known for certain by
  // construction (it came straight out of the TTS pipeline), and Base44's
  // Core.GenerateSpeech URL shape isn't a guarantee this repo has verified —
  // if it doesn't happen to end in .mp3/.webm/etc., extension-sniffing it
  // would wrongly fall through to a plain file-link instead of a real player.
  const fileUrls = message.file_urls || [];
  // A "pure voice note" is a USER message whose only attachment is a single
  // audio file — real WhatsApp voice notes show just the waveform/player,
  // never a visible transcript, even though the real transcript still exists
  // behind the scenes as message.content (it was sent to the agent, just not
  // shown to the human reader here). Restricted to isUser: an assistant
  // reply must always keep its text visible (safety-relevant information,
  // sighted/admin users, screen readers) — its audio bubble is an addition,
  // never a replacement. Any message with text-only, an image, or an audio
  // file alongside other attachments/text still renders normally.
  // Also true for an assistant reply that was actually spoken aloud
  // (extraAudioUrl set): the full reply already went out as real audio,
  // so the written duplicate would defeat the point of it looking like a
  // real voice message.
  const isPureVoiceNote = (isUser && fileUrls.length === 1 && isAudioUrl(fileUrls[0])) || (!isUser && !!extraAudioUrl);
  const hasAudioAttachment = !!extraAudioUrl || fileUrls.some(isAudioUrl);
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
          const { text: t0 } = extractLocationContext(message.content);
          const { text: t1, choices } = extractChoices(t0);
          const { text: t2, maps } = extractMaps(t1);
          const { text: t3, qr } = extractQr(t2);
          const { text: t3a, shareLink } = extractShareLink(t3);
          const { text: t3b, media } = extractMedia(t3a);
          const { text: t3c, doctorMedia } = extractDoctorMedia(t3b);
          const { text: t3d, driverMap } = extractDriverMap(t3c);
          const { text: t4, providerStatuses } = extractProviderStatus(t3d);
          // Final safety net: anything {{...}}-shaped that survived every
          // known extractor above (an unrecognized token, a format drift the
          // hardened regexes above still don't cover) must never reach the
          // user as raw internal syntax — strip it silently, but log it so a
          // real drift stays debuggable.
          const text = t4.replace(/\{\{[\s\S]*?\}\}/g, (m) => {
            console.warn('[MessageBubble] stripped an unrecognized token before render:', m);
            return '';
          }).replace(/ {2,}/g, ' ').trim();
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
              {providerStatuses.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {providerStatuses.map((ps, idx) => (
                    <ProviderStatusBadge key={`${ps.tier}-${ps.name}-${idx}`} tier={ps.tier} name={ps.name} />
                  ))}
                </div>
              )}
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
              {maps?.dest && (
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
              {shareLink && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={shareLink.url}
                      target="_blank"
                      rel="noreferrer"
                      className={chipBase}
                      style={{ borderColor: '#16a34a', color: '#16a34a', background: 'transparent' }}
                    >
                      <span>🔗</span> {shareLink.label || 'Open Link'}
                    </a>
                  </div>
                  <ShareLinkQrBlock label={shareLink.label} url={shareLink.url} />
                </>
              )}
              {media && <ProcedureMediaCard query={media} />}
              {doctorMedia && <DoctorMediaCard name={doctorMedia.name} type={doctorMedia.type} url={doctorMedia.url} />}
              {driverMap && <DriverMapWidget transportId={driverMap} />}
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
        {(fileUrls.length > 0 || extraAudioUrl) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {fileUrls.map((url, i) => isImageUrl(url)
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
            {extraAudioUrl && <VoiceNotePlayer key="voice-reply" url={extraAudioUrl} />}
          </div>
        )}
        {message.tool_calls?.map((toolCall, idx) => (toolCall.name === 'computeSafeTScreening' || toolCall.name === 'safeT4LifeScan')
          ? <SafetyGateCard key={idx} toolCall={toolCall} onRespond={onRespond} />
          : toolCall.name === 'openMcareScanner'
          ? <DocumentScannerCard key={idx} toolCall={toolCall} onRespond={onRespond} />
          : toolCall.name === 'draftPartnerOutreach'
          ? <OutreachDraftCard key={idx} toolCall={toolCall} onRespond={onRespond} />
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