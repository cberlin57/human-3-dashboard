import { NextResponse } from "next/server";
import { SLICES } from "@/lib/framework";
import { dashboardState, saveReview } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { scores, summary } = await req.json();
  const state = await dashboardState();
  if (!state.settings || !("today" in state)) return NextResponse.json({ error: "not set up" }, { status: 400 });
  const clean = Object.fromEntries(SLICES.map((s) => [s.id, Math.min(9, Math.max(1, Math.round(Number(scores?.[s.id] ?? 1))))]));
  await saveReview({ week: state.week.start, scores: clean, summary: String(summary ?? "").slice(0, 4000), createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
