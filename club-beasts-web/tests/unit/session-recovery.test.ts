/**
 * INC00-AUTH-02 / INC00-AUTH-03 — coordinador de recuperacion de sesion
 * Incremento: INC-00-estabilizacion-fases-1-2 (cierre hallazgos B1 y B2)
 *
 * Reemplaza la version anterior de este archivo, que reimplementaba la logica
 * dentro del test (tautologica) en vez de importar `src`. Aqui se importa la
 * implementacion real y se cubre:
 *
 *  - AUTH-02: el destino de la recuperacion lleva `reason=session_expired` para
 *    que el login pueda mostrar el mensaje aprobado.
 *  - AUTH-03: login correcto segun rol, conservacion de la pantalla original y
 *    la carrera de doble navegacion (`resolveSessionExit` no compite con la
 *    recuperacion cuando ella ya esta manejando la salida).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

function installWindow(
  pathname: string,
  search = "",
  hash = ""
): { targets: string[] } {
  const targets: string[] = [];
  const location: Record<string, unknown> = { pathname, search, hash };
  let href = `${pathname}${search}${hash}`;
  Object.defineProperty(location, "href", {
    configurable: true,
    get: () => href,
    set: (value: string) => {
      href = value;
      targets.push(value);
    },
  });
  location.assign = (value: string) => {
    targets.push(value);
  };
  (globalThis as { window?: unknown }).window = { location };
  return { targets };
}

function removeWindow(): void {
  delete (globalThis as { window?: unknown }).window;
}

async function flushAsync(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

let mod: SessionRecoveryModule;

beforeEach(async () => {
  vi.resetModules();
  mockGetSession.mockReset();
  mockSignOut.mockReset();
  mockGetSession.mockResolvedValue(INTERNAL_SESSION);
  mockSignOut.mockResolvedValue(undefined);
  mod = await import("../../src/lib/session-recovery.js");
  removeWindow();
});

afterEach(() => {
  removeWindow();
  vi.clearAllMocks();
});

// ─── INC00-AUTH-03 login correcto segun tipo de sesion ──────────────────────

describe("login correcto segun el tipo de sesion (INC00-AUTH-03)", () => {
  it("CLIENTE -> /login-cliente", () => {
    expect(mod.loginRouteFor("CLIENTE")).toBe("/login-cliente");
  });

  it("DUENO y RECEPCIONISTA -> /login", () => {
    expect(mod.loginRouteFor("DUENO")).toBe("/login");
    expect(mod.loginRouteFor("RECEPCIONISTA")).toBe("/login");
  });

  it("sin rol -> /login", () => {
    expect(mod.loginRouteFor(undefined)).toBe("/login");
    expect(mod.loginRouteFor(null)).toBe("/login");
  });

  it("isLoginRoute reconoce ambas pantallas de login y su query", () => {
    expect(mod.isLoginRoute("/login")).toBe(true);
    expect(mod.isLoginRoute("/login?callbackUrl=%2Fclientes")).toBe(true);
    expect(mod.isLoginRoute("/login-cliente")).toBe(true);
    expect(mod.isLoginRoute("/clientes")).toBe(false);
    expect(mod.isLoginRoute("/portal")).toBe(false);
  });
});

// ─── Pantalla original (callbackUrl) ────────────────────────────────────────

describe("currentBrowserPath — pantalla original", () => {
  it("combina pathname, search y hash", () => {
    installWindow("/clientes/cliente-42", "?tab=membresias", "#top");
    expect(mod.currentBrowserPath()).toBe(
      "/clientes/cliente-42?tab=membresias#top"
    );
  });

  it("devuelve null fuera del navegador", () => {
    expect(mod.currentBrowserPath()).toBeNull();
  });
});

describe("buildLoginTarget — conserva la pantalla original y marca el motivo", () => {
  it("lleva callbackUrl con la pantalla original y reason=session_expired", () => {
    const target = mod.buildLoginTarget("DUENO", "/clientes/cliente-42");
    expect(target.startsWith("/login?")).toBe(true);
    expect(target).toContain("callbackUrl=%2Fclientes%2Fcliente-42");
    expect(target).toContain(APPROVED_SUFFIX);
  });

  it("la sesion CLIENTE sale hacia /login-cliente con la pantalla original", () => {
    const target = mod.buildLoginTarget("CLIENTE", "/portal");
    expect(target.startsWith("/login-cliente?")).toBe(true);
    expect(target).toContain("callbackUrl=%2Fportal");
    expect(target).toContain(APPROVED_SUFFIX);
  });

  it("sin pantalla original conserva el motivo para que el login muestre el aviso", () => {
    expect(mod.buildLoginTarget("DUENO", null)).toBe(
      `/login?${APPROVED_SUFFIX}`
    );
  });

  it("si ya esta en un login no genera un callbackUrl hacia el mismo login", () => {
    const target = mod.buildLoginTarget("DUENO", "/login?reason=session_expired");
    expect(target).toBe(`/login?${APPROVED_SUFFIX}`);
    expect(target).not.toContain("callbackUrl=");
  });
});

// ─── INC00-AUTH-02 el aviso llega al login ──────────────────────────────────

describe("INC00-AUTH-02 la recuperacion entrega reason=session_expired al login", () => {
  it("la navegacion de salida (signOut) incluye el motivo y la pantalla original", async () => {
    installWindow("/clientes/cliente-42");
    void mod.recoverSession("token-v1");
    await flushAsync();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const options = mockSignOut.mock.calls[0]?.[0] as { callbackUrl?: string };
    expect(options.callbackUrl).toMatch(/^\/login\?/);
    expect(options.callbackUrl).toContain("callbackUrl=%2Fclientes%2Fcliente-42");
    expect(options.callbackUrl).toContain(APPROVED_SUFFIX);
  });
});

// ─── INC00-AUTH-03 carrera: la pantalla no compite con la recuperacion ───────

describe("resolveSessionExit — salida de una pantalla protegida (carrera B2)", () => {
  it("si la recuperacion NO esta en curso, navega al login conservando la pantalla original", () => {
    installWindow("/clientes/cliente-7");
    expect(mod.isRecoveryInProgress()).toBe(false);

    const exit = mod.resolveSessionExit("/login");

    expect(exit).toBe(
      "/login?callbackUrl=%2Fclientes%2Fcliente-7&reason=session_expired"
    );
  });

  it("si la recuperacion YA esta en curso devuelve null: no compite ni pierde el callbackUrl", async () => {
    installWindow("/clientes/cliente-7");
    mockSignOut.mockReturnValue(new Promise(() => undefined)); // signOut pendiente

    void mod.recoverSession("token-v1");
    await flushAsync();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mod.isRecoveryInProgress()).toBe(true);
    expect(mod.resolveSessionExit("/login")).toBeNull();
    expect(mod.resolveSessionExit("/login-cliente")).toBeNull();
  });

  it("fuera del navegador y sin recuperacion en curso devuelve null (no lanza)", () => {
    expect(mod.resolveSessionExit("/login")).toBeNull();
  });
});

// ─── Single-flight (AUTH-01) sin reimplementar la logica ────────────────────

describe("single-flight de la recuperacion (INC00-AUTH-01)", () => {
  it("varias caidas concurrentes comparten UNA sola recuperacion", async () => {
    installWindow("/clientes/cliente-1");
    mockSignOut.mockReturnValue(new Promise(() => undefined)); // queda en vuelo

    // No se await: la recuperacion queda deliberadamente en curso (es el caso
    // que este test provoca); solo se espera a que llegue a signOut.
    void mod.recoverSession("token-v1");
    void mod.recoverSession("token-v1");
    void mod.recoverSession("token-v1");
    await flushAsync();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mod.isRecoveryInProgress()).toBe(true);
  });

  it("sin token de la peticion no se cierra ninguna sesion", async () => {
    installWindow("/clientes/cliente-1");

    await mod.recoverSession(null);
    await flushAsync();

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mod.isRecoveryInProgress()).toBe(false);
  });
});
