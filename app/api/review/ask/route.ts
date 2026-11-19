import { NextResponse } from "next/server";
import { buildContext, coach } from "@/lib/coach";
import { dashboardState } from "@/lib/data";
import { SLICES, notation } from "@/lib/framework";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { scores, note } = await req.json();
  const state = await dashboardState();
  if (!state.settings || !("today" in state)) return NextResponse.json({ error: "not set up" }, { status: 400 });
  const proposed = SLICES.map((s) => `${s.name}: ${notation(scores?.[s.id] ?? 1)}`).join(", ");
  const reply = await coach("review", buildContext(state), [
    {
      role: "user",
      content: `My proposed scores this week: ${proposed}.${note ? `\nMy notes on the week: ${String(note).slice(0, 3000)}` : ""}\nGive me your honest review.`,
    },
  ]);
  return NextResponse.json({ reply });
}
