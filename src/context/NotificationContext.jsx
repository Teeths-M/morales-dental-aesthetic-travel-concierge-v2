import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

let _notificationId = 0;

/**
 * Global notification system — Uber/Apple style.
 * Any component can call showNotification() to surface a banner.
 *
 * Notification shape:
 * {
 *   type:     'arrival'|'driver'|'handshake'|'checkin'|'alert'|'success'|'info'
 *   title:    string
 *   body:     string (optional)
 *   icon:     string (emoji)
 *   action:   { label, onPress } (optional — makes it a tappable CTA)
 *   duration: number ms (default 5000; 0 = stay until dismissed)
 *   position: 'top'|'bottom' (default 'top')
 * }
 */
export function NotificationProvider({ children }) {
  const [stack, setStack] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setStack(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((notification) => {
    const id = ++_notificationId;
    const n = {
      id,
      position: 'top',
      duration: 5000,
      ...notification,
    };
    setStack(prev => [n, ...prev].slice(0, 4)); // max 4 simultaneous

    if (n.duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), n.duration);
    }
    return id;
  }, [dismiss]);

  return (
    <NotificationContext.Provider value={{ showNotification, dismiss, stack }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be inside NotificationProvider');
  return ctx;
}
