export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { taskCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const body = await request.json();
    const parsed = taskCreateSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id: parsed.projectId, userId: session.user.id },
      select: { id: true }
    });
    if (!project) return jsonError(404, "Projet introuvable");

    const task = await prisma.task.create({
      data: {
        projectId: parsed.projectId,
        title: parsed.title,
        description: parsed.description ?? null,
        status: parsed.status ?? "TODO",
        priority: parsed.priority ?? "MEDIUM",
        tags: parsed.tags ?? [],
        estimateMinutes: parsed.estimateMinutes ?? null
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
