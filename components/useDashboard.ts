"use client";
import { useCallback, useEffect, useState } from "react";
import type { DashboardState } from "@/lib/data";

export type Loaded = Extract<DashboardState, { today: string }>;

export function useDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.status === 401) { location.href = "/login"; return; }
    setState(await r.json());
  }, []);
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(refresh, 5 * 60 * 1000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(t); };
  }, [refresh]);
  return { state, refresh, setState };
}

export async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
