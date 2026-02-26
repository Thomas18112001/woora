import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(400, "Erreur de validation", error.flatten());
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError(409, "Conflit: donnée déjà existante.");
    if (error.code === "P2003") return jsonError(400, "Référence invalide liée à la base de données.");
    if (error.code === "P2025") return jsonError(404, "Ressource introuvable.");
    return jsonError(400, "Erreur de base de données.");
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return jsonError(
      503,
      "Connexion à la base de données impossible. Vérifiez DATABASE_URL et les droits PostgreSQL."
    );
  }

  console.error(error);
  return jsonError(500, "Erreur interne du serveur");
}
