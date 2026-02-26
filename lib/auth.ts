import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

const DEFAULT_CREDENTIALS_EMAIL = process.env.CREDENTIALS_LOGIN_EMAIL ?? "contact@woora.fr";
const DEFAULT_CREDENTIALS_PASSWORD = process.env.CREDENTIALS_LOGIN_PASSWORD ?? "Thbs1811!";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) return null;
        if (email !== DEFAULT_CREDENTIALS_EMAIL.toLowerCase() || password !== DEFAULT_CREDENTIALS_PASSWORD) {
          return null;
        }
        const user = await prisma.user.upsert({
          where: { email },
          update: { name: "Woora Admin" },
          create: { email, name: "Woora Admin" }
        });
        return { id: user.id, email: user.email, name: user.name };
      }
    }),
    ...(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_FROM
      ? [
          EmailProvider({
            server: {
              host: process.env.EMAIL_SERVER_HOST,
              port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD
              }
            },
            from: process.env.EMAIL_FROM
          })
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      const email = (token.email ?? user?.email)?.toLowerCase();
      if ((!token.id || token.id === "woora-local-admin") && email) {
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: user?.name ?? "Woora Admin" }
        });
        token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET
};

export const getAuthSession = () => getServerSession(authOptions);
