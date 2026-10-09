/**
 * INC00-AUTH-01..07 — Recuperacion centralizada de sesion desde el cliente HTTP
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 5 - pruebas RED)
 *
 * GAP-004 / GAP-005: la recuperacion de sesion no esta conectada de forma
 * central al 401 del cliente HTTP y no hay proteccion contra 401 concurrentes
 * o tardios. Estas pruebas documentan el comportamiento esperado aunque hoy
 * fallen (modo SOLO RED). Ningun archivo de src/ se modifica.
 *
 * Canal de observacion (contrato que la Tarea 6 - frontend-developer debe
 * implementar; ver fase2.md "Coordinador de recuperacion"):
 *  - "Se disparo la recuperacion": `signOut` de next-auth/react es invocado
 *    (cierra sesion y limpia datos privados en el navegador).
 *  - "Destino de recuperacion": `signOut({ callbackUrl })` o la asignacion de
 *    `window.location` (href/assign) hacia el login correcto segun el tipo de
 *    sesion, incluyendo la pantalla original como retorno.
 *  - "Mensaje aprobado": el ApiError entregado al llamador conserva el
 *    mensaje aprobado (fase2.md / contrato API de AUTH_TOKEN_EXPIRED).
 *  - "Sesion conservada": no hay `signOut` y las siguientes peticiones siguen
 *    enviando el mismo `Authorization: Bearer`.
 *
 * Los criterios negativos (AUTH-04, AUTH-05, AUTH-06, AUTH-07) terminan con un
 * CONTROL POSITIVO que demuestra que el espia de `signOut` esta conectado: sin
 * recuperacion implementada el control falla, evitando aprobaciones vacias.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ApiError } from "../../src/lib/api.js";

const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// ─── Constantes de dominio ──────────────────────────────────────────────────

const APPROVED_SESSION_MESSAGE =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";
const FORBIDDEN_MESSAGE = "No tienes permisos para realizar esta acción.";
const INVALID_CREDENTIALS_MESSAGE = "Credenciales inválidas";

const INTERNAL_SESSION = {
  user: { id: "user-1", name: "David Rozo", role: "DUENO", apiToken: "token-dueno-v1" },
};
const NEW_INTERNAL_SESSION = {
  user: { id: "user-1", name: "David Rozo", role: "DUENO", apiToken: "token-dueno-v2" },
};
const CLIENT_SESSION = {
  user: { id: "cliente-1", name: "Carlos Rodriguez", role: "CLIENTE", apiToken: "token-cliente-v1" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

function response(status: number, body: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function fetchResponding(status: number, body: Record<string, unknown>): typeof fetch {
  return vi.fn().mockResolvedValue(response(status, body)) as unknown as typeof fetch;
}

function expiredTokenFetch(): typeof fetch {
  return fetchResponding(401, {
    error: APPROVED_SESSION_MESSAGE,
    code: "AUTH_TOKEN_EXPIRED",
  });
}

function expiredTokenResponseBody() {
  return response(401, {
    error: APPROVED_SESSION_MESSAGE,
    code: "AUTH_TOKEN_EXPIRED",
  });
}

async function flushAsync(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function installWindow(pathname: string): void {
  redirectTargets = [];
  const location: Record<string, unknown> = { pathname, hash: "", search: "" };
  let href = pathname;
  Object.defineProperty(location, "href", {
    configurable: true,
    get: () => href,
    set: (value: string) => {
      href = value;
      redirectTargets.push(value);
    },
  });
  location.assign = (value: string) => {
    redirectTargets.push(value);
  };
  (globalThis as { window?: unknown }).window = { location };
}

function removeWindow(): void {
  delete (globalThis as { window?: unknown }).window;
}

/** Destino observado de la recuperacion: callbackUrl de signOut o window.location. */
function recoveryTarget(): string | null {
  const firstCall = mockSignOut.mock.calls[0]?.[0] as
    | { callbackUrl?: unknown }
    | undefined;
  if (firstCall && typeof firstCall.callbackUrl === "string") {
    return firstCall.callbackUrl;
  }
  if (redirectTargets.length > 0) {
    return redirectTargets[0];
  }
  return null;
}

/** Authorization enviado en la llamada indexada del mock de fetch activo. */
function authorizationHeader(callIndex: number): string | undefined {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const init = fetchMock.mock.calls[callIndex]?.[1] as
    | { headers?: Record<string, string> }
    | undefined;
  return init?.headers?.Authorization;
}

/**
 * Control positivo del espia: demuestra que la recuperacion centralizada si
 * esta conectada ante un 401 AUTH_TOKEN_EXPIRED. Si falla, los criterios
 * negativos de este archivo no son evidencia util.
 */
async function expectRecoveryChannelArmed(): Promise<void> {
  global.fetch = expiredTokenFetch();
  await api.clientes.list().catch(() => undefined);
  await flushAsync();
  expect(
    mockSignOut,
    "control: la recuperacion centralizada debe dispararse ante 401 AUTH_TOKEN_EXPIRED (INC00-AUTH-01)"
  ).toHaveBeenCalledTimes(1);
}

