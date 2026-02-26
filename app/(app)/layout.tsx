import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { MobileHeader } from "@/components/mobile-header";
import { TimerBar } from "@/components/timer-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ThemeFab } from "@/components/theme-fab";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="relative min-h-screen">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.05]"
          style={{ backgroundImage: "url('/pattern-woora.png')", backgroundSize: "360px", backgroundRepeat: "repeat" }}
        />
        <MobileHeader />
        <Navbar />
        <main className="page-transition relative mx-auto max-w-6xl px-3 pb-44 pt-4 sm:px-4 sm:pb-32 sm:pt-6 md:pt-6">{children}</main>
        <TimerBar />
        <ThemeFab />
        <MobileBottomNav />
      </div>
    </SessionProvider>
  );
}
