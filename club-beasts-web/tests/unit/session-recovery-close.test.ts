/**
 * INC00-AUTH-01 / INC00-AUTH-02 — la sesion se cierra DE VERDAD antes de navegar
 * Incremento: INC-00-estabilizacion-fases-1-2 (cierre GAP-009)
 *
 * El E2E `tests/e2e/sesion-vencida.spec.ts` fallaba porque Auth.js re-emite la
 * cookie en cada respuesta de `GET /api/auth/session`: con una lectura en
 * vuelo, la respuesta tardia revivia la sesion justo despues del signout y el
 * navegador quedaba con cookie pero en /login (o rebotando a /clientes).
 *
 * Aqui se fija el orden obligatorio de la recuperacion:
 *
 *  1. Cerrar la compuerta de trafico de sesion y ESPERAR a que terminen las
 *     lecturas ya en vuelo.
 *  2. Firmar la salida con `redirect: false` (la navegacion es responsabilidad
 *     de la recuperacion, nunca del proveedor de auth).
 *  3. Confirmar con `GET /api/auth/session` que ya no hay sesion.
 *  4. Recien entonces navegar al login correcto conservando el callbackUrl.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  installSessionTrafficGate,
  uninstallSessionTrafficGate,
  releaseSessionTraffic,
  pendingSessionTraffic,
} from "../../src/lib/session-traffic.js";

const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

type SessionRecoveryModule = typeof import("../../src/lib/session-recovery.js");

const INTERNAL_SESSION = {
  user: { id: "u1", name: "David Rozo", role: "DUENO", apiToken: "token-v1" },
};

const APPROVED_SUFFIX = "reason=session_expired";

type PendingCall = {
  url: string;
  settle: (body?: Record<string, unknown>) => void;
};

function okResponse(body: Record<string, unknown>): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function createManualFetch(): { fetch: typeof fetch; calls: PendingCall[] } {
  const calls: PendingCall[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    return new Promise<Response>((resolve) => {
      calls.push({ url, settle: (body = {}) => resolve(okResponse(body)) });
    });
  }) as unknown as typeof fetch;
  return { fetch: fetchMock, calls };
}

function sessionCalls(calls: PendingCall[]): PendingCall[] {
  return calls.filter((call) => call.url.includes("/api/auth/session"));
}

async function flush(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Ventana de navegador con `location.href` observable (patron de los tests existentes). */
function installWindow(pathname: string): { targets: string[] } {
  const targets: string[] = [];
  const location: Record<string, unknown> = { pathname, search: "", hash: "" };
  let href = pathname;
  Object.defineProperty(location, "href", {
    configurable: true,
    get: () => href,
    set: (value: string) => {
      href = value;
      targets.push(value);
    },
  });
  (globalThis as { window?: unknown }).window = { location };
  return { targets };
}

function removeWindow(): void {
  delete (globalThis as { window?: unknown }).window;
}

let mod: SessionRecoveryModule;
let manual: ReturnType<typeof createManualFetch>;
const realFetch = globalThis.fetch;

beforeEach(async () => {
  vi.resetModules();
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(INTERNAL_SESSION);
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue(undefined);

  manual = createManualFetch();
  globalThis.fetch = manual.fetch;
  installSessionTrafficGate();

  mod = await import("../../src/lib/session-recovery.js");
  removeWindow();
});

afterEach(() => {
  releaseSessionTraffic();
  uninstallSessionTrafficGate();
  globalThis.fetch = realFetch;
  removeWindow();
  vi.clearAllMocks();
});

describe("orden de cierre de la sesion (GAP-009)", () => {
  it("firma la salida con redirect:false y el destino conserva la pantalla original (AUTH-03)", async () => {
    installWindow("/clientes/cliente-42");

    const recovery = mod.recoverSession("token-v1");
    await flush();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const options = mockSignOut.mock.calls[0]?.[0] as {
      callbackUrl?: string;
      redirect?: boolean;
    };
    expect(
      options.redirect,
      "la navegacion no puede quedar en manos del proveedor de auth: hay que confirmar antes"
    ).toBe(false);
    expect(options.callbackUrl).toMatch(/^\/login\?/);
    expect(options.callbackUrl).toContain("callbackUrl=%2Fclientes%2Fcliente-42");
    expect(options.callbackUrl).toContain(APPROVED_SUFFIX);

    // La confirmacion sigue en vuelo: se cierra para no dejar promesas colgadas.
    await flush();
    sessionCalls(manual.calls).forEach((call) => call.settle({}));
    await recovery;
  });

  it("no navega hasta confirmar que GET /api/auth/session ya no devuelve sesion", async () => {
    const { targets } = installWindow("/clientes");

    const recovery = mod.recoverSession("token-v1");
    await flush();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(
      targets,
      "firmada la salida, la confirmacion debe ir a la red antes de navegar"
    ).toEqual([]);

    const confirmacion = sessionCalls(manual.calls);
    expect(confirmacion).toHaveLength(1);

    // La sesion sigue viva en la respuesta: todavia no se navega.
    confirmacion[0].settle({ user: { role: "DUENO" } });
    await flush();
    expect(
      targets,
      "mientras la confirmacion diga que hay sesion no se puede navegar"
    ).toEqual([]);

    const reintento = sessionCalls(manual.calls);
    expect(
      reintento.length,
      "si la sesion sobrevivio al signout hay que comprobarla de nuevo"
    ).toBeGreaterThan(1);
    reintento[reintento.length - 1].settle({});

    await recovery;

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatch(/^\/login\?/);
    expect(targets[0]).toContain("callbackUrl=%2Fclientes");
    expect(targets[0]).toContain(APPROVED_SUFFIX);
  });

  it("espera a que terminen las lecturas de sesion en vuelo antes de firmar la salida", async () => {
    installWindow("/clientes");

    // Lectura emitida por otra parte de la app y aun sin respuesta.
    const enVuelo = fetch("http://localhost:3000/api/auth/session");
    await flush();
    expect(sessionCalls(manual.calls)).toHaveLength(1);
    expect(pendingSessionTraffic()).toBe(1);

    const recovery = mod.recoverSession("token-v1");
    await flush();

    expect(
      mockSignOut,
      "firmar la salida con una lectura en vuelo permitiria que su respuesta resucitara la cookie"
    ).not.toHaveBeenCalled();

    manual.calls[0].settle({ user: { role: "DUENO" } });
    await enVuelo;
    await flush();

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    sessionCalls(manual.calls)
      .slice(1)
      .forEach((call) => call.settle({}));
    await recovery;
  });

  it("mientras dura la salida, nuevas lecturas de sesion no llegan a la red", async () => {
    installWindow("/clientes");
    mockSignOut.mockReturnValue(new Promise(() => undefined));

    void mod.recoverSession("token-v1");
    await flush();

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    const encolada = fetch("http://localhost:3000/api/auth/session");
    await flush();

    expect(
      sessionCalls(manual.calls),
      "ninguna lectura de sesion debe salir mientras la compuerta este cerrada"
    ).toHaveLength(0);

    releaseSessionTraffic();
    await flush();
    expect(sessionCalls(manual.calls)).toHaveLength(1);

    manual.calls[0].settle({});
    await encolada;
  });
});
