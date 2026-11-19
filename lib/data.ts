import "server-only";
import { getStore } from "./store";
import { STARTING_SCORES, type Scores } from "./framework";

export interface Settings {
  timezone: string;
  startDate: string; // YYYY-MM-DD, the Monday-agnostic day you started
  why: string; // your own reason, shown when things get hard
  baseline: { drinksPerWeek: number; nicotinePerDay: number };
  taperPct: number; // % of baseline removed from the weekly budget each successful week
  gymPerWeek: number;
  pagesPerDay: number;
  reminders: { morning: string; midday: string; evening: string }; // "HH:MM" local
  email: boolean;
}

export interface Day {
  date: string;
  drinks: number;
  nicotine: number;
  gym: boolean;
  pages: number;
  focus: string;
  focusDone: boolean;
  mood: number | null; // 1..5
  checkedIn: boolean;
  checkinSummary: string;
  log: { t: string; what: string }[];
}

export interface Review {
  week: string; // Monday YYYY-MM-DD
  scores: Scores;
  summary: string;
  createdAt: string;
}

export const DEFAULT_SETTINGS: Omit<Settings, "timezone" | "startDate"> = {
  why: "",
  baseline: { drinksPerWeek: 21, nicotinePerDay: 20 },
  taperPct: 10,
  gymPerWeek: 2,
  pagesPerDay: 10,
  reminders: { morning: "08:00", midday: "13:00", evening: "21:00" },
  email: true,
};

// ---------- dates ----------
export function localDate(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function localTime(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekStart(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -dow);
}
export function weekday(date: string): number {
  return (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
}

// ---------- persistence ----------
const store = () => getStore();

export async function getSettings(): Promise<Settings | null> {
  return store().get<Settings>("settings");
}
export async function saveSettings(s: Settings) {
  await store().set("settings", s);
}

export function emptyDay(date: string): Day {
  return { date, drinks: 0, nicotine: 0, gym: false, pages: 0, focus: "", focusDone: false, mood: null, checkedIn: false, checkinSummary: "", log: [] };
}
export async function getDay(date: string): Promise<Day> {
  return { ...emptyDay(date), ...((await store().get<Day>(`day:${date}`)) ?? {}) };
}
export async function saveDay(day: Day) {
  await store().set(`day:${day.date}`, day);
}
export async function allDays(): Promise<Day[]> {
  return (await store().list<Day>("day:")).map((r) => ({ ...emptyDay(r.value.date), ...r.value }));
}
export async function allReviews(): Promise<Review[]> {
  return (await store().list<Review>("review:")).map((r) => r.value);
}
export async function saveReview(r: Review) {
  await store().set(`review:${r.week}`, r);
}

export function showedUp(d: Day | undefined): boolean {
  return !!d && (d.log.length > 0 || d.checkedIn || !!d.focus);
}

// ---------- taper ----------
// Weekly budgets step down only after a week you stayed within budget.
// A bad week holds the budget where it is; it never punishes you.
export function budgetForWeek(
  baselinePerWeek: number,
  taperPct: number,
  startDate: string,
  targetWeek: string,
  usedByWeek: Map<string, number>,
): number {
  const step = Math.max(1, Math.round((baselinePerWeek * taperPct) / 100));
  let budget = baselinePerWeek;
  for (let w = weekStart(startDate); w < targetWeek; w = addDays(w, 7)) {
    const used = usedByWeek.get(w) ?? 0;
    if (used <= budget) budget = Math.max(0, budget - step);
  }
  return budget;
}

function sumByWeek(days: Day[], f: (d: Day) => number) {
  const m = new Map<string, number>();
  for (const d of days) m.set(weekStart(d.date), (m.get(weekStart(d.date)) ?? 0) + f(d));
  return m;
}

export async function dashboardState() {
  const settings = await getSettings();
  if (!settings) return { settings: null };
  const today = localDate(settings.timezone);
  const days = await allDays();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const todayDay = byDate.get(today) ?? emptyDay(today);
  const wk = weekStart(today);
  const weekDays = days.filter((d) => weekStart(d.date) === wk);

  const drinksBudget = budgetForWeek(settings.baseline.drinksPerWeek, settings.taperPct, settings.startDate, wk, sumByWeek(days, (d) => d.drinks));
  const nicotineBudget = budgetForWeek(settings.baseline.nicotinePerDay * 7, settings.taperPct, settings.startDate, wk, sumByWeek(days, (d) => d.nicotine));
  const daysLeft = 7 - weekday(today); // including today

  const week = {
    start: wk,
    drinks: { used: weekDays.reduce((a, d) => a + d.drinks, 0), budget: drinksBudget },
    nicotine: { used: weekDays.reduce((a, d) => a + d.nicotine, 0), budget: nicotineBudget },
    gym: { done: weekDays.filter((d) => d.gym).length, target: settings.gymPerWeek },
    pages: { done: weekDays.reduce((a, d) => a + d.pages, 0), target: settings.pagesPerDay * 7 },
    daysLeft,
  };

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((date) => byDate.get(date) ?? emptyDay(date));
  const last7 = last14.slice(7);
  const consistency = last7.filter((d) => d.date >= settings.startDate && showedUp(d)).length;
  const yesterday = byDate.get(addDays(today, -1));
  const missedYesterday = addDays(today, -1) >= settings.startDate && !showedUp(yesterday);

  const reviews = await allReviews();
  const latest = reviews.at(-1);
  const previous = reviews.at(-2);
  const reviewedThisWeek = reviews.some((r) => r.week === wk);
  const reviewDue = !reviewedThisWeek && (weekday(today) >= 5 || reviews.length === 0);

  return {
    settings,
    today,
    now: localTime(settings.timezone),
    day: todayDay,
    week,
    last14,
    consistency,
    missedYesterday,
    scores: latest?.scores ?? STARTING_SCORES,
    previousScores: previous?.scores ?? null,
    reviews,
    reviewDue,
    reviewedThisWeek,
  };
}

export type DashboardState = Awaited<ReturnType<typeof dashboardState>>;
