"use client";
import { useEffect, useRef, useState } from "react";
import { post } from "./useDashboard";

type Kind = "morning" | "checkin" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

export default function Coach({ initial, onChange }: { initial: Kind; onChange?: () => void }) {
  const [kind, setKind] = useState<Kind>(initial);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKind(initial);
  }, [initial]);
  useEffect(() => {
    let live = true;
    fetch(`/api/coach?kind=${kind}`)
      .then((r) => r.json())
      .then((d) => { if (live) setMsgs(d.messages ?? []); });
    return () => { live = false; };
  }, [kind]);
  useEffect(() => {
    const box = end.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [msgs, busy]);

  async function send(message?: string) {
    setBusy(true);
    if (message) setMsgs((m) => [...m, { role: "user", content: message }]);
    setText("");
    try {
      const d = await post("/api/coach", { kind, message });
      setMsgs(d.messages ?? []);
      onChange?.();
    } finally {
      setBusy(false);
    }
  }

  const shown = msgs.filter((m, i) => !(i === 0 && m.role === "user" && msgs.length > 1 && (m.content.startsWith("Good morning.") || m.content === "Let's check in.")));
  const labels: Record<Kind, string> = { morning: "Morning", checkin: "Evening check-in", chat: "Ask" };
  const starters: Record<Kind, string> = { morning: "Plan my day", checkin: "Start check-in", chat: "" };

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2>Coach</h2>
        <span className="sub">Two minutes, not twenty</span>
      </div>
      <div className="tabs">
        {(Object.keys(labels) as Kind[]).map((k) => (
          <button key={k} className={k === kind ? "on" : ""} onClick={() => setKind(k)}>{labels[k]}</button>
        ))}
      </div>
      <div className="chat">
        {shown.length === 0 && !busy && (
          <div className="muted small" style={{ padding: "8px 2px" }}>
            {kind === "morning" && "Pick one focus for today and see your budgets."}
            {kind === "checkin" && "Close the day: what went right, what got in the way, and tomorrow's one intention."}
            {kind === "chat" && "Craving a drink? Skipping the gym? Talk it through here."}
          </div>
        )}
        {shown.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>{m.content}</div>
        ))}
        {busy && <div className="msg assistant muted">Thinking…</div>}
        <div ref={end} />
      </div>
      {shown.length === 0 && starters[kind] ? (
        <button className="btn" disabled={busy} onClick={() => send()}>{starters[kind]}</button>
      ) : (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(text.trim()); }}>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" disabled={busy} />
          <button className="btn" disabled={busy || !text.trim()}>Send</button>
        </form>
      )}
    </div>
  );
}
