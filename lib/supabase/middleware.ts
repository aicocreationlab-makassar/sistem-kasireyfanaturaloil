import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the JWT and refreshes cookies when needed. With Supabase's
  // asymmetric signing keys this is normally local (cached JWKS), unlike getUser
  // which always adds a remote Auth request.
  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims.sub);

  const pathname = request.nextUrl.pathname;
  const isSignInPage = pathname === "/login" || pathname === "/forgot-password";
  const isPublicPage = isSignInPage || pathname === "/reset-password";

  function redirectWithSession(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (!isAuthenticated && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return redirectWithSession(loginUrl);
  }

  if (isAuthenticated && isSignInPage) {
    return redirectWithSession(new URL("/cashier", request.url));
  }

  return response;
}
