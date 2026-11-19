"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Radar from "@/components/Radar";
import { post, useDashboard, type Loaded } from "@/components/useDashboard";
import { QUADRANTS, SLICES, PHASES, notation, overall, levelOf, phaseOf, type Scores } from "@/lib/framework";

const STEP_COLORS = ["#f6b7b7", "#ef8b8b", "#e64848", "#b5d0fb", "#7aaaf3", "#3f86ef", "#c5f7b3", "#8eec6d", "#5ee33a"];

export default function Review() {
  const { state } = useDashboard();
  const router = useRouter();
  const [scores, setScores] = useState<Scores | null>(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state && "scores" in state && !scores) setScores({ ...state.scores });
  }, [state, scores]);

  if (!state || !scores) return <div className="wrap muted">Loading…</div>;
  if (!("today" in state)) { router.push("/"); return null; }
  const st = state as Loaded;
  const o = overall(scores);
  const before = st.scores;

  return (
    <div className="wrap">
      <Nav />
      <div className="grid">
        <div className="stack">
          <div className="card">
            <h2>Weekly review</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              Score each slice honestly. Each band is a level (red 1.0, blue 2.0, green 3.0), and each level has three phases:
              {" "}{PHASES.join(", ")}. Move a slice only when your behavior changed, not your intentions.
            </p>
            {QUADRANTS.map((q) => (
              <div key={q.id} style={{ marginTop: 14 }}>
                <div className="row between">
                  <h3 style={{ fontSize: 18, fontWeight: 900 }}>{q.name}</h3>
                  <span className="sub">{q.subtitle}</span>
                </div>
                {SLICES.filter((s) => s.quadrant === q.id).map((s) => {
                  const v = scores[s.id] ?? 1;
                  const changed = v !== (before[s.id] ?? 1);
                  return (
                    <div key={s.id} className="slice-row">
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div className="steps">
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={n === v ? "sel" : ""}
                            style={{ background: n <= v ? STEP_COLORS[n - 1] : "#efefec" }}
                            title={`${notation(n)} · Level ${levelOf(n)}, ${PHASES[phaseOf(n) - 1]}`}
                            onClick={() => setScores({ ...scores, [s.id]: n })}
                          >
                            {notation(n)}
                          </button>
                        ))}
                      </div>
                      <div className="score-tag" style={{ color: changed ? "var(--blue)" : undefined }}>{notation(v)}</div>
                      <div className="q">{s.question}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card radar-card">
            <div className="row between">
              <h2>Your shape</h2>
              <span className="sub">{o.total}/12 · Human {o.level}.0 · avg {o.notation}</span>
            </div>
            <div className="radar-center"><Radar scores={scores} previous={before} size={460} /></div>
            <div className="sub" style={{ textAlign: "center" }}>Dashed line is where you were.</div>
          </div>

          <div className="card stack" style={{ gap: 12 }}>
            <h2>Talk it through</h2>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything about this week the numbers don't show? (optional)" />
            <div className="row">
              <button
                className="btn ghost"
                disabled={asking}
                onClick={async () => {
                  setAsking(true);
                  const d = await post("/api/review/ask", { scores, note });
                  setFeedback(d.reply ?? "");
                  setAsking(false);
                }}
              >
                {asking ? "Reviewing…" : "Get the coach's honest take"}
              </button>
            </div>
            {feedback && <div className="msg assistant" style={{ maxWidth: "100%" }}>{feedback}</div>}
            <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <button
                className="btn"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await post("/api/review", { scores, summary: [note, feedback].filter(Boolean).join("\n\n") });
                  router.push("/");
                }}
              >
                {saving ? "Saving…" : st.reviewedThisWeek ? "Update this week's scores" : "Save this week's scores"}
              </button>
            </div>
          </div>

          {st.reviews.length > 1 && (
            <div className="card">
              <h2 style={{ marginBottom: 10 }}>History</h2>
              <div className="history">
                {st.reviews.slice().reverse().map((r) => (
                  <div key={r.week} className="h">
                    <Radar scores={r.scores} size={120} labels={false} />
                    Week of {r.week}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
