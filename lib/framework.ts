// The Human 3.0 model (Dan Koe): 4 quadrants x 3 slices, each scored on
// 3 levels x 3 phases. A slice score is stored as 1..9:
//   1 = 1.1 (Level 1, Dissonance) ... 9 = 3.3 (Level 3, Discovery)

export type QuadrantId = "mind" | "body" | "spirit" | "vocation";

export interface Slice {
  id: string;
  quadrant: QuadrantId;
  name: string;
  question: string; // what the weekly review asks about this slice
}

export interface Quadrant {
  id: QuadrantId;
  name: string;
  subtitle: string;
  description: string;
  archetypes: [string, string, string];
}

export const QUADRANTS: Quadrant[] = [
  {
    id: "mind",
    name: "Mind",
    subtitle: "Personal mental world",
    description: "Your thoughts, emotions, beliefs, and internal world.",
    archetypes: ["NPC", "Player", "Creator"],
  },
  {
    id: "body",
    name: "Body",
    subtitle: "Personal physical world",
    description: "Your behavior and appearance. Habits and actions.",
    archetypes: ["Incel", "Chad", "Sigma"],
  },
  {
    id: "vocation",
    name: "Vocation",
    subtitle: "Collective physical world",
    description: "Your relationship to systems, career, and the economy.",
    archetypes: ["Job", "Career", "Calling"],
  },
  {
    id: "spirit",
    name: "Spirit",
    subtitle: "Collective mental world",
    description: "Relationships, community, meaning, and connection.",
    archetypes: ["Religion", "Atheism", "Mysticism"],
  },
];

// Order matters: drawn clockwise from 12 o'clock. Body is top-right,
// Vocation bottom-right, Spirit bottom-left, Mind top-left (as in the article).
export const SLICES: Slice[] = [
  { id: "training", quadrant: "body", name: "Training", question: "How consistently are you training, and is your body changing?" },
  { id: "fuel", quadrant: "body", name: "Fuel", question: "Nutrition, alcohol and nicotine: what are you putting into your body?" },
  { id: "recovery", quadrant: "body", name: "Recovery", question: "Sleep, energy and how you carry yourself." },
  { id: "craft", quadrant: "vocation", name: "Craft", question: "Are you building valuable skills and producing real work?" },
  { id: "wealth", quadrant: "vocation", name: "Wealth", question: "Money: income, spending, saving, direction." },
  { id: "contribution", quadrant: "vocation", name: "Contribution", question: "Does your work feel like yours, a calling rather than a job?" },
  { id: "relationships", quadrant: "spirit", name: "Relationships", question: "Family, friends, partner: are you showing up for them?" },
  { id: "community", quadrant: "spirit", name: "Community", question: "Do you belong somewhere, with people who pull you up?" },
  { id: "meaning", quadrant: "spirit", name: "Meaning", question: "Do you know what you are living for?" },
  { id: "awareness", quadrant: "mind", name: "Awareness", question: "How well do you notice and manage your thoughts and emotions?" },
  { id: "knowledge", quadrant: "mind", name: "Knowledge", question: "Reading, learning, thinking for yourself." },
  { id: "focus", quadrant: "mind", name: "Focus", question: "Can you direct your attention and keep promises to yourself?" },
];

export const PHASES = ["Dissonance", "Uncertainty", "Discovery"] as const;
export const LEVELS = [
  { name: "Human 1.0", title: "The Conformist" },
  { name: "Human 2.0", title: "The Individualist" },
  { name: "Human 3.0", title: "The Synthesist" },
] as const;

export type Scores = Record<string, number>; // slice id -> 1..9

export const STARTING_SCORES: Scores = Object.fromEntries(SLICES.map((s) => [s.id, 1]));

export function levelOf(value: number): number {
  return Math.min(3, Math.max(1, Math.ceil(value / 3)));
}
export function phaseOf(value: number): number {
  return ((Math.round(value) - 1) % 3) + 1;
}
/** "2.1" style notation for a 1..9 value */
export function notation(value: number): string {
  const v = Math.min(9, Math.max(1, Math.round(value)));
  return `${levelOf(v)}.${phaseOf(v)}`;
}

export function quadrantAverage(scores: Scores, q: QuadrantId): number {
  const s = SLICES.filter((x) => x.quadrant === q);
  return s.reduce((a, x) => a + (scores[x.id] ?? 1), 0) / s.length;
}

/** Article-style rating: each slice contributes its level (1..3); total / 12. */
export function overall(scores: Scores) {
  const total = SLICES.reduce((a, s) => a + levelOf(scores[s.id] ?? 1), 0);
  const avg = SLICES.reduce((a, s) => a + (scores[s.id] ?? 1), 0) / SLICES.length;
  return { total, level: Math.floor(total / 12), notation: notation(avg), avg };
}

export function archetype(scores: Scores, q: QuadrantId): string {
  const quad = QUADRANTS.find((x) => x.id === q)!;
  return quad.archetypes[levelOf(quadrantAverage(scores, q)) - 1];
}
