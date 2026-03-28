import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (host.startsWith("cutting-calc.")) {
    return { title: "Milling Calc", description: "Bidirectional milling calculator" };
  }
  return { title: "Toolroom Dashboard", description: "MES / Workflow system for thermoforming toolmaking" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host = (await headers()).get("host") ?? "";
  const isMilCalc = host.startsWith("cutting-calc.");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-white px-4 py-2 flex items-center gap-6">
          {isMilCalc ? (
            // cutting-calc.vercel.app — only branding, no toolroom links
            <span className="font-semibold text-sm text-gray-800">Milling Calc</span>
          ) : (
            // toolrom.vercel.app — full toolroom nav + external Milling Calc link
            <>
              <Link href="/" className="font-semibold text-sm text-gray-800 hover:text-gray-600">
                Toolroom
              </Link>
              <Link href="/kanban" className="text-sm text-gray-500 hover:text-gray-800">
                Kanban
              </Link>
              <Link href="/procurement" className="text-sm text-gray-500 hover:text-gray-800">
                Procurement
              </Link>
              <Link href="/outsourcing" className="text-sm text-gray-500 hover:text-gray-800">
                Outsourcing
              </Link>
              <Link href="/suppliers" className="text-sm text-gray-500 hover:text-gray-800">
                Suppliers
              </Link>
              <a
                href="https://cutting-calc.vercel.app/cutting-tools"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2.5 py-0.5 hover:bg-indigo-50 transition-colors"
              >
                Milling Calc
              </a>
            </>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
