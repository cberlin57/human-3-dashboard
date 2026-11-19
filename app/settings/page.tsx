"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import SettingsForm, { BLANK } from "@/components/SettingsForm";
import { post, useDashboard } from "@/components/useDashboard";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function SettingsPage() {
  const { state, refresh } = useDashboard();
  const [saved, setSaved] = useState(false);
  const [push, setPush] = useState<string>("");

  useEffect(() => {
    if (!("Notification" in window)) setPush("unsupported");
    else setPush(Notification.permission);
  }, []);

  async function enablePush() {
    const { publicKey: key } = await fetch("/api/push/subscribe").then((r) => r.json());
    if (!key) { setPush("not-configured"); return; }
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    setPush(perm);
    if (perm !== "granted") return;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    await post("/api/push/subscribe", sub.toJSON());
    setPush("subscribed");
  }

  if (!state) return <div className="wrap muted">Loading…</div>;
  const s = state.settings;
  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <Nav />
      <div className="stack">
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2>Reminders on this laptop</h2>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Turn on notifications so the app comes to you at your reminder times, even when the tab is closed.
          </p>
          {push === "subscribed" || push === "granted" ? (
            <div className="row"><span className="toggle on">On</span><button className="btn ghost sm" onClick={enablePush}>Re-register this browser</button></div>
          ) : push === "denied" ? (
            <div className="small">Notifications are blocked for this site. Allow them in your browser's site settings, then reload.</div>
          ) : push === "not-configured" ? (
            <div className="small">The server couldn't set up notification keys. Check that the database is connected.</div>
          ) : push === "unsupported" ? (
            <div className="small">This browser doesn't support notifications.</div>
          ) : (
            <button className="btn" onClick={enablePush}>Turn on notifications</button>
          )}
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Plan</h2>
          {s && (
            <SettingsForm
              initial={{ ...BLANK, ...s }}
              submitLabel={saved ? "Saved" : "Save"}
              onSaved={() => { setSaved(true); refresh(); setTimeout(() => setSaved(false), 1500); }}
            />
          )}
          {s && <p className="muted small">Started {s.startDate}. Changing your starting amounts recalculates every weekly budget.</p>}
        </div>
      </div>
    </div>
  );
}
