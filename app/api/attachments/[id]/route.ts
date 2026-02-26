export const dynamic = "force-dynamic";

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: { id: string } };
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function GET(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const attachment = await prisma.attachment.findFirst({
      where: { id: params.id, userId: session.user.id }
    });
    if (!attachment) return jsonError(404, "Pièce jointe introuvable");

    const filePath = path.join(UPLOAD_ROOT, attachment.storageKey);
    const file = await fs.readFile(filePath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const attachment = await prisma.attachment.findFirst({
      where: { id: params.id, userId: session.user.id }
    });
    if (!attachment) return jsonError(404, "Pièce jointe introuvable");

    await prisma.attachment.delete({ where: { id: params.id } });
    await fs.rm(path.join(UPLOAD_ROOT, attachment.storageKey), { force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
