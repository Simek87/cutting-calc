/**
 * Edge-safe NextAuth config — no Node.js-only imports (bcryptjs, prisma).
 * Used by middleware so it can run in the Edge Runtime.
 * The full config (with Credentials + bcrypt) lives in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // populated in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Auth API is always public
      if (pathname.startsWith("/api/auth")) return true;

      // Login page: redirect logged-in users to dashboard
      if (pathname === "/login") {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Everything else requires authentication
      return isLoggedIn;
    },
  },
};
