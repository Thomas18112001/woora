"use client";

import { useEffect, useState } from "react";

type StatsResponse = {
  totals: { hours: number; revenuEuros: number; tachesTerminees: number; projetsActifs: number };
  projectBreakdown: Array<{ projectId: string; projectName: string; seconds: number; montantEuros: number }>;
};

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/dashboard?range=month", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Impossible de charger les statistiques");
        return;
      }
      setData((await res.json()) as StatsResponse);
    }
    void load();
  }, []);

  return (
    <div className="space-y-4 fade-in">
      <h1 className="text-2xl font-bold">Statistiques</h1>
      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50/95 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Heures (mois)" value={`${(data?.totals.hours ?? 0).toFixed(2)} h`} />
        <Card title="Revenus" value={euro.format(data?.totals.revenuEuros ?? 0)} />
        <Card title="Tâches terminées" value={String(data?.totals.tachesTerminees ?? 0)} />
        <Card title="Projets actifs" value={String(data?.totals.projetsActifs ?? 0)} />
      </div>

      <section className="surface-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Top projets</h2>
        <div className="space-y-2">
          {(data?.projectBreakdown ?? []).map((item) => (
            <div key={item.projectId} className="surface-soft interactive-row flex justify-between p-3 text-sm">
              <span>{item.projectName}</span>
              <span>{(item.seconds / 3600).toFixed(2)} h • {euro.format(item.montantEuros)}</span>
            </div>
          ))}
          {(data?.projectBreakdown.length ?? 0) === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Aucune donnée disponible.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
