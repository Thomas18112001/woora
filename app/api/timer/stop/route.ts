export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { computeDurationSeconds } from "@/lib/time";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const active = await prisma.timeEntry.findFirst({
      where: { userId: session.user.id, endAt: null },
      orderBy: { startAt: "desc" }
    });
    if (!active) return jsonError(404, "Aucun minuteur actif");

    const endAt = new Date();
    const durationSeconds = computeDurationSeconds(active.startAt, endAt);

    const entry = await prisma.timeEntry.update({
      where: { id: active.id },
      data: { endAt, durationSeconds },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    return handleApiError(error);
  }
}
