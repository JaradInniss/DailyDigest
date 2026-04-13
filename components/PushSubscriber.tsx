'use client';

import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushSubscriber() {
  const { isSupported, subscribe } = usePushNotifications();

  useEffect(() => {
    if (isSupported) {
      subscribe();
    }
  }, [isSupported, subscribe]);

  return null;
}