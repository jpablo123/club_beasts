/**
 * API Error Classification Unit Tests
 *
 * Tests que fetchApi clasifica correctamente los códigos de error del backend
 * en los kinds del frontend (ApiError.kind).
 *
 * Estrategia: mockear global.fetch y next-auth/react.getSession,
 * llamar a api.auth.login() y verificar el error lanzado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next-auth/react ANTES de importar api.ts
const mockGetSession = vi.fn();
vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

// Importar después del mock
import { api } from "../../src/lib/api.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetchResponse(
  status: number,
  body: Record<string, unknown>
): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

function mockNetworkError(): typeof fetch {
  return vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

beforeEach(() => {
  mockGetSession.mockResolvedValue({
    user: { apiToken: "test-token-123" },
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("API Error Classification", () => {
  describe("AUTH_TOKEN_EXPIRED → kind=session_expired", () => {
    it("clasifica AUTH_TOKEN_EXPIRED como session_expired", async () => {
      global.fetch = mockFetchResponse(401, {
        error: "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.",
        code: "AUTH_TOKEN_EXPIRED",
      });

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("session_expired");
        expect(err.code).toBe("AUTH_TOKEN_EXPIRED");
        expect(err.status).toBe(401);
      }
    });

    it("clasifica 401 sin code como session_expired", async () => {
      global.fetch = mockFetchResponse(401, {
        error: "No autorizado",
      });

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("session_expired");
        expect(err.status).toBe(401);
      }
    });
  });

  describe("AUTH_INVALID_CREDENTIALS → kind=invalid_credentials", () => {
    it("clasifica AUTH_INVALID_CREDENTIALS como invalid_credentials", async () => {
      global.fetch = mockFetchResponse(401, {
        error: "Credenciales inválidas",
        code: "AUTH_INVALID_CREDENTIALS",
      });

      try {
        await api.auth.login("test@test.com", "wrong");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("invalid_credentials");
        expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
        expect(err.status).toBe(401);
      }
    });
  });

  describe("AUTH_FORBIDDEN → kind=forbidden", () => {
    it("clasifica AUTH_FORBIDDEN como forbidden", async () => {
      global.fetch = mockFetchResponse(403, {
        error: "No tienes permisos para realizar esta acción.",
        code: "AUTH_FORBIDDEN",
      });

      try {
        await api.auth.resetPin("cliente-1", "1234");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("forbidden");
        expect(err.code).toBe("AUTH_FORBIDDEN");
        expect(err.status).toBe(403);
      }
    });

    it("clasifica 403 sin code como forbidden", async () => {
      global.fetch = mockFetchResponse(403, {
        error: "Prohibido",
      });

      try {
        await api.auth.resetPin("cliente-1", "1234");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("forbidden");
        expect(err.status).toBe(403);
      }
    });
  });

  describe("AUTH_CLIENTE_INACTIVO → no session_expired (INC04-R11)", () => {
    it("el 401 de cuenta inactiva no se clasifica como session_expired", async () => {
      // INC04-R11: el 401 generico de api.ts:199-200 dispararia
      // recoverSession en un login sin sesion; el code explicito debe
      // clasificarse ANTES del fallback 401.
      global.fetch = mockFetchResponse(401, {
        error: "La cuenta está inactiva. Contacte con recepción.",
        code: "AUTH_CLIENTE_INACTIVO",
      });

      try {
        await api.auth.loginCliente("9914000001", "1234");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).not.toBe("session_expired");
        expect(err.code).toBe("AUTH_CLIENTE_INACTIVO");
        expect(err.status).toBe(401);
        expect(err.message).toBe(
          "La cuenta está inactiva. Contacte con recepción."
        );
      }
    });
  });

  describe("Error de red → kind=network", () => {
    it("clasifica error de fetch como network", async () => {
      global.fetch = mockNetworkError();

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("network");
        expect(err.code).toBeUndefined();
        expect(err.status).toBeUndefined();
        expect(err.message).toContain("Error de red");
      }
    });
  });

  describe("Otros errores HTTP", () => {
    it("clasifica 400 como validation", async () => {
      global.fetch = mockFetchResponse(400, {
        error: "Email es requerido",
        code: "VALIDATION_ERROR",
      });

      try {
        await api.auth.login("", "");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("validation");
        expect(err.status).toBe(400);
      }
    });

    it("clasifica 500 como server", async () => {
      global.fetch = mockFetchResponse(500, {
        error: "Error interno del servidor",
      });

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.kind).toBe("server");
        expect(err.status).toBe(500);
      }
    });
  });

  describe("Preservación de status", () => {
    it("preserva el status code en el error", async () => {
      global.fetch = mockFetchResponse(422, {
        error: "Campo inválido",
      });

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.status).toBe(422);
      }
    });

    it("preserva el message del backend", async () => {
      global.fetch = mockFetchResponse(401, {
        error: "Mensaje personalizado del backend",
        code: "AUTH_INVALID_CREDENTIALS",
      });

      try {
        await api.auth.login("test@test.com", "wrong");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.message).toBe("Mensaje personalizado del backend");
      }
    });

    it("usa message por defecto cuando backend no envía error", async () => {
      global.fetch = mockFetchResponse(400, {});

      try {
        await api.auth.login("test@test.com", "pass");
        expect.fail("Debería haber lanzado un error");
      } catch (err: any) {
        expect(err.message).toBe("Error en la solicitud");
      }
    });
  });

  describe("Respuesta exitosa", () => {
    it("retorna data cuando la respuesta es exitosa", async () => {
      const responseData = { token: "jwt-token", user: { id: "1" } };
      global.fetch = mockFetchResponse(200, responseData);

      const result = await api.auth.login("test@test.com", "pass123");
      expect(result).toEqual(responseData);
    });
  });
});
