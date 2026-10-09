/**
 * Compuerta de trafico de sesion (INC00-AUTH-01 / GAP-009).
 *
 * Auth.js re-firma y re-emite la cookie de sesion en CADA respuesta de
 * `GET /api/auth/session`. Si alguna de esas lecturas sigue en vuelo cuando
 * `POST /api/auth/signout` borra la cookie, su respuesta tardia vuelve a
 * crearla: el navegador queda con cookie pero ya en /login, el middleware lo
 * devuelve a /clientes y se entra en el bucle /login <-> /clientes que
 * reproduce el E2E `tests/e2e/sesion-vencida.spec.ts`.
 *
 * La garantia que aporta este modulo es deliberadamente de bajo nivel
 * (intercepta `fetch`), porque la fuente de las lecturas no es solo el codigo
 * de la app: `SessionProvider` de next-auth también las emite desde sus
 * efectos y desde el canal de difusion. Solo interceptando el transporte se
 * puede afirmar que "no hay ninguna lectura de sesion en vuelo".
 *
 * Contrato:
 *  - `holdSessionTraffic()`: a partir de ese momento NINGUNA lectura de
 *    sesion sale a la red (se encola hasta `releaseSessionTraffic()`).
 *  - `waitForSessionTrafficIdle()`: resuelve cuando terminan las lecturas ya
 *    en vuelo; despues de eso ninguna respuesta tardia puede resucitar la
 *    cookie una vez firmada la salida.
 *  - La compuerta se abre sola al llegar la respuesta de `signout`: ahi la
 *    cookie ya esta borrada y las lecturas siguientes viajan sin ella.
 *  - El trafico que no es de sesion atraviesa sin retenerse.
 *
 * La instalacion automatica solo ocurre en el navegador (nunca en tests):
 * `installSessionTrafficGate()` es la entrada explicita para los tests.
 */

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type Gate = {
  installed: boolean;
  originalFetch: FetchLike | null;
  wrappedFetch: FetchLike | null;
  held: boolean;
  pending: number;
  releaseWaiters: Array<() => void>;
  idleWaiters: Array<() => void>;
  deadmanTimer: ReturnType<typeof setTimeout> | null;
};

/** Tope de tiempo con la compuerta cerrada: nunca debe dejar la app parada. */
const MAX_HOLD_MS = 10000;

/** Espera por defecto de drenaje; una lectura de sesion no tarda mas que eso. */
const DEFAULT_IDLE_TIMEOUT_MS = 3000;

const GATE_KEY = Symbol.for("club-beasts.sessionTrafficGate");

function createGate(): Gate {
  return {
    installed: false,
    originalFetch: null,
    wrappedFetch: null,
    held: false,
    pending: 0,
    releaseWaiters: [],
    idleWaiters: [],
    deadmanTimer: null,
  };
}

function gate(): Gate {
  const scope = globalThis as unknown as Record<symbol, Gate | undefined>;
  if (!scope[GATE_KEY]) scope[GATE_KEY] = createGate();
  return scope[GATE_KEY] as Gate;
}

function isTestEnvironment(): boolean {
  try {
    return typeof process !== "undefined" && process.env?.NODE_ENV === "test";
  } catch {
    return false;
  }
}

/**
 * pathname de una peticion, o null si no se puede resolver.
 *
 * Se resuelve contra la base actual y, si la base no es una URL valida (p.ej.
 * un `window.location` simulado por los tests), contra una base neutra: nunca
 * se puede permitir que un pathname no resolvible escape de la compuerta.
 */
function requestPathname(input: RequestInfo | URL): string | null {
  let raw: string | null = null;
  if (typeof input === "string") raw = input;
  else if (typeof URL !== "undefined" && input instanceof URL) raw = input.href;
  else {
    const url = (input as Request).url;
    raw = typeof url === "string" ? url : null;
  }
  if (!raw) return null;

  const locationHref =
    typeof window !== "undefined" && window.location?.href
      ? window.location.href
      : null;

  for (const base of [locationHref, "http://localhost/"]) {
    if (!base) continue;
    try {
      return new URL(raw, base).pathname;
    } catch {
      // Base no valida para esta peticion: se intenta con la siguiente.
    }
  }
  return null;
}

function isSessionPath(pathname: string | null): boolean {
  return pathname !== null && /\/api\/auth\/session$/.test(pathname);
}

function isSignOutPath(pathname: string | null): boolean {
  return pathname !== null && /\/api\/auth\/signout$/.test(pathname);
}

function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  const handle = timer as unknown as { unref?: () => void };
  if (handle && typeof handle.unref === "function") handle.unref();
}

function wakeWaiters(waiters: Array<() => void>): void {
  const pending = waiters.splice(0, waiters.length);
  for (const wake of pending) wake();
}

function releaseHold(g: Gate): void {
  if (g.deadmanTimer !== null) {
    clearTimeout(g.deadmanTimer);
    g.deadmanTimer = null;
  }
  g.held = false;
  wakeWaiters(g.releaseWaiters);
}

