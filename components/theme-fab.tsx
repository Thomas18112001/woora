"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeFab() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("woora-theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
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
      // ignore background settings sync errors
    }
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Basculer le thème"
      className="fixed bottom-24 right-4 z-[60] rounded-full border border-white/30 bg-gradient-to-br from-woora-primary to-[#244869] p-3 text-white shadow-2xl transition-all hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_24px_36px_-18px_rgba(15,49,77,0.88)] md:bottom-6"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M6.76 4.84l-1.8-1.79-1.42 1.41 1.79 1.8 1.43-1.42zm10.45-1.79l-1.79 1.79 1.42 1.42 1.8-1.8-1.43-1.41zM12 4V1h-1v3h1zm7 8h3v-1h-3v1zM4 11H1v1h3v-1zm1.34 7.66l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM17.24 19.16l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM12 20v3h1v-3h-1zm0-14a6 6 0 100 12 6 6 0 000-12z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M9.37 5.51A7 7 0 0016.49 14 7 7 0 119.37 5.5z" />
        </svg>
      )}
    </button>
  );
}
