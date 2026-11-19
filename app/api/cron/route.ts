import { NextResponse } from "next/server";
import { dashboardState } from "@/lib/data";
import { sendEmail, sendPush } from "@/lib/push";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Called hourly by .github/workflows/reminders.yml. Sends each reminder once a
// day, any time in the two hours after its scheduled local time.
type Slot = "morning" | "midday" | "evening";

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const state = await dashboardState();
  if (!state.settings || !("today" in state)) return NextResponse.json({ skipped: "not set up" });

  const store = getStore();
  const now = minutes(state.now);
  const url = process.env.APP_URL ?? "/";
  const sent: string[] = [];
  const { week, day } = state;
  const drinksLeft = Math.max(0, week.drinks.budget - week.drinks.used);
  const nicLeft = Math.max(0, week.nicotine.budget - week.nicotine.used);

  for (const slot of ["morning", "midday", "evening"] as Slot[]) {
    const at = minutes(state.settings.reminders[slot]);
    if (now < at || now > at + 120) continue;
    const flag = `sent:${state.today}:${slot}`;
    if (await store.get(flag)) continue;

    let title = "";
    let body = "";
    if (slot === "morning") {
      title = state.missedYesterday ? "Never miss twice" : "Set today's focus";
      body = state.missedYesterday
        ? "Yesterday was off. Today is the one that counts. Pick one focus."
        : `Pick one focus. This week: ${drinksLeft} drinks and ${nicLeft} nicotine left in budget, gym ${week.gym.done}/${week.gym.target}.`;
      if (state.settings.email) {
        await sendEmail(
          `Human 3.0: ${title}`,
          `${body}\n\nReading: ${week.pages.done}/${week.pages.target} pages this week.\nShowed up ${state.consistency} of the last 7 days.\n${state.settings.why ? `\nYour why: ${state.settings.why}\n` : ""}\nOpen your dashboard: ${url}`,
        );
      }
    } else if (slot === "midday") {
      if (day.focusDone) continue;
      title = day.focus ? "Midday check" : "No focus set yet";
      body = day.focus ? `Today's focus: ${day.focus}. Is it done?` : "Take 30 seconds and choose one thing that matters today.";
    } else {
      if (day.checkedIn) continue;
      title = "Two-minute check-in";
      body = state.reviewDue ? "Check in, and your weekly review is ready." : "Log today and close it out with the coach.";
    }
    await sendPush({ title, body, url });
    await store.set(flag, true);
    sent.push(slot);
  }
  return NextResponse.json({ sent });
}
