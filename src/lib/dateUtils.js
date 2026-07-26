/**
 * daysUntil — whole calendar days between today and a target ISO date.
 * Shared by every "countdown to X" UI so they can't drift from each other
 * (Dashboard's procedure countdown and ProcedurePrepCoach both use this).
 * Returns null when no date is given.
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
