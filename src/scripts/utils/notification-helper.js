import { convertBase64ToUint8Array } from './index';
import { VAPID_PUBLIC_KEY } from '../config';
import { subscribePushNotification, unsubscribePushNotification } from '../data/api';

export function isNotificationAvailable() {
  return 'Notification' in window;
}

export function isNotificationGranted() {
  return Notification.permission === 'granted';
}

export function isNotificationDenied() {
  return Notification.permission === 'denied';
}

export async function requestNotificationPermission(silent = false) {
  if (!isNotificationAvailable()) {
    console.error('Notification API unsupported.');
    return false;
  }

  if (isNotificationGranted()) {
    return true;
  }

  if (isNotificationDenied()) {
    if (!silent) {
      console.log('Notification permission was previously denied.');
    }
    return false;
  }

  const status = await Notification.requestPermission();

  if (status === 'denied') {
    if (!silent) {
      alert('Izin notifikasi ditolak.');
    }
    return false;
  }

  if (status === 'default') {
    if (!silent) {
      alert('Izin notifikasi ditutup atau diabaikan.');
    }
    return false;
  }

  return true;
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionAvailable() {
  return !!(await getPushSubscription());
}

export function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY),
  };
}

/**
 * Auto subscribe to push notifications silently in background
 * This function doesn't show any alerts and fails silently
 * Called automatically after user login
 */
export async function autoSubscribe() {
  try {
    // Check if notification API is available
    if (!isNotificationAvailable()) {
      console.log('[AutoSubscribe] Notification API not available');
      return false;
    }

    // Check if already subscribed
    if (await isCurrentPushSubscriptionAvailable()) {
      console.log('[AutoSubscribe] Already subscribed to push notifications');
      return true;
    }

    // Request permission (will prompt user if not already granted/denied)
    const permissionGranted = await requestNotificationPermission(true);
    if (!permissionGranted) {
      console.log('[AutoSubscribe] Notification permission not granted');
      return false;
    }

    console.log('[AutoSubscribe] Subscribing to push notifications...');

    const registration = await navigator.serviceWorker.ready;
    const pushSubscription = await registration.pushManager.subscribe(generateSubscribeOptions());

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await subscribePushNotification({ endpoint, keys });

    if (!response.ok) {
      console.error('[AutoSubscribe] Failed to register subscription on server:', response);
      // Undo subscribe to push notification
      await pushSubscription.unsubscribe();
      return false;
    }

    console.log('[AutoSubscribe] Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('[AutoSubscribe] Error:', error);
    return false;
  }
}

export async function subscribe() {
  if (!(await requestNotificationPermission())) {
    return;
  }

  if (await isCurrentPushSubscriptionAvailable()) {
    alert('Sudah berlangganan push notification.');
    return;
  }

  console.log('Mulai berlangganan push notification...');

  const failureSubscribeMessage = 'Langganan push notification gagal diaktifkan.';
  const successSubscribeMessage = 'Langganan push notification berhasil diaktifkan.';

  let pushSubscription;

  try {
    const registration = await navigator.serviceWorker.ready;
    pushSubscription = await registration.pushManager.subscribe(generateSubscribeOptions());

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await subscribePushNotification({ endpoint, keys });

    if (!response.ok) {
      console.error('subscribe: response:', response);
      alert(failureSubscribeMessage);

      // Undo subscribe to push notification
      await pushSubscription.unsubscribe();

      return;
    }

    alert(successSubscribeMessage);
  } catch (error) {
    console.error('subscribe: error:', error);
    alert(failureSubscribeMessage);

    // Undo subscribe to push notification
    await pushSubscription.unsubscribe();
  }
}

export async function unsubscribe() {
  const failureUnsubscribeMessage = 'Langganan push notification gagal dinonaktifkan.';
  const successUnsubscribeMessage = 'Langganan push notification berhasil dinonaktifkan.';

  try {
    const pushSubscription = await getPushSubscription();

    if (!pushSubscription) {
      alert('Tidak bisa memutus langganan push notification karena belum berlangganan sebelumnya.');
      return;
    }

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await unsubscribePushNotification({ endpoint });

    if (!response.ok) {
      alert(failureUnsubscribeMessage);
      console.error('unsubscribe: response:', response);

      return;
    }

    const unsubscribed = await pushSubscription.unsubscribe();

    if (!unsubscribed) {
      alert(failureUnsubscribeMessage);
      await subscribePushNotification({ endpoint, keys });

      return;
    }

    alert(successUnsubscribeMessage);
  } catch (error) {
    alert(failureUnsubscribeMessage);
    console.error('unsubscribe: error:', error);
  }
}
