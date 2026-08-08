import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, Paperclip, CheckCheck } from 'lucide-react';
import SafetyGateCard from '@/components/mcare-agent/SafetyGateCard';
import { MAP_APPS, orderedMapApps, openInMapsApp } from '@/lib/mapLinks';
import { pickMessageReaction } from '@/lib/mcareReactionHeuristic';

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url || '');
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
export default function MessageBubble({ message, onRespond, accent = null, showAvatar = false, showMeta = false, showReaction = false, onChoice = null }) {
  const isUser = message.role === 'user';
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
        <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white text-[13px] font-bold" style={{ background: accent || '#6C47FF' }} aria-hidden>M</span>
      )}
      <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${userBubbleClass}`} style={userBubbleStyle}>
        {(() => {
          const { text: t1, choices } = extractChoices(message.content);
          const { text, maps } = extractMaps(t1);
          const mapUrls = extractMapUrls(text);
          const chipBase = 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 active:scale-95';
          return (
            <>
              {text && <p className="text-sm whitespace-pre-wrap">{stripMd(text)}</p>}
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
        {message.file_urls?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.file_urls.map((url, i) => isImageUrl(url)
              ? (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                  <img src={url} alt="attachment" className="rounded-lg max-h-40 border border-border object-cover" />
                </a>
              )
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