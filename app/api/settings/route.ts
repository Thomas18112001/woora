export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { settingsSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const settings = await prisma.userSetting.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id }
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const body = await request.json();
    const parsed = settingsSchema.parse(body);

    const settings = await prisma.userSetting.upsert({
      where: { userId: session.user.id },
      update: parsed,
      create: {
        userId: session.user.id,
        ...parsed
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
