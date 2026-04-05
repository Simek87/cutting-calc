import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { GlobalShortcuts } from "./GlobalShortcuts";
import { auth, signOut } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Toolroom Dashboard",
  description: "MES / Workflow system for thermoforming toolmaking",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col" style={{ backgroundColor: "#0d0f10", color: "#e2e4e6" }}>
        <GlobalShortcuts />
        <nav
          className="flex-shrink-0 px-4 py-2 flex items-center gap-6"
          style={{ backgroundColor: "#141618", borderBottom: "1px solid #2a2d30" }}
        >
          <Link
            href="/"
            className="font-semibold text-sm"
            style={{ color: "#e8a020", fontFamily: "var(--font-jetbrains-mono)" }}
          >
            TOOLROOM
          </Link>
          <Link href="/kanban" className="text-sm" style={{ color: "#8b9196" }}>
            Kanban
          </Link>
          <Link href="/procurement" className="text-sm" style={{ color: "#8b9196" }}>
            Procurement
          </Link>
          <Link href="/outsourcing" className="text-sm" style={{ color: "#8b9196" }}>
            Outsourcing
          </Link>
          <Link href="/suppliers" className="text-sm" style={{ color: "#8b9196" }}>
            Suppliers
          </Link>
          <Link href="/todo" className="text-sm" style={{ color: "#8b9196" }}>
            To-Do
          </Link>
          <Link href="/issues" className="text-sm" style={{ color: "#8b9196" }}>
            Issues
          </Link>
          <Link href="/archive" className="text-sm" style={{ color: "#8b9196" }}>
            Archive
          </Link>
          <Link href="/notes" className="text-sm" style={{ color: "#8b9196" }}>
            Notes
          </Link>
          <Link href="/reference" className="text-sm" style={{ color: "#8b9196" }}>
            Reference
          </Link>

          {/* Milling Calc external link */}
          <a
            href="https://cutting-calc.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded"
            style={{
              color: "#e8a020",
              border: "1px solid rgba(232,160,32,0.3)",
              backgroundColor: "rgba(232,160,32,0.08)",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Milling Calc ↗
          </a>

          {/* User info + Sign out */}
          {session?.user && (
            <div className="ml-auto flex items-center gap-3">
              {/* Avatar / initials badge */}
              <span
                className="text-xs w-7 h-7 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                style={{
                  backgroundColor: "rgba(232,160,32,0.15)",
                  color: "#e8a020",
                  border: "1px solid rgba(232,160,32,0.3)",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {session.user.initials}
              </span>
              <span className="text-xs hidden sm:block" style={{ color: "#8b9196" }}>
                {session.user.name}
              </span>

              {/* Sign out form — server action */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs px-2.5 py-1 rounded hover:opacity-80 transition-opacity"
                  style={{ color: "#8b9196", border: "1px solid #2a2d30" }}
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
