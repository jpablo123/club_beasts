/**
 * Resuelve adónde debe ir el usuario después de iniciar sesión.
 *
 * La recuperación centralizada de sesión (`src/lib/session-recovery.ts`)
 * conserva la pantalla original en el parámetro `callbackUrl` del login
 * (INC00-AUTH-03). Aquí se valida antes de usarlo: solo se aceptan rutas
 * internas para evitar redirecciones abiertas.
 */
export function resolvePostLoginPath(fallback: string): string {
  if (typeof window === "undefined") return fallback;

  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return fallback;

  const isInternalPath =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\");

  return isInternalPath ? raw : fallback;
}
