export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { computeDurationSeconds } from "@/lib/time";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { manualTimeEntryUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const existing = await prisma.timeEntry.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, startAt: true, endAt: true }
    });
    if (!existing) return jsonError(404, "Entrée de temps introuvable");

    const body = await request.json();
    const parsed = manualTimeEntryUpdateSchema.parse(body);

    const startAt = parsed.startAt ?? existing.startAt;
    const endAt = parsed.endAt !== undefined ? parsed.endAt : existing.endAt;

    if (endAt && endAt < startAt) {
      return jsonError(400, "La date de fin doit être postérieure à la date de début.");
    }

    const durationSeconds = endAt ? computeDurationSeconds(startAt, endAt) : 0;

    const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        startAt,
        endAt,
        durationSeconds,
        note: parsed.note,
        isManual: true
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
