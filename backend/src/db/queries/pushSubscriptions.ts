import type { PushSubscriptionRow } from "../../types";

export interface UpsertPushSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function upsertPushSubscription(
  db: D1Database,
  input: UpsertPushSubscriptionInput
): Promise<PushSubscriptionRow> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth`
    )
    .bind(id, input.userId, input.endpoint, input.p256dh, input.auth)
    .run();

  const row = await db
    .prepare("SELECT * FROM push_subscriptions WHERE endpoint = ?")
    .bind(input.endpoint)
    .first<PushSubscriptionRow>();

  if (!row) {
    throw new Error("Не удалось сохранить push-подписку");
  }

  return row;
}

export async function deletePushSubscriptionByEndpoint(
  db: D1Database,
  endpoint: string
): Promise<void> {
  await db
    .prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
    .bind(endpoint)
    .run();
}

export async function listPushSubscriptionsByUser(
  db: D1Database,
  userId: string
): Promise<PushSubscriptionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM push_subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<PushSubscriptionRow>();

  return results ?? [];
}

export async function listTeacherPushSubscriptions(
  db: D1Database
): Promise<PushSubscriptionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT push_subscriptions.*
       FROM push_subscriptions
       JOIN users ON users.id = push_subscriptions.user_id
       WHERE users.role = 'teacher'`
    )
    .all<PushSubscriptionRow>();

  return results ?? [];
}
