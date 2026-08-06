import React, { useState } from 'react';
import { ShieldAlert, Loader2, CheckCircle2, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Parses the computeSafeTScreening tool-call result into a risk tier + flags.
function parseResult(toolCall) {
  let r = toolCall.results;
  if (typeof r === 'string') { try { r = JSON.parse(r); } catch { /* keep raw */ } }
  const data = r?.data || r || {};
  const tier = String(data.risk_tier || data.risk_level || data.tier || data.risk || '').toLowerCase();
  let flags = data.flags || data.safe_t_flags || data.signals || data.concerns || [];
  if (!Array.isArray(flags)) flags = flags ? [flags] : [];
  return { tier, flags };
}

// The Safety Gate — the moment M-Care proves it is not just a chatbot.
// Renders inline in the chat when the computeSafeTScreening tool runs.
// Loading → red refusal (high/extreme) → recommended safer path → buttons.
export default function SafetyGateCard({ toolCall, onRespond }) {
  const [responded, setResponded] = useState(false);
  const pending = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const failed = ['failed', 'error'].includes(toolCall.status);
  const { tier, flags } = parseResult(toolCall);

  const isHigh = ['high', 'extreme', 'elevated', 'critical', 'unsafe'].includes(tier);
  const isCleared = ['low', 'minimal', 'none', 'cleared', 'safe', 'pass', 'passed'].includes(tier);

  if (pending) {
    return (
      <div className="mt-2 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Running your safety screening…</p>
          <p className="text-xs text-muted-foreground mt-0.5">This takes about 30 seconds. I'm checking your procedure against your medical profile.</p>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">I couldn't complete the safety screening.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Something went wrong on my end. I'll escalate this to a human reviewer rather than guess — say the word and I'll arrange it.</p>
        </div>
      </div>
    );
  }

  if (isCleared && !isHigh) {
    return (
      <div className="mt-2 rounded-xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Safety screening complete — no concerns flagged.</p>
          <p className="text-xs text-muted-foreground mt-0.5">I'll move ahead and find verified providers for you.</p>
        </div>
      </div>
    );
  }

  // HIGH / EXTREME — the refusal (the killer demo moment)
  if (!isHigh) {
    // Tier unknown — defer to the agent's written assessment rather than guess green/red.
    return (
      <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">Safety screening complete — see my assessment below.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-950/30 overflow-hidden">
      <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" />
        <span className="font-semibold tracking-tight">Safety Alert</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-foreground">
          I've reviewed your procedure with your medical profile. I need to pause here.
        </p>
        <p className="text-sm text-muted-foreground">
          Our safety engine has flagged a potential concern:
        </p>

        {flags.length > 0 && (
          <ul className="space-y-1.5">
            {flags.slice(0, 4).map((f, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 font-bold leading-none mt-0.5">⚠</span>
                <span>{typeof f === 'string' ? f : (f?.reason || f?.flag || f?.message || JSON.stringify(f))}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-foreground font-medium">
          I can't proceed to find providers or make arrangements until we clear this step.
        </p>

        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300/40 p-3">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
            Here's the safer path I recommend:
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <span>We find a surgeon who specializes in patients with your condition.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <span>We request a clinical review of your case before any bookings are made.</span>
            </li>
          </ul>
        </div>

        {!responded && onRespond ? (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              onClick={() => { setResponded(true); onRespond('proceed'); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Proceed with Safer Path <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResponded(true); onRespond('wait'); }}
            >
              <Clock className="w-4 h-4" /> I need more time
            </Button>
          </div>
        ) : responded ? (
          <p className="text-xs text-muted-foreground">Thanks — I'll continue from here.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Reply in the chat to let me know how you'd like to proceed.</p>
        )}
      </div>
    </div>
  );
}