import { NextResponse } from "next/server";
import { addSubscription, sendPush, vapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ publicKey: (await vapidKeys()).publicKey });
}

export async function POST(req: Request) {
  const sub = await req.json();
  await addSubscription(sub);
  await sendPush({ title: "Reminders are on", body: "You'll get your morning, midday and evening nudges here." });
  return NextResponse.json({ ok: true });
}
