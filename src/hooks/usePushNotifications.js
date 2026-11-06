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

        // Check for existing subscription BEFORE fetching VAPID key
        // Avoids a round-trip when already subscribed
        const existingSub = await reg.pushManager.getSubscription();

        const { data: keyData } = await base44.functions.invoke('getVapidPublicKey', {});
        if (!keyData?.publicKey) return;

        const sub = existingSub || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });

        // The server saves it under the signed-in account; the browser can't
        // write push subscriptions itself.
        await base44.functions.invoke('registerPushSubscription', {
          subscription: JSON.stringify(sub),
          user_agent: navigator.userAgent.slice(0, 512),
        });
      } catch (err) {
        console.warn('Push registration failed:', err);
      }
    }

    registerPush();
  }, [user?.id]);
}