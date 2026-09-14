import { apiFetch } from "./client";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function subscribeToPush(data: PushSubscriptionData): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/push/subscribe", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function unsubscribeFromPush(endpoint: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}
