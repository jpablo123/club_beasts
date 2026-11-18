// @vitest-environment jsdom
/**
 * INC-10 (RED) — Página /portal/rutina (HU-26 / C8 / NAV-RU-18..22).
 * Criterios: RU-36..RU-41 (self-only, DEC-066 ocultación, DEC-068 estructura
 * completa, RU-39 mensaje), gate DEC-060 (resumen ANTES de consultar;
 * `sinMembresiaActiva` -> `/portal` SIN datos) y guarda PIN obligatoria
 * (`debeCambiarPin` -> `/portal`, sin bypass, patrón INC-09).
 *
 * Contrato fijado por este RED para `src/app/portal/rutina/page.tsx` (GREEN T8):
 *  - Export default de página cliente; entrada = link "Mi rutina activa"
 *    dentro de la card "Mi Rutina" de `/portal` (1 único heading "Mi Rutina"
 *    en /portal; el acceso es link, no heading — C3 invariante).
 *  - Renderiza `<section role="region" aria-label="Mi rutina">` (exact).
 *  - Orden de datos (DEC-060, patrón `/portal/anamnesis`): 1) sesión; 2) guarda
 *    PIN (`debeCambiarPin` -> `router.replace("/portal")`, sin llamar a la
 *    API); 3) `api.portal.resumen()`; si `sinMembresiaActiva` ->
 *    `router.replace("/portal")` y `api.portal.rutina` JAMÁS se llama; 4) solo
 *    entonces `api.portal.rutina()`.
 *  - `SIN_RUTINA_MENSAJE` ("No tienes una rutina activa") en `role="alert"`
 *    (C8) cuando la respuesta es `{ mensaje }`.
 *  - Vista de solo lectura: sin botones de escritura (RU-40).
 *
 * FASE RED (2026-11-05): la página NO existe (GREEN T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockResumen, mockPortalRutina, mockReplace, sesion } = vi.hoisted(() => ({
  mockResumen: vi.fn(),
  mockPortalRutina: vi.fn(),
  mockReplace: vi.fn(),
  sesion: {
    autenticado: true,
    debeCambiarPin: false,
  },
}));

vi.mock("@/lib/api", () => ({
  api: {
    portal: {
      resumen: (...args: unknown[]) => mockResumen(...args),
      rutina: (...args: unknown[]) => mockPortalRutina(...args),
    },
    asignaciones: { activa: vi.fn(), historial: vi.fn(), crear: vi.fn() },
    rutinas: {
      listar: vi.fn(),
      obtener: vi.fn(),
      crear: vi.fn(),
      crearPersonalizada: vi.fn(),
      actualizar: vi.fn(),
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () =>
    sesion.autenticado
      ? {
          data: {
            user: {
              name: "Cliente",
              role: "CLIENTE",
              debeCambiarPin: sesion.debeCambiarPin,
            },
          },
          status: "authenticated",
        }
      : { data: null, status: "unauthenticated" },
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn() }),
  useParams: () => ({}),
}));

const RUTA_PAGINA = "../../src/app/portal/rutina/page";

async function importarPagina(): Promise<any> {
  const ruta: string = RUTA_PAGINA;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC10-RED: falta la página de producto @/app/portal/rutina/page " +
        "(GREEN T8). Fallo de comportamiento ausente esperado."
    );
  }
}

const RUTINA_VISIBLE = {
  tipoRutina: "GENERICA",
  asignacionId: "as-1",
  fechaInicio: "2026-11-01",
  nombre: "Rutina portal INC10",
  descripcion: "Descripcion del snapshot",
  objetivo: "Objetivo del snapshot",
  nivelExperiencia: "PRINCIPIANTE",
  sesiones: [
    {
      nombre: "Sesion fuerza A",
      ejercicios: [
        {
          nombre: "Press banca",
          series: [{ repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90 }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  mockResumen.mockReset();
  mockPortalRutina.mockReset();
  mockReplace.mockClear();
  sesion.autenticado = true;
  sesion.debeCambiarPin = false;
});

afterEach(() => {
  cleanup();
});

describe("portal/rutina — gate DEC-060 (resumen ANTES de consultar)", () => {
  it("sinMembresiaActiva -> replace('/portal') y api.portal.rutina JAMÁS se llama", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: true });
    const pagina = await importarPagina();
    render(<pagina.default />);

    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/portal");
    });
    expect(mockResumen).toHaveBeenCalledTimes(1);
    expect(mockPortalRutina, "sin datos con membresía inactiva").not.toHaveBeenCalled();
  });

  it("con servicio vigente consulta api.portal.rutina y renderiza la región 'Mi rutina'", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: false });
    mockPortalRutina.mockResolvedValue(RUTINA_VISIBLE);
    const pagina = await importarPagina();
    render(<pagina.default />);

    const region = await screen.findByRole("region", { name: /^Mi rutina$/ });
    expect(region).toBeTruthy();
    expect(mockPortalRutina).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Rutina portal INC10")).toBeTruthy();
    expect(screen.getByText("Sesion fuerza A")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("portal/rutina — SIN_RUTINA (RU-39/C8)", () => {
  it("'No tienes una rutina activa' en role=alert con el literal exacto", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: false });
    mockPortalRutina.mockResolvedValue({
      mensaje: "No tienes una rutina activa",
    });
    const pagina = await importarPagina();
    render(<pagina.default />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe("No tienes una rutina activa");
  });
});

describe("portal/rutina — guarda PIN obligatoria (sin bypass)", () => {
  it("debeCambiarPin -> replace('/portal') sin consultar resumen ni rutina", async () => {
    sesion.debeCambiarPin = true;
    const pagina = await importarPagina();
    render(<pagina.default />);

    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/portal");
    });
    expect(mockResumen, "sin datos con PIN pendiente").not.toHaveBeenCalled();
    expect(mockPortalRutina).not.toHaveBeenCalled();
  });
});

describe("portal/rutina — solo lectura (RU-40)", () => {
  it("la vista no presenta botones de escritura", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: false });
    mockPortalRutina.mockResolvedValue(RUTINA_VISIBLE);
    const pagina = await importarPagina();
    render(<pagina.default />);

    await screen.findByRole("region", { name: /^Mi rutina$/ });
    // Guardas positivas: región y contenido existen.
    expect(screen.getByText("Rutina portal INC10")).toBeTruthy();
    // Ausencias tras guarda positiva (C7: sin substrings prohibidos).
    expect(screen.queryByRole("button", { name: "Aplicar cambios" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descartar cambios" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Modificar rutina" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Asignar rutina" })).toBeNull();
  });
});
