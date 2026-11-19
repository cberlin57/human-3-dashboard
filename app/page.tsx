"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Radar from "@/components/Radar";
import Coach from "@/components/Coach";
import Setup from "@/components/Setup";
import { post, useDashboard, type Loaded } from "@/components/useDashboard";
import { QUADRANTS, LEVELS, archetype, notation, overall, quadrantAverage, type QuadrantId } from "@/lib/framework";

export default function Today() {
  const { state, refresh, setState } = useDashboard();
  if (!state) return <div className="wrap muted">Loading…</div>;
  if (!state.settings || !("today" in state)) return <Setup onDone={refresh} />;
  return <Dashboard s={state} refresh={refresh} patchDay={(day) => setState({ ...state, day })} />;
}

function Dashboard({ s, refresh, patchDay }: { s: Loaded; refresh: () => void; patchDay: (d: Loaded["day"]) => void }) {
  const o = overall(s.scores);
  const hour = Number(s.now.slice(0, 2));
  const coachKind = hour < 12 && !s.day.focus ? "morning" : hour >= 18 ? "checkin" : "chat";

  async function log(action: string, extra: Record<string, unknown> = {}) {
    const d = await post("/api/log", { action, ...extra });
    if (d.day) patchDay(d.day);
    refresh();
  }

  const dateLabel = new Date(s.today + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="wrap">
      <Nav right={<div className="muted small">{dateLabel}</div>} />

      <div className="grid">
        <div className="stack">
          <RadarCard s={s} level={o.level} total={o.total} avg={o.notation} />
          <WeekCard s={s} />
        </div>

        <div className="stack">
          {s.missedYesterday && (
            <div className="banner warn">
              <span>Yesterday was off. Never miss twice: today is the one that counts.</span>
            </div>
          )}
          {s.reviewDue && (
            <div className="banner info">
              <span>Your weekly review is ready. This is where the radar moves.</span>
              <Link href="/review" className="btn sm">Start</Link>
            </div>
          )}
          <TodayCard s={s} log={log} />
          <Coach initial={coachKind} onChange={refresh} />
        </div>
      </div>
    </div>
  );
}

