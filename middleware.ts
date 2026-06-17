import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except Next internals, API routes, and static asset files.
    // (API routes read cookies directly; the Midtrans webhook must pass through.)
    "/((?!api/|_next/static|_next/image|favicon.ico|asset/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mov|heic)$).*)",
  ],
};
