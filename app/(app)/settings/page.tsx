"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type Theme = "light" | "dark";
type Range = "today" | "week" | "month";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyReducedMotion(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduced-motion", enabled);
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dashboardRange, setDashboardRange] = useState<Range>("week");
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("woora-theme");
    const initialTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const savedRange = localStorage.getItem("woora-dashboard-range");
    if (savedRange === "today" || savedRange === "week" || savedRange === "month") {
      setDashboardRange(savedRange);
    }

    const savedMotion = localStorage.getItem("woora-reduced-motion") === "1";
    setReducedMotion(savedMotion);
    applyReducedMotion(savedMotion);

    const savedNotifications = localStorage.getItem("woora-desktop-notifications") === "1";
    setDesktopNotifications(savedNotifications);

    void loadUserEmail();
  }, []);

  const nextThemeLabel = useMemo(() => (theme === "light" ? "Mode sombre" : "Mode clair"), [theme]);

  async function loadUserEmail() {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { user?: { email?: string | null } };
    setEmail(data.user?.email ?? "");
  }

  async function updateTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("woora-theme", next);
    applyTheme(next);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next, locale: "fr-FR", currency: "EUR" })
    });

    setMessage(res.ok ? "Préférences enregistrées." : "Échec d'enregistrement des préférences.");
  }

  function updateRange(next: Range) {
    setDashboardRange(next);
    localStorage.setItem("woora-dashboard-range", next);
    setMessage("Plage par défaut du tableau de bord enregistrée.");
  }

  function updateReducedMotion(next: boolean) {
    setReducedMotion(next);
    localStorage.setItem("woora-reduced-motion", next ? "1" : "0");
    applyReducedMotion(next);
    setMessage(next ? "Animations réduites activées." : "Animations réduites désactivées.");
  }

  async function updateNotifications(next: boolean) {
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDesktopNotifications(false);
        localStorage.setItem("woora-desktop-notifications", "0");
        setMessage("Autorisation des notifications refusée.");
        return;
      }
    }

    setDesktopNotifications(next);
    localStorage.setItem("woora-desktop-notifications", next ? "1" : "0");
    setMessage(next ? "Notifications bureau activées." : "Notifications bureau désactivées.");
  }

  return (
    <div className="space-y-5 fade-in">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Apparence</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={() => void updateTheme(theme === "light" ? "dark" : "light")} className="btn-base btn-primary">
            {nextThemeLabel}
          </button>
          <label className="surface-soft interactive-row flex cursor-pointer items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold">Réduire les animations</span>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => updateReducedMotion(event.target.checked)}
              className="h-4 w-4 accent-[#30547D]"
            />
          </label>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Tableau de bord</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choisissez la période affichée par défaut à l&apos;ouverture.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["today", "week", "month"] as const).map((option) => (
            <button
              key={option}
              onClick={() => updateRange(option)}
              className={`btn-base text-sm ${dashboardRange === option ? "btn-primary" : "btn-soft"}`}
            >
              {option === "today" ? "Aujourd'hui" : option === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <label className="surface-soft interactive-row mt-3 flex cursor-pointer items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Notifications bureau (timer)</span>
          <input
            type="checkbox"
            checked={desktopNotifications}
            onChange={(event) => void updateNotifications(event.target.checked)}
            className="h-4 w-4 accent-[#30547D]"
          />
        </label>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Compte</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Email connecté</p>
        <p className="text-sm font-semibold text-woora-primary dark:text-woora-light">{email || "Non disponible"}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Langue: Français (fr-FR)</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Devise: Euro (€)</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-base btn-soft mt-4 w-full sm:w-auto">
          Se déconnecter
        </button>
      </section>

      {message ? <p className="text-sm font-semibold text-woora-primary dark:text-woora-light">{message}</p> : null}
    </div>
  );
}
