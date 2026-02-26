export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { projectUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        tasks: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        timeEntries: {
          orderBy: { createdAt: "desc" },
          include: { task: true },
          take: 100
        }
      }
    });

    if (!project) return jsonError(404, "Projet introuvable");
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true }
    });
    if (!existing) return jsonError(404, "Projet introuvable");

    const body = await request.json();
    const parsed = projectUpdateSchema.parse(body);

    const project = await prisma.project.update({
      where: { id: params.id },
      data: parsed
    });

    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true }
    });
    if (!existing) return jsonError(404, "Projet introuvable");

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
