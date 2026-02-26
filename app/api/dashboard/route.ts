export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { dashboardRangeSchema } from "@/lib/validators";
import { getRangeStart } from "@/lib/time";

type DashboardEntry = {
  id: string;
  startAt: Date;
  durationSeconds: number | null;
  note: string | null;
  project: {
    id: string;
    name: string;
    hourlyRate: number | string | null;
  };
  task: {
    id: string;
    title: string;
  } | null;
};

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const url = new URL(request.url);
    const parsed = dashboardRangeSchema.parse({ range: url.searchParams.get("range") ?? "today" });
    const start = getRangeStart(parsed.range);

    const entriesRaw = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        endAt: { not: null },
        startAt: { gte: start }
      },
      include: {
        project: { select: { id: true, name: true, hourlyRate: true } },
        task: { select: { id: true, title: true } }
      }
    });

    // Typage local (évite any + évite les types Prisma qui posent problème en CI)
    const entries = entriesRaw as unknown as DashboardEntry[];

    const completedTasks = await prisma.task.count({
      where: {
        status: "DONE",
        updatedAt: { gte: start },
        project: { userId: session.user.id }
      }
    });

    const activeProjects = await prisma.project.count({
      where: { userId: session.user.id, status: "ACTIVE" }
    });

    const totalSeconds = entries.reduce((acc, entry) => acc + (entry.durationSeconds ?? 0), 0);

    const totalRevenue = entries.reduce((acc, entry) => {
      const hours = (entry.durationSeconds ?? 0) / 3600;
      const rateRaw = entry.project.hourlyRate;
      const rate = rateRaw == null ? 0 : Number(rateRaw);
      return acc + hours * rate;
    }, 0);

    const avgSessionSeconds = entries.length > 0 ? Math.round(totalSeconds / entries.length) : 0;

    const projectMap = new Map<
      string,
      { projectId: string; projectName: string; seconds: number; montantEuros: number }
    >();

    const taskMap = new Map<string, { taskId: string; taskTitle: string; projectName: string; seconds: number }>();

    const dayMap = new Map<string, { date: string; seconds: number }>();

    const timeline: Array<{
      id: string;
      date: string;
      projet: string;
      tache: string | null;
      dureeSecondes: number;
      note: string | null;
    }> = [];

    for (const entry of entries) {
      const dur = entry.durationSeconds ?? 0;

      const rateRaw = entry.project.hourlyRate;
      const projectRate = rateRaw == null ? 0 : Number(rateRaw);

      const existingProject = projectMap.get(entry.project.id);
      if (existingProject) {
        existingProject.seconds += dur;
        existingProject.montantEuros += (dur / 3600) * projectRate;
      } else {
        projectMap.set(entry.project.id, {
          projectId: entry.project.id,
          projectName: entry.project.name,
          seconds: dur,
          montantEuros: (dur / 3600) * projectRate
        });
      }

      if (entry.task) {
        const existingTask = taskMap.get(entry.task.id);
        if (existingTask) {
          existingTask.seconds += dur;
        } else {
          taskMap.set(entry.task.id, {
            taskId: entry.task.id,
            taskTitle: entry.task.title,
            projectName: entry.project.name,
            seconds: dur
          });
        }
      }

      const day = entry.startAt.toISOString().slice(0, 10);
      const dayLine = dayMap.get(day);
      if (dayLine) {
        dayLine.seconds += dur;
      } else {
        dayMap.set(day, { date: day, seconds: dur });
      }

      timeline.push({
        id: entry.id,
        date: entry.startAt.toISOString(),
        projet: entry.project.name,
        tache: entry.task?.title ?? null,
        dureeSecondes: dur,
        note: entry.note ?? null
      });
    }

    return NextResponse.json({
      range: parsed.range,
      totals: {
        seconds: totalSeconds,
        hours: totalSeconds / 3600,
        revenuEuros: Number(totalRevenue.toFixed(2)),
        moyenneSessionSecondes: avgSessionSeconds,
        tachesTerminees: completedTasks,
        projetsActifs: activeProjects
      },
      projectBreakdown: Array.from(projectMap.values()).sort((a, b) => b.seconds - a.seconds),
      taskBreakdown: Array.from(taskMap.values()).sort((a, b) => b.seconds - a.seconds),
      graphByDay: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      weeklySummary: {
        totalHeures: Number((totalSeconds / 3600).toFixed(2)),
        revenus: Number(totalRevenue.toFixed(2))
      },
      timeline: timeline.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
    });
  } catch (error) {
    return handleApiError(error);
  }
}