"use client";
import SettingsForm, { BLANK } from "./SettingsForm";

export default function Setup({ onDone }: { onDone: () => void }) {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="wordmark" style={{ fontSize: 40, marginBottom: 8 }}>HUMAN 3.0</div>
      <p className="muted" style={{ marginTop: 0 }}>
        Two minutes of setup. You start at the bottom in every quadrant, and that's fine: the point is to watch the shape grow.
      </p>
      <div className="card">
        <SettingsForm initial={BLANK} submitLabel="Start" onSaved={onDone} />
      </div>
    </div>
  );
}
