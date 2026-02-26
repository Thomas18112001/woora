export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { taskUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const existing = await prisma.task.findFirst({
      where: { id: params.id, project: { userId: session.user.id } },
      select: { id: true }
    });
    if (!existing) return jsonError(404, "Tâche introuvable");

    const body = await request.json();
    const parsed = taskUpdateSchema.parse(body);

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...parsed,
        tags: parsed.tags
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const existing = await prisma.task.findFirst({
      where: { id: params.id, project: { userId: session.user.id } },
      select: { id: true }
    });
    if (!existing) return jsonError(404, "Tâche introuvable");

    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
