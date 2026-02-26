import { PrismaClient, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@woora.app";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo User" }
  });

  const existingProject = await prisma.project.findFirst({
    where: { userId: user.id, name: "Website Redesign" }
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        userId: user.id,
        name: "Website Redesign",
        clientName: "Acme Inc.",
        hourlyRate: 95,
        status: ProjectStatus.ACTIVE,
        tags: ["design", "frontend"]
      }
    }));

  const existingTasks = await prisma.task.findMany({
    where: { projectId: project.id },
    select: { title: true }
  });
  const existingTitles = new Set(existingTasks.map((task) => task.title));

  if (!existingTitles.has("Landing page wireframe")) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: "Landing page wireframe",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        estimateMinutes: 240
      }
    });
  }

  if (!existingTitles.has("Typography system")) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: "Typography system",
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        estimateMinutes: 120
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
