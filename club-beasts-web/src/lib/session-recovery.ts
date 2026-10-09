import { getSession } from "next-auth/react";
import { SESSION_EXPIRED_PARAM, SESSION_EXPIRED_REASON } from "./session-notice";
import {
  holdSessionTraffic,
  releaseSessionTraffic,
  waitForSessionTrafficIdle,
} from "./session-traffic";

/**
 * Coordinador centralizado de recuperación de sesión (INC00-AUTH-01..07).
 *
 * Canal de observación:
 *  - `signOut({ callbackUrl, redirect: false })` cierra la sesión y limpia
 *    datos privados sin navegar.
 *  - `window.location` es la única navegación de salida y solo se ejecuta
 *    cuando la sesión ya quedó cerrada y confirmada.
 *  - El `ApiError` entregado al llamador nunca se modifica: el mensaje
 *    aprobado lo aporta el backend.
 *
 * Reglas:
 *  - AUTH-01: single-flight. Varias peticiones concurrentes con 401
 *    comparten UNA sola recuperación.
 *  - AUTH-02: la sesión queda realmente cerrada (GAP-009): la compuerta de
 *    tráfico de sesión (`session-traffic.ts`) espera a que terminen las
 *    lecturas en vuelo antes del `signout`, se confirma con
 *    `GET /api/auth/session` que ya no hay sesión y solo entonces se navega.
 *  - AUTH-03: login correcto según rol (CLIENTE -> /login-cliente,
 *    interno -> /login) conservando la pantalla original en `callbackUrl`.
 *  - AUTH-04/05/06: la recuperación solo se dispara ante un 401 con
 *    `kind === "session_expired"`; credenciales inválidas, 403 y errores de
 *    red no llegan nunca a este módulo.
 *  - AUTH-07: un 401 tardío se detecta comparando el token usado por la
 *    petición con el token vigente de la sesión; si cambiaron, no se cierra
 *    la sesión nueva.
 */

type SignOutFn = (options?: {
  callbackUrl?: string;
  redirect?: boolean;
}) => Promise<unknown>;

type SessionUser = { apiToken?: string; role?: string };

const LOGIN_ROUTES = ["/login", "/login-cliente"] as const;

/** Promesa de la recuperación en curso. Una vez iniciada no se repite en esta carga de la app. */
let recoveryInFlight: Promise<void> | null = null;

function readSessionUser(session: unknown): SessionUser {
  const user = (session as { user?: unknown } | null | undefined)?.user;
  return (user ?? {}) as SessionUser;
}

/** Ruta de login correcta según el tipo de sesión (AUTH-03). */
export function loginRouteFor(role?: string | null): string {
  return role === "CLIENTE" ? "/login-cliente" : "/login";
}

