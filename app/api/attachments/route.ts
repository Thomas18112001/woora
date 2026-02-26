export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const taskId = url.searchParams.get("taskId") ?? undefined;

    const attachments = await prisma.attachment.findMany({
      where: {
        userId: session.user.id,
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(attachments);
  } catch (error) {
    return handleApiError(error);
  }
}
