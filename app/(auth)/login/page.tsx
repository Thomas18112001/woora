import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.08]"
        style={{ backgroundImage: "url('/pattern-woora.png')", backgroundSize: "480px", backgroundRepeat: "repeat" }}
      />
      <div className="surface-card relative w-full max-w-md p-6">
        <div className="mb-5 flex justify-center">
          <Image src="/logo-woora.png" alt="Woora" width={220} height={58} priority className="logo-dark-adapt h-12 w-auto sm:h-14" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Utilisez email/mot de passe, Google, ou recevez un lien magique par email.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
