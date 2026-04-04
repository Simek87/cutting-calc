import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use the edge-safe config (no bcryptjs / Node.js imports) so this
// can run in the Edge Runtime.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and image optimisation paths.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
