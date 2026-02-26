"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  enabled: boolean;
  timeoutMinutes?: number;
  onPause: () => Promise<void> | void;
};

export function InactivityWatcher({ enabled, timeoutMinutes = 10, onPause }: Props) {
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const timeoutMs = useMemo(() => timeoutMinutes * 60 * 1000, [timeoutMinutes]);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }

    const onActivity = () => setLastActivityAt(Date.now());
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "click"];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity));

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= timeoutMs) {
        setOpen(true);
      }
    }, 1000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.clearInterval(interval);
    };
  }, [enabled, lastActivityAt, timeoutMs]);

  if (!enabled || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-woora-primary/30 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Toujours en train de travailler ?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Aucune activité détectée depuis {timeoutMinutes} minutes. Continuer ou mettre le minuteur en pause.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              setLastActivityAt(Date.now());
              setOpen(false);
            }}
            className="rounded-md bg-woora-light px-3 py-2 text-sm"
          >
            Continuer
          </button>
          <button
            onClick={async () => {
              await onPause();
              setOpen(false);
              setLastActivityAt(Date.now());
            }}
            className="rounded-md bg-woora-primary px-3 py-2 text-sm text-white"
          >
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}
