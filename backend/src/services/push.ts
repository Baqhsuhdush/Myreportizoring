import webpush from "web-push";
import type { Env, PushSubscriptionRow } from "../types";
import {
  deletePushSubscriptionByEndpoint,
  listTeacherPushSubscriptions,
} from "../db/queries/pushSubscriptions";

export interface PushPayload {
  title: string;
  body: string;
  /** Ссылка, на которую откроется вкладка при клике на уведомление */
  url?: string;
}

function configureWebPush(env: Env): boolean {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }
  try {
    webpush.setVapidDetails(
      "mailto:admin@fizikalab.local",
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
    return true;
  } catch (error) {
    console.warn("VAPID setup warning:", error);
    return false;
  }
}

async function sendToSubscription(
  db: D1Database,
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;

    if (statusCode === 404 || statusCode === 410) {
      await deletePushSubscriptionByEndpoint(db, subscription.endpoint);
      return;
    }

    console.error("Не удалось отправить push-уведомление:", error);
  }
}

export async function notifyTeacher(
  db: D1Database,
  env: Env,
  payload: PushPayload
): Promise<void> {
  const isConfigured = configureWebPush(env);
  if (!isConfigured) {
    return;
  }

  const subscriptions = await listTeacherPushSubscriptions(db);

  await Promise.all(
    subscriptions.map((subscription) =>
      sendToSubscription(db, subscription, payload)
    )
  );
}
