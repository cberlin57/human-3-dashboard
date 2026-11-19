import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SLICES, QUADRANTS, notation, overall, archetype, type Scores } from "./framework";
import type { DashboardState } from "./data";

export type CoachKind = "morning" | "checkin" | "review" | "chat";

const MODEL = "claude-opus-5-5";

const FRAMEWORK = `
THE HUMAN 3.0 MODEL (Dan Koe)
- Four quadrants: Mind (personal mental: thoughts, emotions, beliefs), Body (personal physical: habits, training, nutrition, appearance), Spirit (collective mental: relationships, community, meaning), Vocation (collective physical: career, money, systems).
- Three levels per quadrant: 1.0 Conformist, 2.0 Individualist, 3.0 Synthesist. Each level moves through three phases: Dissonance (you have "gotten your taste" and feel the pull to grow), Uncertainty (stepping into the unknown), Discovery (acquiring traits and finding the next level). "Body 1.2" means level 1, phase 2.
- Three traits drive progress: Knowledge, Experience, Skill. Knowledge without skill blocks experience. Traps: boredom (too little challenge), anxiety (too much), and False Transformation (feeling of progress without real change, like consuming content instead of acting).
- Channels: an obsessive rabbit hole of knowledge and skill that turns into fast experience. The fastest way out of Dissonance. Glitches: accelerants such as AI, deadlines, or environment changes.
- Archetypes: Mind NPC -> Player -> Creator; Body Incel -> Chad -> Sigma; Spirit Religion -> Atheism -> Mysticism; Vocation Job -> Career -> Calling.
- Development is problem solving: each level solves the problems of the last and reveals new ones.`;

const PERSONA = `You are the coach inside Chase's personal Human 3.0 dashboard. Chase is starting from the bottom in every quadrant and has tried and quit many habit systems before. His goals: stop daily drinking (gradual taper), stop vaping and smoking (gradual taper, eventually zero), get back into the gym and build a body he is proud of, read more and become more knowledgeable, and become the best version of himself. He wants to be pushed.

How you coach:
- Direct, warm, adult. Talk like a sharp friend who respects him, not a cheerleader or a therapist. No emojis, no XP, no badges, no hype.
- Short. He checks in for a couple of minutes. Two to five sentences per reply unless he asks for more. Ask at most one question at a time.
- Push for the next concrete action today, small enough that he will actually do it.
- A missed day or a heavy night is data, not failure. Never shame. Apply "never miss twice": the day after a slip is the one that matters. Look for the cause (stress, boredom, social setting, time of day) and one change for next time.
- Tapers are weekly budgets that only step down after a week he stays inside them. Respect them; do not demand cold turkey.
- Use the Human 3.0 language (quadrants, phases, traps, channels) where it adds clarity, not as decoration. Point out when he is in Dissonance, or when an action is False Transformation.
- Ground what you say in his actual numbers below. If the data shows a pattern, name it.`;

const KIND_INSTRUCTIONS: Record<CoachKind, string> = {
  morning:
    "This is the morning check-in. Help him choose ONE focus for today that moves his weakest area or his goals forward, and remind him of today's budgets. If he slipped yesterday, address it in one line and move on. Under 90 words.",
  checkin:
    "This is the evening check-in. Ask how the day went if he has not said. Reflect his numbers back honestly, name one thing that went right, find the cause of anything that went wrong, and set up tomorrow with one specific intention. Keep it to two or three exchanges. When the check-in feels complete, end your message with a line that starts with 'SUMMARY:' followed by a one-sentence summary of the day for his records.",
  review:
    "This is the weekly review. He is re-scoring the 12 slices of his radar on a 1.1 to 3.3 scale. Look at the week's data and his proposed scores. Be honest: if a score looks inflated relative to his behavior, say so; if he is underrating real progress, say that too. Name the quadrant that most needs attention next week and suggest one Channel or concrete habit for it. If he hit his budgets, note the taper steps down next week. Under 200 words.",
  chat: "He opened the coach to talk. Help with whatever he brings, tied back to his goals when it is useful.",
};

function describeScores(scores: Scores) {
  const o = overall(scores);
  const lines = QUADRANTS.map((q) => {
    const slices = SLICES.filter((s) => s.quadrant === q.id)
      .map((s) => `${s.name} ${notation(scores[s.id] ?? 1)}`)
      .join(", ");
    return `- ${q.name} (${archetype(scores, q.id)}): ${slices}`;
  });
  return `Overall ${o.total}/12 = Human ${o.level}.0 (average ${o.notation})\n${lines.join("\n")}`;
}

export function buildContext(state: Extract<DashboardState, { today: string }>) {
  const s = state.settings;
  const days = state.last14
    .map((d) => {
      const bits = [
        `drinks ${d.drinks}`,
        `nicotine ${d.nicotine}`,
        d.gym ? "gym yes" : "gym no",
        `pages ${d.pages}`,
        d.focus ? `focus "${d.focus}"${d.focusDone ? " (done)" : ""}` : null,
        d.mood ? `mood ${d.mood}/5` : null,
        d.checkinSummary ? `summary: ${d.checkinSummary}` : null,
      ].filter(Boolean);
      return `${d.date}: ${d.date < s.startDate ? "(before start)" : bits.join(", ")}`;
    })
    .join("\n");
  const w = state.week;
  return `TODAY: ${state.today}, local time ${state.now}. Started on ${s.startDate}.
HIS WHY: ${s.why || "(not written yet)"}

THIS WEEK (from ${w.start}, ${w.daysLeft} days left including today):
- Drinks ${w.drinks.used} of a ${w.drinks.budget} weekly budget (baseline was ${s.baseline.drinksPerWeek}/week)
- Nicotine ${w.nicotine.used} of a ${w.nicotine.budget} weekly budget (baseline was ${s.baseline.nicotinePerDay}/day)
- Gym ${w.gym.done} of ${w.gym.target} sessions
- Pages ${w.pages.done} of ${w.pages.target}
- Showed up ${state.consistency} of the last 7 days${state.missedYesterday ? ". He did not show up yesterday." : ""}

LAST 14 DAYS:
${days}

CURRENT RADAR:
${describeScores(state.scores)}`;
}

let client: Anthropic | null = null;

export async function coach(
  kind: CoachKind,
  context: string,
  messages: Anthropic.MessageParam[],
  extra?: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "The coach isn't connected yet. Add ANTHROPIC_API_KEY to the app's environment variables to turn it on.";
  }
  client ??= new Anthropic();
  const system = `${PERSONA}\n${FRAMEWORK}\n\n${KIND_INSTRUCTIONS[kind]}\n\n--- CHASE'S DATA ---\n${context}${extra ? `\n\n${extra}` : ""}`;
  const convo: Anthropic.MessageParam[] = messages.length
    ? messages
    : [{ role: "user", content: kind === "morning" ? "Good morning. Help me set up today." : kind === "checkin" ? "Evening check-in." : "Start." }];

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: convo,
    });
    if (response.stop_reason === "refusal") {
      return "I couldn't answer that one. Try rephrasing it.";
    }
    return response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return "The coach's API key was rejected. Check ANTHROPIC_API_KEY.";
    if (err instanceof Anthropic.RateLimitError) return "The coach is rate limited right now. Try again in a minute.";
    if (err instanceof Anthropic.APIError) return `The coach hit an error (${err.status}). Try again shortly.`;
    throw err;
  }
}
