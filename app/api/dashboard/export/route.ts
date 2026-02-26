export const dynamic = "force-dynamic";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, handleApiError } from "@/lib/api";
import { getRangeStart } from "@/lib/time";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const url = new URL(request.url);
    const range = (url.searchParams.get("range") ?? "week") as "today" | "week" | "month";
    const start = getRangeStart(range);

    const entries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        startAt: { gte: start }
      },
      include: {
        project: { select: { name: true, hourlyRate: true } },
        task: { select: { title: true } }
      },
      orderBy: { startAt: "desc" }
    });

    const header = ["Date", "Projet", "Tâche", "Durée (h)", "Montant (€)", "Note"];
    const rows = entries.map((entry) => {
      const hours = entry.durationSeconds / 3600;
      const rate = entry.project.hourlyRate ? Number(entry.project.hourlyRate) : 0;
      const amount = hours * rate;
      return [
        new Date(entry.startAt).toLocaleString("fr-FR"),
        entry.project.name,
        entry.task?.title ?? "",
        hours.toFixed(2),
        amount.toFixed(2),
        (entry.note ?? "").replace(/\n/g, " ")
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=rapport-${range}.csv`
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
