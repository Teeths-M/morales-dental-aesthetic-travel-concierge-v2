// @ts-nocheck — Base44 InvokeLLM SDK types don't yet expose system_prompt/response_type; runtime works correctly
/**
 * ProcedurePrepCoach — "M Prep Coach": once a doctor has confirmed the
 * procedure AND a payment has landed, this card takes over from the generic
 * pre-confirmation checklist with the patient's real, doctor-driven
 * preparation steps and a live countdown to procedure_date.
 *
 * The checklist itself is fully deterministic (base44/functions/_shared/
 * preOpChecklist.ts) — this component only reads/toggles it. The one AI
 * layer here is a short narrated line on top of the countdown; per the M
 * Principle, that line may only phrase/motivate around the existing items —
 * it can never add a step, invent a fasting window, or name a medication.
 * Same shape as PreDepartureBriefing.jsx: client-side InvokeLLM, a cache,
 * and a fully deterministic offline fallback so the card still works with
 * no network / isSystemPaused() / integration credits exhausted.
 *
 * Props: caseRecord, userName
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Circle, Stethoscope } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isSystemPaused } from '@/lib/systemPause';
import { daysUntil } from '@/lib/dateUtils';
import { isPrepCoachActive, offlineMessage } from '@/lib/prepCoach';
import { toast } from 'sonner';

const GOLD = '#D4AF37';

const CACHE_KEY = (caseId) => `morales_prepcoach_${caseId}`;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — narration reads as "today's message"

function readCache(caseId, incompleteCount) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(caseId));
    if (!raw) return null;
    const { message, ts, incomplete } = JSON.parse(raw);
    const sameDay = new Date(ts).toDateString() === new Date().toDateString();
    if (sameDay && incomplete === incompleteCount && Date.now() - ts < CACHE_TTL) return message;
    return null;
  } catch { return null; }
}

function writeCache(caseId, message, incompleteCount) {
  try {
    localStorage.setItem(CACHE_KEY(caseId), JSON.stringify({ message, ts: Date.now(), incomplete: incompleteCount }));
  } catch {}
}

export default function ProcedurePrepCoach({ caseRecord, userName }) {
  const caseId = caseRecord?.id;
  const [items, setItems] = useState(caseRecord?.pre_op_checklist || []);
  const [message, setMessage] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const backfillTriedRef = useRef(false);
  const name = userName?.split(' ')[0] || 'there';

  const active = isPrepCoachActive(caseRecord);
  const daysLeft = useMemo(() => daysUntil(caseRecord?.procedure_date), [caseRecord?.procedure_date]);

  // Keep local items in sync if the parent's caseRecord is refetched.
  useEffect(() => {
    setItems(caseRecord?.pre_op_checklist || []);
  }, [caseRecord?.pre_op_checklist]);

  // Backfill: older/edge-case cases that reached confirmed+paid without a
  // checklist ever being generated (sendPreOpInstructions is idempotent —
  // it no-ops if pre_op_sent_at is already set).
  useEffect(() => {
    if (!active || !caseId || backfillTriedRef.current) return;
    if (items.length > 0) return;
    backfillTriedRef.current = true;
    (async () => {
      try {
        await base44.functions.invoke('sendPreOpInstructions', { case_id: caseId });
        const fresh = await base44.entities.CaseRecord.get(caseId);
        setItems(fresh?.pre_op_checklist || []);
      } catch {
        // Silent — the card just shows an empty state until the next visit.
      }
    })();
  }, [active, caseId, items.length]);

  const completedCount = items.filter((it) => it.completed).length;
  const totalCount = items.length;
  const incompleteItems = items.filter((it) => !it.completed);

  // Generate (or reuse cached) narration whenever the countdown or the
  // remaining-item count changes.
  useEffect(() => {
    if (!active || !caseId || totalCount === 0) return;

    const cached = readCache(caseId, incompleteItems.length);
    if (cached) { setMessage(cached); return; }

    if (!navigator.onLine || isSystemPaused()) {
      const fb = offlineMessage(daysLeft, incompleteItems.length, totalCount);
      setMessage(fb);
      writeCache(caseId, fb, incompleteItems.length);
      return;
    }

    setLoadingMessage(true);
    (async () => {
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are "M Prep Coach", a warm, encouraging pre-procedure coach for a medical tourism patient named ${name}.
Days until their procedure: ${daysLeft}.
Checklist progress: ${completedCount} of ${totalCount} steps complete.
Remaining steps (reference ONLY these, do not invent new ones): ${incompleteItems.map((it) => it.text).join('; ') || 'none — all done'}

Write ONE short, warm sentence (max 2 sentences) motivating them about what's left, or celebrating that they're done.
Rules: never invent a new preparation step; never state a specific fasting time or medication instruction yourself (if a remaining step already mentions medication or fasting, just say to follow that step — do not add a time or drug name); never state a specific calendar date, only relative days; plain text only, no markdown, no quotes around the sentence.`,
          response_type: 'text',
        });
        const text = (typeof res === 'string' ? res : (res?.result || res?.text || '')).trim();
        const clean = text.replace(/^"|"$/g, '');
        const final = clean || offlineMessage(daysLeft, incompleteItems.length, totalCount);
        setMessage(final);
        writeCache(caseId, final, incompleteItems.length);
      } catch {
        const fb = offlineMessage(daysLeft, incompleteItems.length, totalCount);
        setMessage(fb);
        writeCache(caseId, fb, incompleteItems.length);
      } finally {
        setLoadingMessage(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, caseId, daysLeft, incompleteItems.length, totalCount]);

  const toggleItem = async (index) => {
    const updated = items.map((it, i) => (i === index ? { ...it, completed: !it.completed } : it));
    setItems(updated);
    try {
      await base44.entities.CaseRecord.update(caseId, { pre_op_checklist: updated });
    } catch {
      setItems(items); // revert on failure
      toast.error("Couldn't save that — please try again.");
    }
  };

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: 16, padding: 20,
        background: 'linear-gradient(135deg, #080E1C 0%, #0A1424 100%)',
        border: `1.5px solid ${GOLD}35`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.08) inset',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${GOLD}18`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot style={{ width: 18, height: 18, color: GOLD }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>M Prep Coach</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            {completedCount} of {totalCount} steps complete
          </p>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {daysLeft > 0 ? daysLeft : daysLeft === 0 ? 'Today' : '—'}
          </p>
          {daysLeft > 0 && <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>days left</p>}
        </div>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', fontStyle: loadingMessage ? 'italic' : 'normal' }}>
        {loadingMessage ? 'Thinking about your next step…' : (message || offlineMessage(daysLeft, incompleteItems.length, totalCount))}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggleItem(i)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
              background: item.completed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${item.completed ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
            }}
          >
            {item.completed
              ? <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
              : <Circle style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: 1 }} />}
            <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5, color: item.completed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)', textDecoration: item.completed ? 'line-through' : 'none' }}>
              {item.text}
            </span>
            {item.confirm_with_doctor && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: GOLD, background: `${GOLD}18`, padding: '2px 6px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Stethoscope style={{ width: 9, height: 9 }} /> Confirm with doctor
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
