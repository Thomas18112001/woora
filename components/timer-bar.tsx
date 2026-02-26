"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InactivityWatcher } from "@/components/inactivity-watcher";

type ActiveTimer = {
  id: string;
  startAt: string;
  project: { id: string; name: string };
  task: { id: string; title: string } | null;
};

type PausedTimer = {
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  elapsedSeconds: number;
  pausedAt: string;
};

type TimerCarry = {
  projectId: string;
  taskId: string | null;
  seconds: number;
};

function formatSeconds(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const PAUSED_KEY = "woora-paused-timer";
const CARRY_KEY = "woora-active-timer-carry";

export function TimerBar() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [paused, setPaused] = useState<PausedTimer | null>(null);
  const [carry, setCarry] = useState<TimerCarry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const carryRef = useRef<TimerCarry | null>(null);
  const pausedRef = useRef<PausedTimer | null>(null);

  useEffect(() => {
    carryRef.current = carry;
  }, [carry]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const persistPaused = useCallback((value: PausedTimer | null) => {
    setPaused(value);
    if (value) {
      localStorage.setItem(PAUSED_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(PAUSED_KEY);
    }
  }, []);

  const persistCarry = useCallback((value: TimerCarry | null) => {
    setCarry(value);
    if (value) {
      localStorage.setItem(CARRY_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(CARRY_KEY);
    }
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const res = await fetch("/api/timer/active", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as ActiveTimer | null;
      setActive(json);
      if (json) {
        persistPaused(null);
        const activeTaskId = json.task?.id ?? null;
        const lastCarry = carryRef.current;
        if (lastCarry && (lastCarry.projectId !== json.project.id || lastCarry.taskId !== activeTaskId)) {
          persistCarry(null);
        }
      } else if (!pausedRef.current) {
        persistCarry(null);
      }
    } catch {
      // Ignore polling network glitches.
    }
  }, [persistCarry, persistPaused]);

  useEffect(() => {
    const saved = localStorage.getItem(PAUSED_KEY);
    if (saved) {
      try {
        setPaused(JSON.parse(saved) as PausedTimer);
      } catch {
        localStorage.removeItem(PAUSED_KEY);
      }
    }
    const savedCarry = localStorage.getItem(CARRY_KEY);
    if (savedCarry) {
      try {
        setCarry(JSON.parse(savedCarry) as TimerCarry);
      } catch {
        localStorage.removeItem(CARRY_KEY);
      }
    }

    void loadActive();

    const onTimerSync = () => void loadActive();
    window.addEventListener("woora:timer-sync", onTimerSync);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadActive();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.removeEventListener("woora:timer-sync", onTimerSync);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadActive]);

  useEffect(() => {
    if (!active) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const sync = window.setInterval(() => {
      void loadActive();
    }, 60000);
    return () => window.clearInterval(sync);
  }, [active, loadActive]);

  const liveElapsed = useMemo(() => {
    if (!active) return 0;
    return Math.max(0, Math.floor((now - new Date(active.startAt).getTime()) / 1000));
  }, [active, now]);

  const displayElapsed = useMemo(() => {
    if (active) {
      const activeTaskId = active.task?.id ?? null;
      const carrySeconds = carry && carry.projectId === active.project.id && carry.taskId === activeTaskId ? carry.seconds : 0;
      return carrySeconds + liveElapsed;
    }
    return paused?.elapsedSeconds ?? 0;
  }, [active, carry, liveElapsed, paused]);

  async function pauseTimer() {
    if (!active) return;
    setError("");
    try {
      const res = await fetch("/api/timer/stop", { method: "POST" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Impossible de mettre le minuteur en pause");
        return;
      }

      const totalElapsed = displayElapsed;
      persistPaused({
        projectId: active.project.id,
        projectName: active.project.name,
        taskId: active.task?.id ?? null,
        taskTitle: active.task?.title ?? null,
        elapsedSeconds: totalElapsed,
        pausedAt: new Date().toISOString()
      });
      persistCarry({
        projectId: active.project.id,
        taskId: active.task?.id ?? null,
        seconds: totalElapsed
      });
      setActive(null);
      window.dispatchEvent(new Event("woora:timer-sync"));
    } catch {
      setError("Connexion au serveur impossible. Réessayez.");
    }
  }

  async function stopTimer() {
    setError("");
    try {
      if (active) {
        const res = await fetch("/api/timer/stop", { method: "POST" });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? "Impossible de stopper le minuteur");
          return;
        }
      }
      setActive(null);
      persistPaused(null);
      persistCarry(null);
      window.dispatchEvent(new Event("woora:timer-sync"));
    } catch {
      setError("Connexion au serveur impossible. Réessayez.");
    }
  }

  async function resumePausedTimer() {
    if (!paused) return;
    setError("");
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: paused.projectId, taskId: paused.taskId })
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Impossible de reprendre le minuteur");
        return;
      }

      persistCarry({
        projectId: paused.projectId,
        taskId: paused.taskId,
        seconds: paused.elapsedSeconds
      });
      persistPaused(null);
      window.dispatchEvent(new Event("woora:timer-sync"));
      await loadActive();
    } catch {
      setError("Connexion au serveur impossible. Réessayez.");
    }
  }

  if (!active && !paused) return null;

  return (
    <>
      <InactivityWatcher enabled={Boolean(active)} timeoutMinutes={10} onPause={pauseTimer} />
      <div className="fixed bottom-[64px] left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_32px_-18px_rgba(13,42,66,0.55)] backdrop-blur md:bottom-0 dark:border-slate-700/85 dark:bg-slate-900/92">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-woora-accent">
              {active ? "Minuteur en cours" : "Minuteur en pause"}
            </p>
            <p className="text-base font-bold">
              {(active?.project.name ?? paused?.projectName) || "Projet"}
              {(active?.task?.title ?? paused?.taskTitle) ? ` / ${active?.task?.title ?? paused?.taskTitle}` : ""}
            </p>
            {paused ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Pause à {new Date(paused.pausedAt).toLocaleTimeString("fr-FR")}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">
            <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-lg font-bold dark:border-slate-700 dark:bg-slate-800">
              {formatSeconds(displayElapsed)}
            </span>
            {active ? (
              <button onClick={pauseTimer} className="btn-base btn-soft">
                Pause
              </button>
            ) : (
              <button onClick={resumePausedTimer} className="btn-base btn-secondary">
                Reprendre
              </button>
            )}
            <button onClick={stopTimer} className="btn-base btn-primary">
              Arrêt
            </button>
          </div>
        </div>
        {error ? <p className="px-4 pb-3 text-sm font-medium text-red-500">{error}</p> : null}
      </div>
    </>
  );
}
