import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // UX only. A cookie can exist while its session has expired, so `/passport`
  // and every Server Action still check the real session on the server.
  const guarded =
    pathname === "/passport" ||
    pathname.startsWith("/passport/") ||
    pathname === "/studio" ||
    pathname.startsWith("/studio/");

  if (guarded && !hasSessionCookie(request)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  // TEMPORARY diagnostic removed: the repeated /scan requests did not recur
  // after the dev-server restart, and the empty `?code=` submissions are now
  // blocked client-side. Re-add a timestamped log here if it comes back.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/scan",
    "/x/:path*",
    "/exhibits/:path*",
    "/spike/:path*",
    "/passport",
    "/passport/:path*",
    "/studio",
    "/studio/:path*",
  ],
};
