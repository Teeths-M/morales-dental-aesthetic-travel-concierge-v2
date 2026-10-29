import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Shield, Stethoscope, Images, MapPin,
  FolderLock, Users, ClipboardList, HeartPulse, ArrowRight,
} from 'lucide-react';
import ChatBubble from './ChatBubble';
import EvidenceCard from './EvidenceCard';
import LocationFooter from './LocationFooter';

const ICONS = {
  briefcase: Briefcase,
  shield: Shield,
  stethoscope: Stethoscope,
  images: Images,
  map: MapPin,
  folder: FolderLock,
  users: Users,
  clipboard: ClipboardList,
  heart: HeartPulse,
};

// What each stage's button actually asks of the agent. Kept here rather than
// in the data module so the stage definitions stay free of model-facing copy.
const INTENTS = {
  provider: "Tell me everything you know about this clinic before I decide — their verification, their work, and anything that should worry me.",
  safety: "Run the safety gate on this provider and tell me plainly what still has to clear before anything can be booked.",
  fit: "Is this clinic the right fit for the procedure I'm considering? Compare my procedure against what they actually do.",
  evidence: "Walk me through the work this clinic has actually shared — the photos and the video on their record.",
  directions: "I'll be arriving at the clinic — help me arrange the transfer and give me directions my driver can follow.",
  prep: 'What do I need to do before I fly for this procedure, and what could stop it?',
  recovery: 'Plan my recovery check-ins after the procedure and tell me what happens if I miss one.',
};

/**
 * ScenarioPanel — the walkthrough conversation shown before a real session
 * starts: an agent message, the stage's evidence card, and one button that
 * does something (asks the agent, or opens the real surface for that stage).
 *
 * The card is built from the live provider record, so a pending licence check
 * shows as pending rather than as a tick.
 */
export default function ScenarioPanel({ stages, activeIndex, onIntent, loading, failed }) {
  const navigate = useNavigate();
  const stage = stages[activeIndex];

  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'var(--ms-chip)', width: '82%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'var(--ms-chip)', width: '55%' }} />
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--ms-chip)' }} />
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className="rounded-2xl px-4 py-3 text-[12px]"
        style={{ background: 'var(--ms-raised)', border: '1px solid var(--ms-border)', color: 'var(--ms-ink-soft)' }}
      >
        I couldn't reach the provider record just now. Send me a message and I'll pick it up from the live directory.
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="rounded-2xl px-4 py-3 text-[12px]" style={{ color: 'var(--ms-ink-soft)' }}>
        No providers match that yet. Tell me the procedure you're considering and I'll widen the search.
      </div>
    );
  }

  const Icon = ICONS[stage.card.icon];
  const handleAction = () => {
    if (stage.action.to) navigate(stage.action.to);
    else onIntent?.(INTENTS[stage.id] || stage.action.label);
  };

  return (
    <div className="space-y-4">
      <ChatBubble role="assistant">{stage.intro}</ChatBubble>

      <EvidenceCard
        icon={Icon}
        title={stage.card.title}
        badge={stage.card.badge}
        rows={stage.card.rows}
        footer={
          stage.card.footer === 'location' && stage.card.location
            ? <LocationFooter {...stage.card.location} />
            : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAction}
          className="msafe-action inline-flex items-center gap-1.5 rounded-full px-3.5 py-2"
          style={{ background: 'var(--ms-ink)', color: 'var(--ms-main)' }}
        >
          <span className="text-[11.5px] font-semibold">{stage.action.label}</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <span className="text-[10.5px]" style={{ color: 'var(--ms-ink-faint)' }}>
          or ask me anything below
        </span>
      </div>

      <style>{`
        .msafe-action:hover { opacity: 0.9; }
        .msafe-action:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}