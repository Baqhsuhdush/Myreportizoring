import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import type { PushSubscribeRequestBody } from "../types";
import {
  deletePushSubscriptionByEndpoint,
  upsertPushSubscription,
} from "../db/queries/pushSubscriptions";

const push = new Hono<AppEnv>();

push.post("/subscribe", requireAuth, async (c) => {
  const auth = c.get("auth")!;
  const body = await c.req.json<Partial<PushSubscribeRequestBody>>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "Некорректные данные push-подписки" }, 400);
  }

  await upsertPushSubscription(c.env.DB, {
    userId: auth.userId,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
  });

  return c.json({ message: "Подписка на уведомления оформлена" });
});

push.post("/unsubscribe", requireAuth, async (c) => {
  const body = await c.req.json<{ endpoint?: string }>();

  if (!body.endpoint) {
    return c.json({ error: "Не указан endpoint" }, 400);
  }

  await deletePushSubscriptionByEndpoint(c.env.DB, body.endpoint);
  return c.json({ message: "Подписка отключена" });
});

export default push;
