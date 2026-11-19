import "server-only";
import webpush from "web-push";
import { getStore } from "./store";

type Sub = webpush.PushSubscription;

// VAPID keys come from env vars if set; otherwise they're generated once and
// kept in the database, so there's nothing to configure.
export async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const store = getStore();
  let keys = await store.get<{ publicKey: string; privateKey: string }>("push:vapid");
  if (!keys) {
    keys = webpush.generateVAPIDKeys();
    await store.set("push:vapid", keys);
  }
  return keys;
}

export async function addSubscription(sub: Sub) {
  const store = getStore();
  const subs = (await store.get<Sub[]>("push:subs")) ?? [];
  if (!subs.some((s) => s.endpoint === sub.endpoint)) subs.push(sub);
  await store.set("push:subs", subs);
}

export async function sendPush(payload: { title: string; body: string; url?: string }) {
  const store = getStore();
  const subs = (await store.get<Sub[]>("push:subs")) ?? [];
  if (!subs.length) return 0;
  const keys = await vapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:reminders@example.com", keys.publicKey, keys.privateKey);
  const alive: Sub[] = [];
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      alive.push(sub);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code !== 404 && code !== 410) alive.push(sub); // drop expired subscriptions only
    }
  }
  if (alive.length !== subs.length) await store.set("push:subs", alive);
  return sent;
}

export async function sendEmail(subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.REMINDER_EMAIL_TO;
  if (!key || !to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REMINDER_EMAIL_FROM ?? "Human 3.0 <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  return res.ok;
}
