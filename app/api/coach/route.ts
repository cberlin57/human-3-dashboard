import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { buildContext, coach, type CoachKind } from "@/lib/coach";
import { dashboardState, getDay, saveDay } from "@/lib/data";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };
const KINDS: CoachKind[] = ["morning", "checkin", "chat"];

export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind") as CoachKind;
  const state = await dashboardState();
  if (!state.settings || !("today" in state)) return NextResponse.json({ messages: [] });
  const messages = (await getStore().get<Msg[]>(`chat:${state.today}:${kind}`)) ?? [];
  return NextResponse.json({ messages });
}

// Body: { kind, message? }. Starts the conversation if message is empty.
export async function POST(req: Request) {
  const { kind, message } = (await req.json()) as { kind: CoachKind; message?: string };
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "bad kind" }, { status: 400 });
  const state = await dashboardState();
  if (!state.settings || !("today" in state)) return NextResponse.json({ error: "not set up" }, { status: 400 });

  const key = `chat:${state.today}:${kind}`;
  const store = getStore();
  const history = (await store.get<Msg[]>(key)) ?? [];
  if (message?.trim()) history.push({ role: "user", content: message.trim().slice(0, 4000) });

  let reply = await coach(kind, buildContext(state), history as Anthropic.MessageParam[]);

  if (kind === "checkin") {
    const m = reply.match(/^SUMMARY:\s*(.+)$/m);
    if (m) {
      reply = reply.replace(m[0], "").trim();
      const day = await getDay(state.today);
      day.checkedIn = true;
      day.checkinSummary = m[1].trim();
      await saveDay(day);
    }
  }
  // An opening message with no user turn is stored with a synthetic user prompt
  // so the transcript always alternates user/assistant.
  if (!history.length) history.push({ role: "user", content: kind === "morning" ? "Good morning. Help me set up today." : "Let's check in." });
  history.push({ role: "assistant", content: reply });
  await store.set(key, history);
  return NextResponse.json({ messages: history });
}
