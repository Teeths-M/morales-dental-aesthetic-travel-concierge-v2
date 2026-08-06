import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, Paperclip } from 'lucide-react';
import SafetyGateCard from '@/components/mcare-agent/SafetyGateCard';

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url || '');
const fileNameFromUrl = (url) => decodeURIComponent((url || '').split('/').pop()?.split('?')[0] || 'document');

// M-Care sometimes emits markdown emphasis (**bold**, _italic_, # headers,
// `code`, ~~strike~~) that the chat renders as raw symbols. Strip the markers
// so the conversation reads as clean plain text. Paired-emphasis only — leaves
// underscores inside tokens like PASS_xxx intact.
const stripMd = (s) => {
  if (!s) return s;
  return s
    .replace(/```([\s\S]*?)```/g, (_, c) => c.replace(/^\n/, ''))
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')   // horizontal rules (---/***/___)
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

export default function MessageBubble({ message, onRespond }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-card-foreground'}`}>
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{stripMd(message.content)}</p>
        )}
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
      </div>
    </div>
  );
}