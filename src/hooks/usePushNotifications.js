import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Never register the SW in dev — stale cached JS breaks React hooks
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      return;
    }

    async function registerPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Fetch the VAPID public key from backend
        const { data: keyData } = await base44.functions.invoke('getVapidPublicKey', {});
        if (!keyData?.publicKey) return;

        const existingSub = await reg.pushManager.getSubscription();
        const sub = existingSub || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });

        // Upsert subscription — find existing record for this user and update, or create new
        const existing = await base44.entities.UserPushSubscription.filter({ user_id: user.id });
        if (existing && existing.length > 0) {
          await base44.entities.UserPushSubscription.update(existing[0].id, {
            subscription: JSON.stringify(sub),
            user_email: user.email,
            user_agent: navigator.userAgent,
          });
        } else {
          await base44.entities.UserPushSubscription.create({
            user_id: user.id,
            user_email: user.email,
            subscription: JSON.stringify(sub),
            user_agent: navigator.userAgent,
          });
        }
      } catch (err) {
        console.warn('Push registration failed:', err);
      }
    }

    registerPush();
  }, [user?.id]);
}