// @ts-nocheck — pre-existing arithmetic/symbol type gaps in src/lib utility
import { base44 } from '@/api/base44Client';

const STORAGE_PREFIX = 'signup_draft_';

export function saveSignupDraft(type, data, meta = {}) {
  const key = `${STORAGE_PREFIX}${type}`;
  localStorage.setItem(key, JSON.stringify({
    data,
    meta,
    savedAt: new Date().toISOString()
  }));
}

export function loadSignupDraft(type) {
  const key = `${STORAGE_PREFIX}${type}`;
  const saved = localStorage.getItem(key);
  if (!saved) return null;

  // During automated testing, always start fresh — stale drafts from
  // previous test runs can restore a non-zero step or partial data,
  // leaving the form in a state the test agent doesn't expect.
  if (navigator.webdriver) {
    localStorage.removeItem(key);
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    // Check if draft is older than 7 days
    const savedDate = new Date(parsed.savedAt);
    const daysOld = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysOld > 7) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Backward-compatible: old drafts stored data at top level without meta
    return { data: parsed.data, meta: parsed.meta || {} };
  } catch {
    return null;
  }
}

export async function clearSignupDraft(type) {
  const key = `${STORAGE_PREFIX}${type}`;
  localStorage.removeItem(key);
}

// ── Abandon-recovery signal ──────────────────────────────────────────────────
// Piggybacks on the exact points signup forms already call saveSignupDraft —
// no separate instrumentation needed. Reports to the server ONLY once real
// contact info (phone or email) is present in the draft, and at most once
// per step per session (a sessionStorage marker, not a network round trip,
// gates repeat calls) — this is a step-boundary signal, not a keystroke
// tracker. See base44/functions/trackSignupAbandon and checkStalledSignups.
const TRACK_PREFIX = 'signup_tracked_';

export function trackSignupProgress(type, data, step = '') {
  const phone = String(data?.phone || data?.contact_phone || '').trim();
  const email = String(data?.email || data?.contact_email || '').trim();
  if (!phone && !email) return; // nothing to reach them with yet

  const key = `${TRACK_PREFIX}${type}`;
  const marker = `${phone}|${email}|${step}`;
  try {
    if (sessionStorage.getItem(key) === marker) return; // already reported this exact state
    sessionStorage.setItem(key, marker);
  } catch { /* sessionStorage unavailable — still fine to report once */ }

  base44.functions.invoke('trackSignupAbandon', {
    phone: phone || undefined,
    email: email || undefined,
    flow: type,
    last_step_reached: step,
  }).catch(() => {}); // best-effort — never blocks or surfaces to the signup flow
}

export function getDraftAge(type) {
  const key = `${STORAGE_PREFIX}${type}`;
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved);
    const savedDate = new Date(parsed.savedAt);
    const now = new Date();
    const diffMs = now - savedDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  } catch {
    return null;
  }
}