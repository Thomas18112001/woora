export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { timerStartSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const body = await request.json();
    const parsed = timerStartSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id: parsed.projectId, userId: session.user.id },
      select: { id: true }
    });
    if (!project) return jsonError(404, "Projet introuvable");

    if (parsed.taskId) {
      const task = await prisma.task.findFirst({
        where: { id: parsed.taskId, projectId: parsed.projectId, project: { userId: session.user.id } },
        select: { id: true }
      });
      if (!task) return jsonError(404, "Tâche introuvable");
    }

    const entry = await prisma.$transaction(
      async (tx) => {
        const active = await tx.timeEntry.findFirst({
          where: { userId: session.user.id, endAt: null },
          select: { id: true }
        });
        if (active) {
          return null;
        }

        return tx.timeEntry.create({
          data: {
            userId: session.user.id,
            projectId: parsed.projectId,
            taskId: parsed.taskId ?? null,
            startAt: new Date(),
            billable: true,
            note: parsed.note ?? null
          },
          include: {
            project: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } }
          }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!entry) return jsonError(409, "Un minuteur actif existe déjà");
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "Un minuteur actif existe déjà");
    }
    return handleApiError(error);
  }
}
