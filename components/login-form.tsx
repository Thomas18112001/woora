"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

type AuthProviderMap = Record<string, { id: string; name: string; type: string }>;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviderMap | null>(null);

  useEffect(() => {
    async function loadProviders() {
      const res = await fetch("/api/auth/providers", { cache: "no-store" });
      if (!res.ok) {
        setProviders({});
        return;
      }
      setProviders((await res.json()) as AuthProviderMap);
    }
    void loadProviders();
  }, []);

  const hasGoogle = useMemo(() => Boolean(providers?.google), [providers]);
  const hasEmail = useMemo(() => Boolean(providers?.email), [providers]);
  const hasCredentials = useMemo(() => Boolean(providers?.credentials), [providers]);

  async function submitCredentials(event: FormEvent) {
    event.preventDefault();
    if (!hasCredentials) return;

    setLoading(true);
    setMessage("");
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false
    });
    setLoading(false);

    if (result?.error) {
      setMessage("Email ou mot de passe invalide.");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!hasEmail) return;

    setLoading(true);
    setMessage("");
    const result = await signIn("email", { email, callbackUrl: "/dashboard", redirect: false });
    setLoading(false);
    if (result?.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Lien magique envoyé. Vérifiez votre boîte email.");
  }

  return (
    <div className="space-y-4">
      {hasGoogle ? (
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="btn-base btn-secondary w-full"
        >
          Continuer avec Google
        </button>
      ) : null}
      {hasGoogle && (hasCredentials || hasEmail) ? (
        <div className="relative py-1">
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
          <span className="absolute left-1/2 top-1 -translate-x-1/2 bg-white px-2 text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            ou
          </span>
        </div>
      ) : null}
      {hasCredentials ? (
        <form onSubmit={submitCredentials} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contact@woora.fr"
            className="input-woora"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="input-woora"
          />
          <button disabled={loading} className="btn-base btn-primary w-full">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      ) : null}
      {hasCredentials && hasEmail ? (
        <div className="relative py-1">
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
          <span className="absolute left-1/2 top-1 -translate-x-1/2 bg-white px-2 text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            ou
          </span>
        </div>
      ) : null}
      {hasEmail ? (
        <form onSubmit={submitEmail} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@entreprise.com"
            className="input-woora"
          />
          <button disabled={loading} className="btn-base btn-soft w-full">
            {loading ? "Envoi..." : "Envoyer un lien magique"}
          </button>
        </form>
      ) : null}
      {providers && !hasGoogle && !hasEmail && !hasCredentials ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Aucun mode de connexion n&apos;est configuré. Configurez Google et/ou Email dans les variables
          d&apos;environnement.
        </p>
      ) : null}
      {message ? <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p> : null}
    </div>
  );
}