function RadarCard({ s, level, total, avg }: { s: Loaded; level: number; total: number; avg: string }) {
  const q = (id: QuadrantId, right = false) => {
    const quad = QUADRANTS.find((x) => x.id === id)!;
    return (
      <div className={`quad ${right ? "r" : ""}`}>
        <h3>{quad.name}</h3>
        <div className="arch">
          {archetype(s.scores, id)} · <span className="lvl">{quad.name} {notation(quadrantAverage(s.scores, id))}</span>
        </div>
      </div>
    );
  };
  return (
    <div className="card radar-card">
      <div className="quad-grid">
        {q("mind")}
        {q("body", true)}
      </div>
      <div className="radar-center">
        <Radar scores={s.scores} previous={s.previousScores} />
      </div>
      <div className="quad-grid">
        {q("spirit")}
        {q("vocation", true)}
      </div>
      <div className="legend">
        {LEVELS.map((l, i) => (
          <span key={l.name}>
            <i className="dot" style={{ background: ["var(--red)", "var(--blue)", "var(--green)"][i] }} />
            {l.name} {l.title}
          </span>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{LEVELS[level - 1].name}</div>
          <div className="sub">{total} / 12 · average {avg}{s.previousScores ? " · dashed line is last review" : ""}</div>
        </div>
        <Link href="/review" className="btn ghost sm">{s.reviews.length ? "Re-score" : "Score yourself"}</Link>
      </div>
    </div>
  );
}

function Stepper({ n, onMinus, onPlus }: { n: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="stepper">
      <button className="round" onClick={onMinus} aria-label="minus" disabled={n <= 0}>−</button>
      <span className="n">{n}</span>
      <button className="round plus" onClick={onPlus} aria-label="plus">+</button>
    </div>
  );
}

function budgetColor(used: number, budget: number) {
  if (used > budget) return "var(--red)";
  if (used >= budget * 0.8) return "var(--amber)";
  return "var(--green)";
}

function TodayCard({ s, log }: { s: Loaded; log: (a: string, e?: Record<string, unknown>) => void }) {
  const [focus, setFocus] = useState(s.day.focus);
  useEffect(() => setFocus(s.day.focus), [s.day.focus]);
  const w = s.week;
  const drinksLeft = w.drinks.budget - w.drinks.used;
  const nicLeft = w.nicotine.budget - w.nicotine.used;
  const pct = (a: number, b: number) => `${Math.min(100, b ? (a / b) * 100 : a ? 100 : 0)}%`;

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2>Today</h2>
        <span className="sub">One tap each</span>
      </div>

      <form className="row" style={{ marginBottom: 6 }} onSubmit={(e) => { e.preventDefault(); log("focus", { value: focus }); }}>
        {s.day.focus ? (
          <>
            <button type="button" className={`toggle ${s.day.focusDone ? "on" : ""}`} onClick={() => log("focusDone", { value: !s.day.focusDone })}>
              {s.day.focusDone ? "Done" : "Mark done"}
            </button>
            <div style={{ flex: 1, fontWeight: 700, textDecoration: s.day.focusDone ? "line-through" : undefined }}>{s.day.focus}</div>
            <button type="button" className="btn ghost sm" onClick={() => log("focus", { value: "" })}>Change</button>
          </>
        ) : (
          <>
            <input className="input" placeholder="Today's one focus…" value={focus} onChange={(e) => setFocus(e.target.value)} />
            <button className="btn" disabled={!focus.trim()}>Set</button>
          </>
        )}
      </form>

      <div className="counter">
        <div>
          <div className="name">Drinks</div>
          <div className="meta">
            {drinksLeft >= 0 ? `${drinksLeft} left this week` : `${-drinksLeft} over this week's budget`} · budget {w.drinks.budget}/week
          </div>
        </div>
        <Stepper n={s.day.drinks} onMinus={() => log("drinks", { delta: -1 })} onPlus={() => log("drinks", { delta: 1 })} />
        <div className="bar"><i style={{ width: pct(w.drinks.used, w.drinks.budget), background: budgetColor(w.drinks.used, w.drinks.budget) }} /></div>
      </div>

      <div className="counter">
        <div>
          <div className="name">Vape / cigarettes</div>
          <div className="meta">
            {nicLeft >= 0 ? `${nicLeft} left this week` : `${-nicLeft} over this week's budget`} · budget {w.nicotine.budget}/week
          </div>
        </div>
        <Stepper n={s.day.nicotine} onMinus={() => log("nicotine", { delta: -1 })} onPlus={() => log("nicotine", { delta: 1 })} />
        <div className="bar"><i style={{ width: pct(w.nicotine.used, w.nicotine.budget), background: budgetColor(w.nicotine.used, w.nicotine.budget) }} /></div>
      </div>

      <div className="counter">
        <div>
          <div className="name">Gym</div>
          <div className="meta">{w.gym.done} of {w.gym.target} sessions this week</div>
        </div>
        <button className={`toggle ${s.day.gym ? "on" : ""}`} onClick={() => log("gym", { value: !s.day.gym })}>
          {s.day.gym ? "Trained" : "Log session"}
        </button>
        <div className="bar"><i style={{ width: pct(w.gym.done, w.gym.target), background: "var(--blue)" }} /></div>
      </div>

      <div className="counter">
        <div>
          <div className="name">Reading</div>
          <div className="meta">{s.day.pages} pages today · goal {s.settings.pagesPerDay}/day</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {s.day.pages > 0 && <button className="btn ghost sm" onClick={() => log("pages", { delta: -5 })}>−5</button>}
          <button className="btn ghost sm" onClick={() => log("pages", { delta: 5 })}>+5</button>
          <button className="btn sm" onClick={() => log("pages", { delta: 10 })}>+10</button>
        </div>
        <div className="bar"><i style={{ width: pct(s.day.pages, s.settings.pagesPerDay), background: "var(--blue)" }} /></div>
      </div>

      <div className="counter">
        <div>
          <div className="name">How do you feel?</div>
          <div className="meta">Optional. Helps the coach spot patterns.</div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((m) => (
            <button key={m} className={`toggle ${s.day.mood === m ? "on" : ""}`} style={{ padding: "6px 10px" }} onClick={() => log("mood", { value: m })}>{m}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekCard({ s }: { s: Loaded }) {
  const days = s.last14.slice(7);
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const showed = (d: Loaded["day"]) => d.log.length > 0 || d.checkedIn || !!d.focus;
  return (
    <div className="card">
      <div className="row between">
        <div>
          <h2>Consistency</h2>
          <div className="sub">Showed up {s.consistency} of the last 7 days. No streaks to break.</div>
        </div>
        <div className="week-dots">
          {days.map((d) => {
            const dow = (new Date(d.date + "T12:00:00").getDay() + 6) % 7;
            return (
              <span key={d.date} className={`${showed(d) ? "on" : ""} ${d.date === s.today ? "today" : ""}`} title={d.date}>
                {letters[dow]}
              </span>
            );
          })}
        </div>
      </div>
      {s.settings.why && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div className="sub">Your why</div>
          <div style={{ fontWeight: 600 }}>{s.settings.why}</div>
        </div>
      )}
    </div>
  );
}
