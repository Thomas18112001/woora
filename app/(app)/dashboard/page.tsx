"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Range = "today" | "week" | "month";

type DashboardResponse = {
  totals: {
    seconds: number;
    hours: number;
    revenuEuros: number;
    moyenneSessionSecondes: number;
    tachesTerminees: number;
    projetsActifs: number;
  };
  projectBreakdown: Array<{ projectId: string; projectName: string; seconds: number; montantEuros: number }>;
  taskBreakdown: Array<{ taskId: string; taskTitle: string; projectName: string; seconds: number }>;
  graphByDay: Array<{ date: string; seconds: number }>;
  weeklySummary: { totalHeures: number; revenus: number };
  timeline: Array<{
    id: string;
    date: string;
    projet: string;
    tache: string | null;
    dureeSecondes: number;
    note: string | null;
  }>;
};

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function toHours(seconds: number) {
  return (seconds / 3600).toFixed(2);
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("week");
  const [rangeReady, setRangeReady] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedRange = localStorage.getItem("woora-dashboard-range");
    if (savedRange === "today" || savedRange === "week" || savedRange === "month") {
      setRange(savedRange);
    }
    setRangeReady(true);
  }, []);

  useEffect(() => {
    if (!rangeReady) return;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/dashboard?range=${range}`, { cache: "no-store" });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? "Impossible de charger les données du tableau de bord");
        }
        setData((await res.json()) as DashboardResponse);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Impossible de charger les données du tableau de bord");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [range, rangeReady]);

  const maxDaySeconds = useMemo(() => {
    const values = data?.graphByDay.map((d) => d.seconds) ?? [];
    return Math.max(1, ...values);
  }, [data]);

  const exportCsvUrl = `/api/dashboard/export?range=${range}`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tableau de bord</h1>
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                localStorage.setItem("woora-dashboard-range", r);
              }}
              className={`btn-base text-sm ${range === r ? "btn-primary" : "btn-soft"}`}
            >
              {r === "today" ? "Aujourd'hui" : r === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
          <a href={exportCsvUrl} className="btn-base btn-soft text-sm">
            Export CSV
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700 shadow-sm dark:border-red-700 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Temps total"
          loading={loading}
          value={<AnimatedNumber value={data?.totals.hours ?? 0} suffix=" h" decimals={2} />}
        />
        <StatCard title="Revenus" loading={loading} value={<AnimatedCurrency value={data?.totals.revenuEuros ?? 0} />} />
        <StatCard
          title="Tâches terminées"
          loading={loading}
          value={<AnimatedNumber value={data?.totals.tachesTerminees ?? 0} decimals={0} />}
        />
        <StatCard title="Projets actifs" loading={loading} value={<AnimatedNumber value={data?.totals.projetsActifs ?? 0} decimals={0} />} />
      </div>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Productivité</h2>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Session moyenne: <strong>{toHours(data?.totals.moyenneSessionSecondes ?? 0)} h</strong>
          </p>
          <p>
            Résumé hebdo: <strong>{(data?.weeklySummary.totalHeures ?? 0).toFixed(2)} h</strong> /{" "}
            <strong>{euro.format(data?.weeklySummary.revenus ?? 0)}</strong>
          </p>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Temps par jour</h2>
        <div className="grid gap-2">
          {(data?.graphByDay ?? []).map((point) => (
            <div key={point.date} className="grid grid-cols-[90px_1fr_auto] items-center gap-2 text-xs sm:grid-cols-[120px_1fr_auto] sm:gap-3 sm:text-sm">
              <span>{new Date(point.date).toLocaleDateString("fr-FR")}</span>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-woora-primary to-woora-accent transition-all duration-500"
                  style={{ width: `${Math.max(3, (point.seconds / maxDaySeconds) * 100)}%` }}
                />
              </div>
              <span>{toHours(point.seconds)} h</span>
            </div>
          ))}
          {(data?.graphByDay.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Aucune donnée.</p> : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Par projet</h2>
          <div className="space-y-2">
            {(data?.projectBreakdown ?? []).map((item) => (
              <div key={item.projectId} className="surface-soft interactive-row flex justify-between p-3 text-sm">
                <span>{item.projectName}</span>
                <span>
                  {toHours(item.seconds)} h | {euro.format(item.montantEuros)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Timeline d&apos;activité</h2>
          <div className="space-y-2">
            {(data?.timeline ?? []).map((entry) => (
              <div key={entry.id} className="surface-soft interactive-row p-3 text-sm">
                <p className="font-medium">{entry.projet}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {entry.tache ? `${entry.tache} • ` : ""}
                  {new Date(entry.date).toLocaleString("fr-FR")} • {toHours(entry.dureeSecondes)} h
                </p>
                {entry.note ? <p className="mt-1 text-slate-500 dark:text-slate-400">{entry.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading }: { title: string; value: ReactNode; loading: boolean }) {
  return (
    <div className="surface-card p-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-bold sm:text-[1.9rem]">{loading ? "..." : value}</p>
    </div>
  );
}

function AnimatedCurrency({ value }: { value: number }) {
  const animated = useAnimatedValue(value, 2);
  return <span className="animated-number">{euro.format(animated)}</span>;
}

function AnimatedNumber({ value, decimals, suffix = "" }: { value: number; decimals: number; suffix?: string }) {
  const animated = useAnimatedValue(value, decimals);
  return (
    <span className="animated-number">
      {animated.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function useAnimatedValue(target: number, decimals: number) {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    currentRef.current = display;
  }, [display]);

  useEffect(() => {
    const start = performance.now();
    const origin = currentRef.current;
    const duration = 520;
    let frameId = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = origin + (target - origin) * eased;
      setDisplay(Number(next.toFixed(decimals)));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, decimals]);

  return display;
}
