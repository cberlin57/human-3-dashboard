"use client";
import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: "18vh" }}>
      <div className="wordmark" style={{ fontSize: 40, marginBottom: 16 }}>HUMAN 3.0</div>
      <form
        className="card stack"
        style={{ gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }) });
          if (r.ok) location.href = "/";
          else setErr("That's not it.");
        }}
      >
        <input className="input" type="password" autoFocus placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} />
        {err && <div className="small" style={{ color: "var(--red)" }}>{err}</div>}
        <button className="btn">Open</button>
      </form>
    </div>
  );
}
