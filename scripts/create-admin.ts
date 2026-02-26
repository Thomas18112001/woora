import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "contact@woora.fr";
  const name = "Thomas";
  const plainPassword = "Thbs1811!";

  const hashed = await bcrypt.hash(plainPassword, 12);

  // ⚠️ adapte le nom du champ selon ton schema.prisma :
  // ex: passwordHash / hashedPassword / password
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: hashed, // <-- CHANGE ICI si ton champ s'appelle autrement
    },
    create: {
      email,
      name,
      passwordHash: hashed, // <-- CHANGE ICI si ton champ s'appelle autrement
    },
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