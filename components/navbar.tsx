"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
const links = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/projects", label: "Projets" },
  { href: "/stats", label: "Statistiques" },
  { href: "/settings", label: "Paramètres" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-slate-200/70 bg-white/82 backdrop-blur md:block dark:border-slate-700/90 dark:bg-slate-950/88">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <Link href="/dashboard" className="flex items-center gap-2 self-start">
          <Image
            src="/logo-woora.png"
            alt="Woora"
            width={126}
            height={32}
            priority
            className="logo-dark-adapt h-8 w-auto sm:h-9"
          />
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-xs sm:text-sm ${pathname.startsWith(link.href) ? "nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-base btn-soft text-sm">
            Se déconnecter
          </button>
        </nav>
      </div>
    </header>
  );
}
