import { useCallback, useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "../api/push";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

interface UsePushNotificationsResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js"
        );
        const existing = await registration.pushManager.getSubscription();
        setIsSubscribed(existing !== null);
      } catch {
        setError("Не удалось проверить push-подписку");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push-уведомления не поддерживаются в этом браузере");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError("Push-уведомления временно недоступны (нет ключа сервера)");
      return;
    }

    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Уведомления заблокированы в настройках браузера");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Некорректные данные push-подписки");
      }

      await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      setIsSubscribed(true);
    } catch {
      setError("Не удалось подписаться на уведомления");
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch {
      setError("Не удалось отписаться от уведомлений");
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
