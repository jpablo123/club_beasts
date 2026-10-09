/**
 * INC00-AUTH-01 / GAP-009 — compuerta de trafico de sesion
 * Incremento: INC-00-estabilizacion-fases-1-2
 *
 * Motivo (causa raiz del E2E `sesion-vencida.spec.ts`): Auth.js re-firma y
 * re-emite la cookie de sesion en CADA respuesta de `GET /api/auth/session`.
 * Si una lectura sigue en vuelo cuando `POST /api/auth/signout` borra la
 * cookie, la respuesta tardia la vuelve a crear, el middleware vuelve a dar
 * por valida la sesion y el navegador rebota entre /login y /clientes.
 *
 * Estas pruebas fijan el contrato que `src/lib/session-traffic.ts` debe
 * cumplir para que la recuperacion pueda garantizar:
 *
 *  1. Ninguna lectura de sesion nueva sale a la red mientras la compuerta
 *     esta cerrada (se encola, no se emite).
 *  2. `waitForSessionTrafficIdle()` no resuelve hasta que terminan las
 *     lecturas YA en vuelo (ninguna respuesta tardia puede resucitar la
 *     cookie despues del signout).
 *  3. La respuesta de `signout` abre la compuerta sola: en ese punto la
 *     cookie ya esta borrada y cualquier lectura posterior es inocua.
 *  4. El trafico que no es de sesion nunca se retiene.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  installSessionTrafficGate,
  uninstallSessionTrafficGate,
  holdSessionTraffic,
  releaseSessionTraffic,
  isSessionTrafficHeld,
  pendingSessionTraffic,
  waitForSessionTrafficIdle,
} from "../../src/lib/session-traffic.js";

const SESSION_URL = "http://localhost:3000/api/auth/session";
const SIGNOUT_URL = "http://localhost:3000/api/auth/signout";
const API_URL = "http://localhost:3001/clientes?page=1";

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

/** fetch que no resuelve hasta que el test lo indique: controla el orden real. */
function createManualFetch(): {
  fetch: typeof fetch;
  calls: PendingCall[];
} {
  const calls: PendingCall[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    return new Promise<Response>((resolve) => {
      calls.push({
        url,
        settle: (body = {}) => resolve(okResponse(body)),
      });
    });
  }) as unknown as typeof fetch;
  return { fetch: fetchMock, calls };
}

function sessionCalls(calls: PendingCall[]): PendingCall[] {
  return calls.filter((call) => call.url.includes("/api/auth/session"));
}

async function flush(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const realFetch = globalThis.fetch;
let manual: ReturnType<typeof createManualFetch>;

beforeEach(() => {
  manual = createManualFetch();
  globalThis.fetch = manual.fetch;
  expect(installSessionTrafficGate(), "la compuerta debe instalarse en el test").toBe(true);
});

afterEach(() => {
  releaseSessionTraffic();
  uninstallSessionTrafficGate();
  globalThis.fetch = realFetch;
  vi.clearAllMocks();
});

describe("encolar lecturas de sesion mientras la compuerta esta cerrada", () => {
  it("una lectura de sesion emitida con la compuerta cerrada NO llega a la red hasta abrirla", async () => {
    holdSessionTraffic();
    expect(isSessionTrafficHeld()).toBe(true);

    let settled = false;
    const read = fetch(SESSION_URL).then(() => {
      settled = true;
    });

    await flush();
    expect(
      sessionCalls(manual.calls),
      "con la compuerta cerrada no debe salir ninguna lectura de sesion"
    ).toHaveLength(0);
    expect(settled).toBe(false);
    expect(
      pendingSessionTraffic(),
      "una lectura encolada no cuenta como en vuelo"
    ).toBe(0);

    releaseSessionTraffic();
    await flush();

    expect(sessionCalls(manual.calls)).toHaveLength(1);
    manual.calls[0].settle({ user: null });
    await read;
    expect(settled).toBe(true);
  });

  it("las peticiones que no son de sesion atraviesan la compuerta sin retenerse", async () => {
    holdSessionTraffic();

    const request = fetch(API_URL);
    await flush();

    expect(
      manual.calls,
      "el trafico de la API no debe bloquearse por la recuperacion de sesion"
    ).toHaveLength(1);

    manual.calls[0].settle({ clientes: [], total: 0 });
    await expect(request).resolves.toBeDefined();
    expect(isSessionTrafficHeld()).toBe(true);
  });
});

describe("esperar a que terminen las lecturas ya en vuelo", () => {
  it("waitForSessionTrafficIdle no resuelve mientras haya una lectura de sesion sin terminar", async () => {
    const inflight = fetch(SESSION_URL);
    await flush();
    expect(sessionCalls(manual.calls)).toHaveLength(1);
    expect(pendingSessionTraffic()).toBe(1);

    holdSessionTraffic();

    let idle = false;
    void waitForSessionTrafficIdle().then(() => {
      idle = true;
    });

    await flush();
    expect(
      idle,
      "no puede darse por terminado el trafico con una lectura en vuelo"
    ).toBe(false);

    manual.calls[0].settle({ user: { role: "DUENO" } });
    await inflight;
    await flush();

    expect(idle).toBe(true);
    expect(pendingSessionTraffic()).toBe(0);
  });

  it("waitForSessionTrafficIdle resuelve de inmediato si no hay nada en vuelo", async () => {
    holdSessionTraffic();
    await expect(waitForSessionTrafficIdle()).resolves.toBeUndefined();
  });
});

describe("apertura de la compuerta al cerrar la sesion", () => {
  it("la respuesta de signout abre la compuerta: la cookie ya quedo borrada", async () => {
    holdSessionTraffic();
    expect(isSessionTrafficHeld()).toBe(true);

    const signout = fetch(SIGNOUT_URL);
    await flush();
    expect(manual.calls).toHaveLength(1);
    expect(
      isSessionTrafficHeld(),
      "la peticion de signout no debe quedar retenida por la propia compuerta"
    ).toBe(true);

    manual.calls[0].settle({ url: "/login" });
    await signout;

    expect(
      isSessionTrafficHeld(),
      "al recibir la respuesta de signout la cookie ya esta borrada y el trafico puede seguir"
    ).toBe(false);
  });

  it("releaseSessionTraffic es idempotente y despierta a las lecturas encoladas", async () => {
    holdSessionTraffic();
    holdSessionTraffic();
    const read = fetch(SESSION_URL);
    releaseSessionTraffic();
    releaseSessionTraffic();

    await flush();
    expect(isSessionTrafficHeld()).toBe(false);
    expect(sessionCalls(manual.calls)).toHaveLength(1);
    manual.calls[0].settle({});
    await read;
  });
});