// ─── Setup ──────────────────────────────────────────────────────────────────

let api: typeof import("../../src/lib/api.js").api;
let redirectTargets: string[];

beforeEach(async () => {
  vi.resetModules();
  ({ api } = await import("../../src/lib/api.js"));

  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(INTERNAL_SESSION);
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue(undefined);

  installWindow("/clientes/cliente-1");
  global.fetch = originalFetch;
});

afterEach(() => {
  removeWindow();
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

// ─── INC00-AUTH-01 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-01 JWT vencido -> una sola recuperacion centralizada", () => {
  it("INC00-AUTH-01 varias peticiones que reciben 401 AUTH_TOKEN_EXPIRED producen UNA sola recuperacion", async () => {
    global.fetch = expiredTokenFetch();

    const settled = await Promise.allSettled([
      api.clientes.list(),
      api.clientes.get("cliente-1"),
      api.membresias.list("cliente-1"),
    ]);

    for (const result of settled) {
      expect(result.status).toBe("rejected");
      const reason = (result as PromiseRejectedResult).reason as ApiError;
      expect(reason.kind).toBe("session_expired");
      expect(reason.code).toBe("AUTH_TOKEN_EXPIRED");
      expect(reason.status).toBe(401);
    }

    await flushAsync();
    expect(
      mockSignOut,
      "INC00-AUTH-01: tres 401 concurrentes deben desencadenar una unica recuperacion centralizada"
    ).toHaveBeenCalledTimes(1);
  });

  it("INC00-AUTH-01 el error entregado al llamador sigue siendo session_expired tras el 401", async () => {
    global.fetch = expiredTokenFetch();

    const err = (await api.clientes.get("cliente-1").catch((e: unknown) => e)) as ApiError;

    expect(err.kind).toBe("session_expired");
    expect(err.code).toBe("AUTH_TOKEN_EXPIRED");
    expect(err.status).toBe(401);
  });
});

// ─── INC00-AUTH-02 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-02 la recuperacion cierra sesion, limpia datos privados y muestra el mensaje aprobado", () => {
  it("INC00-AUTH-02 el 401 AUTH_TOKEN_EXPIRED cierra la sesion (signOut) una sola vez", async () => {
    global.fetch = expiredTokenFetch();

    await api.clientes.get("cliente-1").catch(() => undefined);
    await flushAsync();

    expect(
      mockSignOut,
      "INC00-AUTH-02: la recuperacion debe cerrar sesion y limpiar datos privados via signOut"
    ).toHaveBeenCalledTimes(1);
  });

  it("INC00-AUTH-02 el error que llega a la UI conserva exactamente el mensaje aprobado", async () => {
    global.fetch = expiredTokenFetch();

    const err = (await api.clientes.get("cliente-1").catch((e: unknown) => e)) as ApiError;

    expect(err.kind).toBe("session_expired");
    expect(err.message).toBe(APPROVED_SESSION_MESSAGE);
    expect(err.message).not.toBe("Error en la solicitud");
  });
});

// ─── INC00-AUTH-03 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-03 el usuario vuelve al login correcto y puede regresar a la pantalla original", () => {
  it("INC00-AUTH-03 sesion interna (DUENO) redirige a /login conservando la pantalla original", async () => {
    installWindow("/clientes/cliente-42");
    global.fetch = expiredTokenFetch();

    await api.clientes.get("cliente-42").catch(() => undefined);
    await flushAsync();

    const target = recoveryTarget();
    expect(
      target,
      "INC00-AUTH-03: la recuperacion debe indicar el destino de login (callbackUrl o window.location)"
    ).not.toBeNull();
    expect(target).toMatch(/^\/login(\?|$)/);
    expect(decodeURIComponent(target as string)).toContain("/clientes/cliente-42");
  });

  it("INC00-AUTH-03 sesion CLIENTE redirige a /login-cliente conservando la pantalla original", async () => {
    mockGetSession.mockResolvedValue(CLIENT_SESSION);
    installWindow("/portal/membresia");
    global.fetch = expiredTokenFetch();

    await api.membresias.list("cliente-1").catch(() => undefined);
    await flushAsync();

    const target = recoveryTarget();
    expect(
      target,
      "INC00-AUTH-03: la sesion de cliente debe volver a /login-cliente"
    ).not.toBeNull();
    expect(target).toMatch(/^\/login-cliente(\?|$)/);
    expect(decodeURIComponent(target as string)).toContain("/portal/membresia");
  });
});

// ─── INC00-AUTH-04 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-04 credenciales invalidas no disparan logout global", () => {
  it("INC00-AUTH-04 AUTH_INVALID_CREDENTIALS devuelve invalid_credentials sin cerrar la sesion", async () => {
    mockGetSession.mockResolvedValueOnce(null); // pantalla de login, sin sesion activa
    global.fetch = fetchResponding(401, {
      error: INVALID_CREDENTIALS_MESSAGE,
      code: "AUTH_INVALID_CREDENTIALS",
    });

    const err = (await api.auth
      .login("admin@clubbeasts.com", "wrong-password")
      .catch((e: unknown) => e)) as ApiError;

    expect(err.kind).toBe("invalid_credentials");
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(err.status).toBe(401);
    expect(err.message).toBe(INVALID_CREDENTIALS_MESSAGE);

    await flushAsync();
    expect(
      mockSignOut,
      "INC00-AUTH-04: un fallo de credenciales no debe disparar el logout global"
    ).not.toHaveBeenCalled();

    await expectRecoveryChannelArmed();
  });
});

