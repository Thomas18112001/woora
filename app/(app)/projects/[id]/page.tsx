import { notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectDetailClient } from "@/components/project-detail-client";

type Props = {
  params: { id: string };
};

export default async function ProjectPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.user?.id) notFound();

  let rawProject = null;
  try {
    rawProject = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        hourlyRate: true,
        tags: true,
        tasks: {
          take: 120,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            tags: true,
            estimateMinutes: true,
            createdAt: true,
            attachments: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                filename: true,
                sizeBytes: true,
                createdAt: true
              }
            }
          }
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            sizeBytes: true,
            createdAt: true
          }
        },
        timeEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            startAt: true,
            endAt: true,
            durationSeconds: true,
            note: true,
            task: { select: { id: true, title: true } }
          }
        }
      }
    });
  } catch {
    notFound();
  }

  if (!rawProject) {
    notFound();
  }

  const project = {
    ...rawProject,
    hourlyRate: rawProject.hourlyRate ? Number(rawProject.hourlyRate) : null
  };

  return <ProjectDetailClient project={project} />;
}
