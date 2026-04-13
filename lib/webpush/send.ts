import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/server';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails('mailto:app@daily-digest.local', vapidPublicKey, vapidPrivateKey);

interface PushNotificationPayload {
  title: string;
  body: string;
}

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<void> {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    console.error('Failed to fetch push subscriptions:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions found');
    return;
  }

  const expiredEndpoints: string[] = [];

  for (const subscription of subscriptions) {
    const pushSubscription: webpush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    } catch (err) {
      const error = err as webpush.WebPushError;

      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription expired or no longer valid
        expiredEndpoints.push(subscription.endpoint);
        console.warn(`Removing expired push subscription: ${subscription.endpoint}`);
      } else {
        console.error(`Failed to send push notification to ${subscription.endpoint}:`, error);
      }
    }
  }

  // Remove expired subscriptions
  if (expiredEndpoints.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);

    if (deleteError) {
      console.error('Failed to remove expired subscriptions:', deleteError);
    } else {
      console.log(`Removed ${expiredEndpoints.length} expired subscription(s)`);
    }
  }
}
