import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("cutting-calc.") && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/cutting-tools", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
