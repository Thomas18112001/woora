import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClient } from "@/components/projects-client";

export default async function ProjectsPage() {
  const session = await getAuthSession();
  const userId = session!.user.id;
  let projects: Array<{
    id: string;
    name: string;
    clientName: string | null;
    status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
    tags: string[];
    _count: { tasks: number; timeEntries: number };
  }> = [];
  let dbError = "";

  try {
    projects = await prisma.project.findMany({
      where: { userId },
      take: 60,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        tags: true,
        _count: {
          select: { tasks: true, timeEntries: true }
        }
      }
    });
  } catch {
    dbError = "Connexion à la base de données impossible. Vérifiez la configuration PostgreSQL.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projets</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Créez et gérez vos projets clients.</p>
      </div>
      {dbError ? (
        <div className="rounded-xl border border-red-300 bg-red-50/95 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700 dark:bg-red-950/35 dark:text-red-200">
          {dbError}
        </div>
      ) : null}
      <ProjectsClient initialProjects={projects} />
    </div>
  );
}
