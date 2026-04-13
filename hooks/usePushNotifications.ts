'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsReturn {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isServiceWorkerSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(isServiceWorkerSupported);

    if (!isServiceWorkerSupported) return;

    // Register Service Worker
navigator.serviceWorker
  .register('/sw.js')
  .then((registration) => {
    console.log('Service Worker registered:', registration.scope);

    // Check existing subscription
    return registration.pushManager.getSubscription();
  })
  .then((subscription) => {
    if (subscription) {
      setIsSubscribed(true);
    }
  })
  .catch((error) => {
    console.error('Service Worker registration failed:', error);
  });
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.permission;

      if (permission !== 'granted') {
        const newPermission = await Notification.requestPermission();
        if (newPermission !== 'granted') {
          console.warn('Notification permission denied');
          return;
        }
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();
      const subscriptionData: PushSubscription = {
        endpoint: subscriptionJson.endpoint!,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
        },
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (response.ok) {
        setIsSubscribed(true);
      } else {
        console.error('Failed to send subscription to server:', response.status);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }, []);

  return { isSubscribed, isSupported, subscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
