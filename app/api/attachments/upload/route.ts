export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const form = await request.formData();
    const projectId = String(form.get("projectId") ?? "").trim();
    const taskIdRaw = String(form.get("taskId") ?? "").trim();
    const taskId = taskIdRaw || null;
    const file = form.get("file");

    if (!projectId) return jsonError(400, "Projet requis pour joindre un fichier.");
    if (!(file instanceof File)) return jsonError(400, "Fichier invalide.");
    if (file.size <= 0) return jsonError(400, "Le fichier est vide.");
    if (file.size > MAX_SIZE_BYTES) return jsonError(400, "Fichier trop volumineux (max 10 Mo).");

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true }
    });
    if (!project) return jsonError(404, "Projet introuvable");

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, projectId, project: { userId: session.user.id } },
        select: { id: true }
      });
      if (!task) return jsonError(404, "Tâche introuvable");
    }

    const extension = path.extname(file.name) || "";
    const storageKey = `${session.user.id}/${randomUUID()}${extension}`;
    const destination = path.join(UPLOAD_ROOT, storageKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, bytes);

    const attachment = await prisma.attachment.create({
      data: {
        userId: session.user.id,
        projectId,
        taskId,
        filename: file.name,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