/** True si la ruta actual ya es una pantalla de login (no hace falta callbackUrl). */
export function isLoginRoute(path: string): boolean {
  return LOGIN_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}?`)
  );
}

/** Pantalla actual (pathname + query + hash) o null si no hay navegador. */
export function currentBrowserPath(): string | null {
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (!location) return null;
  const path = `${location.pathname ?? ""}${location.search ?? ""}${
    location.hash ?? ""
  }`;
  return path.length > 0 ? path : null;
}

/**
 * Composición del destino de salida hacia un login:
 *  - `callbackUrl` con la pantalla original cuando aplica (AUTH-03).
 *  - `reason=session_expired` para que el login muestre el mensaje aprobado
 *    (AUTH-02).
 */
function composeLoginTarget(
  loginRoute: string,
  currentPath: string | null
): string {
  const reason = `${SESSION_EXPIRED_PARAM}=${SESSION_EXPIRED_REASON}`;
  if (!currentPath || isLoginRoute(currentPath)) {
    return `${loginRoute}?${reason}`;
  }
  return `${loginRoute}?callbackUrl=${encodeURIComponent(
    currentPath
  )}&${reason}`;
}

/**
 * Destino de la recuperación: login correcto + pantalla original como
 * `callbackUrl` cuando aplica (AUTH-03) + motivo de la salida (AUTH-02).
 */
export function buildLoginTarget(
  role: string | null | undefined,
  currentPath: string | null
): string {
  return composeLoginTarget(loginRouteFor(role), currentPath);
}

/** True si hay una recuperación de sesión en curso (salida ya manejada). */
export function isRecoveryInProgress(): boolean {
  return recoveryInFlight !== null;
}

/**
 * Salida de una pantalla protegida que acaba de perder la sesión.
 *
 * - `null`: la recuperación centralizada ya está manejando la salida; la
 *   pantalla NO debe competir con `router.push` ni perder el `callbackUrl`
 *   (carrera del hallazgo B2 / AUTH-03).
 * - `string`: ruta hacia el login conservando la pantalla original, para que
 *   la pantalla salga por su cuenta cuando la recuperación no corrió.
 */
export function resolveSessionExit(loginRoute: string): string | null {
  if (recoveryInFlight) return null;
  const currentPath = currentBrowserPath();
  if (!currentPath) return null;
  return composeLoginTarget(loginRoute, currentPath);
}

/**
 * `signOut` se resuelve de forma perezosa: evita que este módulo rompa
 * entornos donde el canal de sesión aún no está registrado.
 */
async function loadSignOut(): Promise<SignOutFn | undefined> {
  try {
    const mod = (await import("next-auth/react")) as unknown as Record<
      string,
      unknown
    >;
    if (!("signOut" in mod)) return undefined;
    const candidate = mod.signOut;
    return typeof candidate === "function"
      ? (candidate as SignOutFn)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Navegación de salida al login correcto, única responsable de mover el navegador. */
function navigateTo(target: string): void {
  if (typeof window === "undefined") return;
  try {
    const location = window.location;
    if (location) location.href = target;
  } catch {
    // Entorno sin navegación real: se ignora.
  }
}

/**
 * Intentos de cierre antes de navegar igualmente. El primero es el normal;
 * el segundo solo existe por si la sesión sobrevive al `signout` (por ejemplo
 * porque una respuesta tardía re-emitió la cookie).
 */
const MAX_CLOSE_ATTEMPTS = 2;

/**
 * Confirmación de cierre (AUTH-02 / GAP-009): lee directamente
 * `GET /api/auth/session` para comprobar que el navegador ya no tiene sesión.
 *
 * Devuelve `true` si sigue viva, `false` si está cerrada y `null` si la
 * comprobación no pudo realizarse (se asume mejor esfuerzo y se navega).
 * Se usa `fetch` propio y no `getSession` para no abrir nuevas vías de
 * re-emisión ni el canal de difusión de next-auth.
 */
async function sessionStillAlive(): Promise<boolean | null> {
  try {
    if (typeof fetch !== "function") return null;
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const data = JSON.parse(await response.text()) as { user?: unknown } | null;
    return Boolean(data && data.user);
  } catch {
    return null;
  }
}

/**
 * Cierre de la sesión y confirmación, con la compuerta de tráfico cerrada.
 *
 * El orden es la garantía contra la cookie resucitada (GAP-009):
 *  1. Ninguna lectura de sesión nueva sale a la red y las ya en vuelo terminan.
 *  2. `signOut` con `redirect: false` borra la cookie sin navegar.
 *  3. `GET /api/auth/session` confirma que ya no hay sesión; si la hubiera,
 *     se vuelve a cerrar con la compuerta vuelta a cerrar.
 */
async function closeSession(
  signOut: SignOutFn,
  target: string
): Promise<void> {
  for (let attempt = 0; attempt < MAX_CLOSE_ATTEMPTS; attempt++) {
    try {
      await signOut({ callbackUrl: target, redirect: false });
    } finally {
      // La respuesta de `signout` ya borró la cookie: a partir de aquí las
      // lecturas que sigan viajan sin ella y son inocuas.
      releaseSessionTraffic();
    }

    if ((await sessionStillAlive()) !== true) return;

    // La sesión sobrevivió: cerrar de nuevo sin lecturas en vuelo.
    holdSessionTraffic();
    await waitForSessionTrafficIdle();
  }
}

async function runRecovery(role: string | null | undefined): Promise<void> {
  const target = buildLoginTarget(role, currentBrowserPath());

  // 1. Compuerta de tráfico de sesión + drenaje de lecturas en vuelo: ninguna
  //    respuesta tardía de `GET /api/auth/session` puede re-emitir la cookie
  //    después de que `signout` la borre.
  holdSessionTraffic();
  try {
    await waitForSessionTrafficIdle();

    const signOut = await loadSignOut();
    if (signOut) {
      await closeSession(signOut, target);
    }
  } catch {
    // El cierre de sesión pudo fallar; aun así se lleva al login correcto.
  } finally {
    releaseSessionTraffic();
  }

  // 2. Navegación explícita al login correcto conservando la pantalla
  //    original (AUTH-03) con `reason=session_expired` (AUTH-02).
  navigateTo(target);
}

/**
 * Recuperación centralizada y single-flight.
 *
 * @param requestToken token usado por la petición que recibió el 401.
 *                     `null`/`undefined` significa que no había sesión que
 *                     recuperar, por lo que no se cierra nada.
 */
export async function recoverSession(
  requestToken?: string | null
): Promise<void> {
  try {
    // Sin sesión no hay nada que cerrar (evita logout globales espurios).
    if (!requestToken) return;
    if (recoveryInFlight) return recoveryInFlight;

    const session = await getSession();
    const user = readSessionUser(session);

    // AUTH-07: 401 tardío de una sesión anterior. Si el token vigente cambió,
    // la sesión nueva sigue siendo válida y no se cierra.
    if (!user.apiToken || user.apiToken !== requestToken) return;

    // Segunda comprobación tras el await: peticiones concurrentes que
    // llegan aquí comparten la misma recuperación (AUTH-01).
    if (recoveryInFlight) return recoveryInFlight;

    const pending = runRecovery(user.role).catch(() => undefined);
    recoveryInFlight = pending;
    return pending;
  } catch {
    // La recuperación nunca debe enmascarar el error original.
    return undefined;
  }
}
