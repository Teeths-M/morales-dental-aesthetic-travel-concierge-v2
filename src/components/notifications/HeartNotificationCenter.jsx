import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { HEART_ROLES } from './heartConfig';
import HeartToast from './HeartToast';
import HeartRingAnimation from './HeartRingAnimation';

let globalDispatch = null;

/**
 * Programmatically trigger a heart notification from anywhere in the app.
 * Usage: triggerHeartNotification({ roles: ['doctor'], message: 'Dr. Ahmed confirmed your date.' })
 */
export function triggerHeartNotification(payload) {
  globalDispatch?.(payload);
}

export default function HeartNotificationCenter({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [ringEvent, setRingEvent] = useState(null);
  const [ringing, setRinging] = useState(false);
  const pendingRoles = useRef([]);
  const batchTimer = useRef(null);

  // Register global dispatcher
  useEffect(() => {
    globalDispatch = (payload) => addNotification(payload);
    return () => { globalDispatch = null; };
  }, []);

  const addNotification = useCallback((payload) => {
    const { roles = ['patient'], message = 'New update', timestamp = new Date().toISOString() } = payload;
    const id = Date.now() + Math.random();

    // Batch simultaneous role updates within 400ms window
    pendingRoles.current.push(...roles);
    clearTimeout(batchTimer.current);

    batchTimer.current = setTimeout(() => {
      const uniqueRoles = [...new Set(pendingRoles.current)].slice(0, 2);
      pendingRoles.current = [];

      const note = { id, roles: uniqueRoles, message, timestamp };
      setNotifications((prev) => [note, ...prev].slice(0, 5));

      // Trigger ring animation
      const colors = uniqueRoles.map((r) => HEART_ROLES[r]?.color || '#EF4444');
      setRingEvent({ colors });
      setRinging(true);
    }, 400);
  }, []);

  // Subscribe to CaseMessage entity in real-time
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.CaseMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const fromRole = event.data?.from_role || 'patient';
      addNotification({
        roles: [fromRole],
        message: event.data?.message?.slice(0, 80) || 'New message received',
        timestamp: event.data?.sent_at || new Date().toISOString(),
      });
    });

    return () => unsubscribe();
  }, [user, addNotification]);

  // Subscribe to DigitalHandshake completions
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.DigitalHandshake.subscribe((event) => {
      if (event.type !== 'update') return;
      if (event.data?.status !== 'completed') return;
      const actorRole = event.data?.actor_role || 'patient';
      addNotification({
        roles: [actorRole],
        message: event.data?.checkpoint_label || 'Handshake checkpoint completed',
        timestamp: event.data?.completed_at || new Date().toISOString(),
      });
    });

    return () => unsubscribe();
  }, [user, addNotification]);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <>
      {/* Ring overlay */}
      <HeartRingAnimation
        colors={ringEvent?.colors || ['#EF4444']}
        show={ringing}
        onDone={() => { setRinging(false); setRingEvent(null); }}
      />

      {/* Toast stack — bottom right */}
      <div className="fixed bottom-[calc(1.5rem+var(--bottom-tab-bar-height,0px))] right-5 z-[9998] flex flex-col gap-2.5 items-end">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <HeartToast key={n.id} notification={n} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}