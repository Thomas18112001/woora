export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api";
import { projectCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status");
    const sort = url.searchParams.get("sort") ?? "updated_desc";

    const where: Prisma.ProjectWhereInput = {
      userId: session.user.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { clientName: { contains: query, mode: "insensitive" } },
              { tags: { hasSome: [query] } }
            ]
          }
        : {}),
      ...(status ? { status: status as never } : {})
    };

    const orderBy =
      sort === "name_asc"
        ? ({ name: "asc" } as const)
        : sort === "name_desc"
          ? ({ name: "desc" } as const)
          : sort === "created_desc"
            ? ({ createdAt: "desc" } as const)
            : ({ updatedAt: "desc" } as const);

    const projects = await prisma.project.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: { tasks: true, timeEntries: true }
        }
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return jsonError(401, "Non autorisé");

    const body = await request.json();
    const parsed = projectCreateSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: parsed.name,
        clientName: parsed.clientName ?? null,
        hourlyRate: parsed.hourlyRate ?? null,
        status: parsed.status ?? "ACTIVE",
        tags: parsed.tags ?? []
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
