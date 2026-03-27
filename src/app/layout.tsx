import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Toolroom Dashboard",
  description: "MES / Workflow system for thermoforming toolmaking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-white px-4 py-2 flex items-center gap-6">
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
          <Link href="/cutting-tools" className="text-sm text-gray-500 hover:text-gray-800">
            Cutting Tools
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
