import { NextResponse } from "next/server";
import { getDay, getSettings, localDate, localTime, saveDay } from "@/lib/data";

export const dynamic = "force-dynamic";

// One-tap logging. Body: { action, delta? , value? }
export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings) return NextResponse.json({ error: "not set up" }, { status: 400 });
  const body = await req.json();
  const date: string = body.date ?? localDate(settings.timezone);
  const day = await getDay(date);
  const delta = Number(body.delta ?? 1);
  const t = localTime(settings.timezone);

  switch (body.action) {
    case "drinks":
    case "nicotine":
    case "pages":
      day[body.action as "drinks" | "nicotine" | "pages"] = Math.max(0, day[body.action as "drinks"] + delta);
      day.log.push({ t, what: `${body.action} ${delta > 0 ? "+" : ""}${delta}` });
      break;
    case "gym":
      day.gym = !!body.value;
      day.log.push({ t, what: `gym ${day.gym ? "done" : "undone"}` });
      break;
    case "focus":
      day.focus = String(body.value ?? "").slice(0, 200);
      day.focusDone = false;
      break;
    case "focusDone":
      day.focusDone = !!body.value;
      day.log.push({ t, what: `focus ${day.focusDone ? "done" : "reopened"}` });
      break;
    case "mood":
      day.mood = Math.min(5, Math.max(1, Number(body.value)));
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  await saveDay(day);
  return NextResponse.json({ day });
}
