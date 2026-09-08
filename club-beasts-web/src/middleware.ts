import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;

  // Rutas públicas
  const publicPaths = ["/", "/login", "/login-cliente", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    // Si está logueado y va a login, redirigir según rol
    if (isLoggedIn && (pathname === "/login" || pathname === "/login-cliente")) {
      if (userRole === "CLIENTE") {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
      return NextResponse.redirect(new URL("/clientes", req.url));
    }
    return NextResponse.next();
  }

  // Rutas protegidas
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Portal del cliente solo para clientes
  if (pathname.startsWith("/portal") && userRole !== "CLIENTE") {
    return NextResponse.redirect(new URL("/clientes", req.url));
  }

  // Rutas de recepción solo para dueño/recepcionista
  if (pathname.startsWith("/recepcion") && userRole === "CLIENTE") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
