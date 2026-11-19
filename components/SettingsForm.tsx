"use client";
import { useState } from "react";
import type { Settings } from "@/lib/data";
import { post } from "./useDashboard";

type Form = Omit<Settings, "startDate">;

export const BLANK: Form = {
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York",
  why: "",
  baseline: { drinksPerWeek: 21, nicotinePerDay: 20 },
  taperPct: 10,
  gymPerWeek: 2,
  pagesPerDay: 10,
  reminders: { morning: "08:00", midday: "13:00", evening: "21:00" },
  email: true,
};

export default function SettingsForm({ initial, submitLabel, onSaved }: { initial: Form; submitLabel: string; onSaved: () => void }) {
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <form
      className="stack"
      style={{ gap: 16 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await post("/api/settings", f);
        setBusy(false);
        onSaved();
      }}
    >
      <label className="f">
        Why are you doing this?
        <span className="hint">One or two sentences, in your own words. The app shows it back to you on hard days.</span>
        <textarea className="input" rows={2} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="I know I have a lot of potential and I'm done wasting it." />
      </label>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="f">
          Drinks in a normal week right now
          <span className="hint">Be honest. The taper starts from here.</span>
          <input className="input" type="number" min={0} value={f.baseline.drinksPerWeek} onChange={(e) => setF({ ...f, baseline: { ...f.baseline, drinksPerWeek: num(e.target.value) } })} />
        </label>
        <label className="f">
          Vape sessions or cigarettes per day
          <span className="hint">Count each sit-down session or cigarette as one.</span>
          <input className="input" type="number" min={0} value={f.baseline.nicotinePerDay} onChange={(e) => setF({ ...f, baseline: { ...f.baseline, nicotinePerDay: num(e.target.value) } })} />
        </label>
        <label className="f">
          Taper speed
          <span className="hint">How much of your starting amount comes off each week you stay in budget.</span>
          <select className="input" value={f.taperPct} onChange={(e) => setF({ ...f, taperPct: Number(e.target.value) })}>
            <option value={5}>Gentle (5% per week, about 20 weeks)</option>
            <option value={10}>Steady (10% per week, about 10 weeks)</option>
            <option value={15}>Faster (15% per week, about 7 weeks)</option>
          </select>
        </label>
        <label className="f">
          Gym sessions per week
          <span className="hint">Start low. Raise it once it feels easy.</span>
          <input className="input" type="number" min={0} max={7} value={f.gymPerWeek} onChange={(e) => setF({ ...f, gymPerWeek: num(e.target.value) })} />
        </label>
        <label className="f">
          Pages per day
          <input className="input" type="number" min={0} value={f.pagesPerDay} onChange={(e) => setF({ ...f, pagesPerDay: num(e.target.value) })} />
        </label>
        <label className="f">
          Time zone
          <input className="input" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} />
        </label>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Reminder times</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {(["morning", "midday", "evening"] as const).map((k) => (
            <label key={k} className="f" style={{ flex: 1, minWidth: 140 }}>
              <span className="hint" style={{ textTransform: "capitalize" }}>{k}</span>
              <input className="input" type="time" value={f.reminders[k]} onChange={(e) => setF({ ...f, reminders: { ...f.reminders, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        <label className="row small" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={f.email} onChange={(e) => setF({ ...f, email: e.target.checked })} /> Also email me the morning reminder
        </label>
      </div>

      <div>
        <button className="btn" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
