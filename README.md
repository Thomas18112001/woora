# Woora

Application de gestion de projets et suivi du temps (Next.js 14, Prisma, PostgreSQL, NextAuth).

## Installation locale

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev -- --port 3001
```

Application: `http://localhost:3001`

## Build production

```bash
npm run build
npm run start
```

## Variables d'environnement

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/woora"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="replace-with-strong-secret"

CREDENTIALS_LOGIN_EMAIL="contact@woora.fr"
CREDENTIALS_LOGIN_PASSWORD="Thbs1811!"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="noreply@example.com"
```

## Fonctionnalités

- Interface complète en français
- Tableau de bord: statistiques, graphiques, timeline, export CSV
- Minuteur facturable / non facturable (un seul minuteur actif par utilisateur)
- Projets et tâches: tags, recherche, filtres, tri
- Édition manuelle des entrées de temps
- Pièces jointes sécurisées (upload/list/preview/download/suppression)
- Thème clair/sombre persistant + panneau paramètres
- Notifications toast + modales de confirmation

## Prisma migration ajoutée

- `prisma/migrations/20260226161000_professional_upgrade/migration.sql`
