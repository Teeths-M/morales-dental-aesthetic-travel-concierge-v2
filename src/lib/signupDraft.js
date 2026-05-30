import { base44 } from '@/api/base44Client';

const STORAGE_PREFIX = 'signup_draft_';

export async function saveSignupDraft(type, data) {
  const key = `${STORAGE_PREFIX}${type}`;
  localStorage.setItem(key, JSON.stringify({
    data,
    savedAt: new Date().toISOString()
  }));
}

export async function loadSignupDraft(type) {
  const key = `${STORAGE_PREFIX}${type}`;
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved);
    // Check if draft is older than 7 days
    const savedDate = new Date(parsed.savedAt);
    const daysOld = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysOld > 7) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
}

export async function clearSignupDraft(type) {
  const key = `${STORAGE_PREFIX}${type}`;
  localStorage.removeItem(key);
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