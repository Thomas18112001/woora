"use client";

import Image from "next/image";
import Link from "next/link";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-[65] border-b border-slate-200/80 bg-white/90 backdrop-blur md:hidden dark:border-slate-700/90 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-3 py-2">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/logo-woora.png" alt="Woora" width={126} height={32} className="logo-dark-adapt h-8 w-auto" priority />
        </Link>
      </div>
    </header>
  );
}
