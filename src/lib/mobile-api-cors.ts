import { NextResponse, type NextRequest } from "next/server";

/** Expo web preview (localhost) or the deployed mobile web app calling the Next API cross-origin. */
function isExpoDevOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Deployed Expo web build on Vercel
  if (origin === "https://det-mobile.vercel.app") return true;
  // Any Vercel preview deployments for the mobile project
  if (/^https:\/\/det-mobile[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

/**
 * CORS for mobile web preview at localhost:8083 → API on localhost:3000 or production.
 * Native apps are not affected (no Origin header).
 */
export function mobileApiCorsResponse(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;
  const origin = request.headers.get("origin");
  if (!isExpoDevOrigin(origin)) return null;

  const headers = {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, x-ep-admin-token",
  };

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
