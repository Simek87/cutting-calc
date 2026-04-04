import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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

        // Hardcoded for now — env var issues on Vercel
        if (email === "mateusz@enviropax.com" && password === "test997") {
          return { id: "1", name: "Mateusz", email, initials: "MA" };
        }

        return null;
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
