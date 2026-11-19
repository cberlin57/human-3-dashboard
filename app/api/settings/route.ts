import { NextResponse } from "next/server";
import { DEFAULT_SETTINGS, getSettings, localDate, saveSettings, type Settings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Settings>;
  const current = await getSettings();
  const timezone = body.timezone ?? current?.timezone ?? "America/New_York";
  const next: Settings = {
    ...DEFAULT_SETTINGS,
    ...current,
    ...body,
    baseline: { ...DEFAULT_SETTINGS.baseline, ...current?.baseline, ...body.baseline },
    reminders: { ...DEFAULT_SETTINGS.reminders, ...current?.reminders, ...body.reminders },
    timezone,
    startDate: current?.startDate ?? localDate(timezone),
  };
  await saveSettings(next);
  return NextResponse.json({ settings: next });
}
