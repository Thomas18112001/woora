export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { dashboardRangeSchema } from "@/lib/validators";
import { getRangeStart } from "@/lib/time";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const url = new URL(request.url);
    const parsed = dashboardRangeSchema.parse({ range: url.searchParams.get("range") ?? "today" });
    const start = getRangeStart(parsed.range);

    const entries = await prisma.timeEntry.findMany({
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

    const completedTasks = await prisma.task.count({
      where: {
        status: "DONE",
        updatedAt: { gte: start },
        project: { userId: session.user.id }
      }
    });

    const activeProjects = await prisma.project.count({ where: { userId: session.user.id, status: "ACTIVE" } });

    const totalSeconds = entries.reduce(
  (acc: number, entry: any) => acc + (entry.durationSeconds ?? 0),
  0
);

const totalRevenue = entries.reduce(
  (acc: number, entry: any) => {
    const hours = (entry.durationSeconds ?? 0) / 3600;
    const rateRaw = entry.project?.hourlyRate;
    const rate = rateRaw == null ? 0 : Number(rateRaw);
    return acc + hours * rate;
  },
  0
);
    const avgSessionSeconds = entries.length > 0 ? Math.round(totalSeconds / entries.length) : 0;

    const projectMap = new Map<string, { projectId: string; projectName: string; seconds: number; montantEuros: number }>();
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
      const projectRate = entry.project.hourlyRate ? Number(entry.project.hourlyRate) : 0;
      const existingProject = projectMap.get(entry.project.id);
      if (existingProject) {
        existingProject.seconds += entry.durationSeconds;
        existingProject.montantEuros += (entry.durationSeconds / 3600) * projectRate;
      } else {
        projectMap.set(entry.project.id, {
          projectId: entry.project.id,
          projectName: entry.project.name,
          seconds: entry.durationSeconds,
          montantEuros: (entry.durationSeconds / 3600) * projectRate
        });
      }

      if (entry.task) {
        const existingTask = taskMap.get(entry.task.id);
        if (existingTask) {
          existingTask.seconds += entry.durationSeconds;
        } else {
          taskMap.set(entry.task.id, {
            taskId: entry.task.id,
            taskTitle: entry.task.title,
            projectName: entry.project.name,
            seconds: entry.durationSeconds
          });
        }
      }

      const day = entry.startAt.toISOString().slice(0, 10);
      const dayLine = dayMap.get(day);
      if (dayLine) {
        dayLine.seconds += entry.durationSeconds;
      } else {
        dayMap.set(day, { date: day, seconds: entry.durationSeconds });
      }

      timeline.push({
        id: entry.id,
        date: entry.startAt.toISOString(),
        projet: entry.project.name,
        tache: entry.task?.title ?? null,
        dureeSecondes: entry.durationSeconds,
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