// ─── INC00-AUTH-05 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-05 el 403 conserva la sesion y muestra mensaje de permiso insuficiente", () => {
  it("INC00-AUTH-05 AUTH_FORBIDDEN devuelve forbidden con mensaje de permiso y la sesion sigue autenticada", async () => {
    global.fetch = fetchResponding(403, {
      error: FORBIDDEN_MESSAGE,
      code: "AUTH_FORBIDDEN",
    });

    const err = (await api.auth
      .resetPin("cliente-1", "5678")
      .catch((e: unknown) => e)) as ApiError;

    expect(err.kind).toBe("forbidden");
    expect(err.code).toBe("AUTH_FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.message).toBe(FORBIDDEN_MESSAGE);
    expect(err.kind).not.toBe("session_expired");

    await flushAsync();
    expect(
      mockSignOut,
      "INC00-AUTH-05: un 403 no debe cerrar la sesion"
    ).not.toHaveBeenCalled();

    // La sesion sigue viva: la siguiente peticion viaja con el mismo token.
    global.fetch = fetchResponding(200, { clientes: [], total: 0 });
    const data = (await api.clientes.list()) as { total: number };
    expect(data.total).toBe(0);
    expect(authorizationHeader(0)).toBe("Bearer token-dueno-v1");

    await expectRecoveryChannelArmed();
  });
});

// ─── INC00-AUTH-06 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-06 el error de red conserva la sesion y ofrece reintento", () => {
  it("INC00-AUTH-06 un fallo de red devuelve kind=network con mensaje de indisponibilidad y la sesion sobrevive al reintento", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;

    const err = (await api.clientes.list().catch((e: unknown) => e)) as ApiError;

    expect(err.kind).toBe("network");
    expect(err.code).toBeUndefined();
    expect(err.status).toBeUndefined();
    expect(err.message).toContain("Error de red");

    await flushAsync();
    expect(
      mockSignOut,
      "INC00-AUTH-06: un error de red no debe cerrar la sesion"
    ).not.toHaveBeenCalled();

    // Reintento con la misma sesion: la peticion siguiente viaja autenticada y triunfa.
    global.fetch = fetchResponding(200, { clientes: [{ id: "cliente-1" }], total: 1 });
    const data = (await api.clientes.list()) as { total: number };
    expect(data.total).toBe(1);
    expect(authorizationHeader(0)).toBe("Bearer token-dueno-v1");

    await expectRecoveryChannelArmed();
  });
});

// ─── INC00-AUTH-07 ──────────────────────────────────────────────────────────

describe("INC00-AUTH-07 un 401 tardio de una sesion anterior no cierra la sesion nueva", () => {
  it("INC00-AUTH-07 el 401 de la sesion vieja no cierra la sesion nueva; el 401 de la sesion nueva si recupera", async () => {
    let resolveStale!: (value: unknown) => void;
    const staleResponse = new Promise((resolve) => {
      resolveStale = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(staleResponse)
      .mockResolvedValue(expiredTokenResponseBody()) as unknown as typeof fetch;
    global.fetch = fetchMock;

    mockGetSession.mockReset();
    mockGetSession.mockResolvedValueOnce(INTERNAL_SESSION); // peticion con el token viejo
    mockGetSession.mockResolvedValue(NEW_INTERNAL_SESSION); // sesion nueva a partir de ahora

    // Peticion lanzada con la sesion anterior; su respuesta aun no llega.
    const staleRequest = api.clientes.list();

    // Mientras esta en vuelo, el usuario inicia sesion de nuevo (token distinto).
    resolveStale(expiredTokenResponseBody());

    const staleErr = (await staleRequest.catch((e: unknown) => e)) as ApiError;
    expect(staleErr.kind).toBe("session_expired");
    await flushAsync();

    expect(
      mockSignOut,
      "INC00-AUTH-07: el 401 tardio de la sesion anterior no debe cerrar la sesion nueva"
    ).not.toHaveBeenCalled();
    expect(authorizationHeader(0)).toBe("Bearer token-dueno-v1");

    // Control positivo: la sesion nueva si dispara recuperacion ante su propio 401.
    const freshErr = (await api.clientes.list().catch((e: unknown) => e)) as ApiError;
    expect(freshErr.kind).toBe("session_expired");
    expect(authorizationHeader(1)).toBe("Bearer token-dueno-v2");
    await flushAsync();
    expect(
      mockSignOut,
      "control: la sesion nueva si debe recuperarse ante su propio 401 (INC00-AUTH-01)"
    ).toHaveBeenCalledTimes(1);
  });
});
