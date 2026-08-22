import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Keep middleware away from assets, callbacks, APIs, and unrelated public URLs.
// It only refreshes/checks the session for auth screens and operational routes.
export const config = {
  matcher: [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/cashier/:path*",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/products/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/settings/:path*",
  ],
};
