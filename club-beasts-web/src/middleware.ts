import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as { role?: string })?.role;

  // Rutas públicas - exact match para rutas específicas
  const isPublicExact =
    pathname === "/" || pathname === "/login" || pathname === "/login-cliente";
  const isPublicPrefix = pathname.startsWith("/api");
  const isPublic = isPublicExact || isPublicPrefix;

  if (isPublic) {
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

  // Rutas de recepción solo para DUENO/RECEPCIONISTA
  if (pathname.startsWith("/recepcion") && userRole === "CLIENTE") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // INC-10 (C1 / DEC-065): /rutinas solo staff (DUENO/RECEPCIONISTA); el
  // CLIENTE queda derivado al portal.
  if (pathname.startsWith("/rutinas") && userRole === "CLIENTE") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // /clientes y /dashboard solo para DUENO/RECEPCIONISTA
  if (
    (pathname.startsWith("/clientes") || pathname.startsWith("/dashboard")) &&
    userRole !== "DUENO" &&
    userRole !== "RECEPCIONISTA"
  ) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
