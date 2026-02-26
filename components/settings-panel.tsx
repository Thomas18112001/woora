"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("woora-theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  async function updateTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("woora-theme", next);
    applyTheme(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next, locale: "fr-FR", currency: "EUR" })
      });
    } catch {
      // noop: persistence locale in localStorage already handled.
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-base btn-soft text-sm">
        Paramètres
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/25">
          <div className="h-full w-full max-w-sm border-l border-slate-200/80 bg-white/95 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-woora-primary dark:text-woora-light">Paramètres utilisateur</h3>
              <button onClick={() => setOpen(false)} className="btn-base btn-soft px-3 py-1 text-sm">
                Fermer
              </button>
            </div>

            <div className="space-y-4">
              <div className="surface-card p-4">
                <p className="text-sm font-semibold">Thème</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateTheme("light")}
                    className={`btn-base px-3 py-2 text-sm ${theme === "light" ? "btn-primary" : "btn-soft"}`}
                  >
                    Clair
                  </button>
                  <button
                    onClick={() => updateTheme("dark")}
                    className={`btn-base px-3 py-2 text-sm ${theme === "dark" ? "btn-primary" : "btn-soft"}`}
                  >
                    Sombre
                  </button>
                </div>
              </div>

              <div className="surface-card p-4 text-sm text-slate-600 dark:text-slate-300">
                <p>Langue: Français (fr-FR)</p>
                <p className="mt-1">Devise: Euro (€)</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
