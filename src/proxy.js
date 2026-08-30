import { NextResponse } from "next/server";

// Protection serveur de l'espace admin (check optimiste de session Supabase).
// La vérification fine du rôle admin reste dans admin/layout.js côté client.
export function proxy(request) {
  const cookies = request.cookies.getAll();
  const aSession = cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!aSession) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
