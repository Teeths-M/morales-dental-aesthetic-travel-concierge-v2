import React from 'react';
import { notificationDisplayStatus } from '@/lib/incidentDispatchClient';

/**
 * NotificationStatusBadge — the ONLY way a notification status may be rendered.
 *
 * It goes through notificationDisplayStatus so a SENT row can never be shown
 * as "Delivered". That distinction is the difference between "the carrier took
 * it" and "the person's phone has it", which is exactly what matters in an
 * emergency.
 */
const TONE_CLASS = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
};

export default function NotificationStatusBadge({ status }) {
  const view = notificationDisplayStatus(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[view.tone]}`}>
      {view.label}
    </span>
  );
}