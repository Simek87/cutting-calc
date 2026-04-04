import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

// ── Type augmentation ──────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      initials: string;
    };
  }
  interface User {
    initials: string;
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const authEmail = process.env.AUTH_EMAIL;
        const authHash = process.env.AUTH_PASSWORD;

        if (!authEmail || !authHash) {
          console.error("AUTH_EMAIL or AUTH_PASSWORD env var not set");
          return null;
        }

        if (email !== authEmail) return null;

        const valid = await bcrypt.compare(password, authHash);
        if (!valid) return null;

        return { id: "1", name: "Mateusz", email, initials: "MA" };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.initials = user.initials;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.initials = (token.initials as string) ?? "?";
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
});
