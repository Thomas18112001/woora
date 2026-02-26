import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "contact@woora.fr";
  const name = "Thomas";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name
    },
    create: {
      email,
      name
    }
  });

  console.log("User created/updated:", { id: user.id, email: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
