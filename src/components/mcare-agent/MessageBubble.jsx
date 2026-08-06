import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

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

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-card-foreground'}`}>
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        {message.tool_calls?.map((toolCall, idx) => <ToolCallDisplay key={idx} toolCall={toolCall} />)}
      </div>
    </div>
  );
}