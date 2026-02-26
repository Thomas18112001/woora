export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true }
    });
    if (!project) return jsonError(404, "Projet introuvable");

    const tasks = await prisma.task.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}