function notifyIdle(g: Gate): void {
  if (g.pending === 0) wakeWaiters(g.idleWaiters);
}

function waitForRelease(g: Gate): Promise<void> {
  return new Promise<void>((resolve) => g.releaseWaiters.push(resolve));
}

function assignFetch(scope: unknown, value: FetchLike): void {
  try {
    Object.defineProperty(scope, "fetch", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    try {
      (scope as { fetch?: FetchLike }).fetch = value;
    } catch {
      // Entorno donde fetch no es reasignable: la compuerta queda sin instalar.
    }
  }
}

/**
 * Instala la interception de `fetch`. Idempotente (el estado vive en un
 * simbolo global, asi que sobrevive a recargas de modulo).
 *
 * @param target fetch que debe envolver; por defecto el `fetch` global.
 */
export function installSessionTrafficGate(target?: FetchLike): boolean {
  const g = gate();
  if (g.installed) return true;

  const scope = globalThis as unknown as { fetch?: unknown };
  const candidate = target ?? scope.fetch;
  if (typeof candidate !== "function") return false;

  const original = candidate as FetchLike;

  const wrapped = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const current = gate();

    // Si algo (un test, otra capa) reemplazo fetch, delegamos en el vigente y
    // volvemos a cubrirlo: la compuerta nunca debe convertirse en un muro.
    if (
      current.originalFetch &&
      typeof scope.fetch === "function" &&
      scope.fetch !== wrapped
    ) {
      current.originalFetch = scope.fetch as FetchLike;
      assignFetch(scope, wrapped);
    }

    const active = current.originalFetch ?? original;
    const pathname = requestPathname(input);

    if (isSessionPath(pathname)) {
      while (current.held) {
        await waitForRelease(current);
      }
      current.pending += 1;
      try {
        return await active(input, init);
      } finally {
        current.pending -= 1;
        notifyIdle(current);
      }
    }

    const response = await active(input, init);

    if (isSignOutPath(pathname)) {
      // La respuesta de signout ya borro la cookie: cualquier lectura que
      // salga a partir de aqui viaja sin ella y no puede resucitarla.
      releaseHold(current);
    }

    return response;
  }) as FetchLike;

  g.originalFetch = original;
  g.wrappedFetch = wrapped;
  g.installed = true;
  assignFetch(scope, wrapped);
  return true;
}

/** Devuelve el `fetch` original y limpia el estado de la compuerta. */
export function uninstallSessionTrafficGate(): void {
  const g = gate();
  if (g.installed && g.wrappedFetch) {
    const scope = globalThis as unknown as { fetch?: unknown };
    if (scope.fetch === g.wrappedFetch && g.originalFetch) {
      assignFetch(scope, g.originalFetch);
    }
  }
  releaseHold(g);
  g.originalFetch = null;
  g.wrappedFetch = null;
  g.installed = false;
  g.pending = 0;
  g.idleWaiters.splice(0, g.idleWaiters.length);
}

/**
 * Cierra la compuerta: las nuevas lecturas de sesion se encolan en vez de
 * salir a la red. Incluye un tope de seguridad para no dejar la app parada.
 */
export function holdSessionTraffic(): void {
  const g = gate();
  g.held = true;
  if (g.deadmanTimer !== null) clearTimeout(g.deadmanTimer);
  g.deadmanTimer = setTimeout(() => {
    g.deadmanTimer = null;
    releaseHold(g);
  }, MAX_HOLD_MS);
  unrefTimer(g.deadmanTimer);
}

/** Abre la compuerta y deja pasar las lecturas encoladas. Idempotente. */
export function releaseSessionTraffic(): void {
  releaseHold(gate());
}

export function isSessionTrafficHeld(): boolean {
  return gate().held;
}

/** Lecturas de sesion emitidas (o a punto de emitirse) que aun no terminan. */
export function pendingSessionTraffic(): number {
  return gate().pending;
}

/**
 * Resuelve cuando no queda ninguna lectura de sesion en vuelo. Es el paso que
 * impide que una respuesta enviada antes del signout llegue despues de el.
 */
export function waitForSessionTrafficIdle(
  timeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS
): Promise<void> {
  const g = gate();
  if (g.pending === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      const index = g.idleWaiters.indexOf(done);
      if (index >= 0) g.idleWaiters.splice(index, 1);
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    g.idleWaiters.push(done);
    timer = setTimeout(done, timeoutMs);
    unrefTimer(timer);
  });
}

// Instalacion automatica solo fuera de tests: en el navegador hay que cubrir
// `fetch` antes de la primera lectura de sesion para poder drenarla despues.
if (
  typeof window !== "undefined" &&
  typeof (globalThis as { fetch?: unknown }).fetch === "function" &&
  !isTestEnvironment()
) {
  installSessionTrafficGate();
}
