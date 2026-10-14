// @vitest-environment jsdom
/**
 * INC-03 — Tarea 13 (RED): estado real del portal del cliente.
 * Criterios: INC03-POR-01..04, INC03-POR-06, INC03-VEN-02..04, CONF-04.
 *
 * FASE RED: estos tests definen el contrato del portal con datos REALES de
 * `GET /portal/resumen` (spec INC-03, endpoint #1, schema HU-25-schemas.ts).
 * Hoy `src/app/portal/page.tsx:122` hardcodea "Activo" y nunca consume
 * `api.portal.resumen`: los tests fallan de forma granular (elementos no
 * encontrados / mock no llamado) hasta que el GREEN conecte la pagina al
 * resumen. La base existente (148 tests) no se toca.
 *
 * Contrato fijado por este RED (para el GREEN):
 *  - La pagina consume `api.portal.resumen()` (metodo nuevo del cliente API).
 *  - Etiquetas CONF-04: ACTIVA->"Activo", VENCIDA->"Vencido",
 *    PROGRAMADA->"Programado", CONGELADO->"Congelado", SIN_VIGENCIA->"Sin vigencia".
 *  - `fechaVencimiento` en formato YYYY-MM-DD (HU25-C03).
 *  - Rango de congelacion `{fechaInicio, fechaFin}` solo si existe (HU25-C04).
 *  - Con `estadoAccesoGym === "VENCIDA"` la UI muestra un indicador "sin acceso"
 *    (DEC-026) y NUNCA la palabra "Activo".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { mockResumen } = vi.hoisted(() => ({
  mockResumen: vi.fn(),
}));

// Mock del cliente API: el portal debe consumir api.portal.resumen()
// (metodo inexistente hoy; lo define el contrato #1 de INC-03).
vi.mock("@/lib/api", () => ({
  api: {
    portal: {
      resumen: (...args: unknown[]) => mockResumen(...args),
    },
  },
}));

// Sesion CLIENTE con nombre DISTINTO al del resumen para que las aserciones
// de nombre sean inequivocas (el resumen es la fuente, no la sesion).
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { name: "Cliente Portal", role: "CLIENTE", debeCambiarPin: false },
    },
    status: "authenticated",
    update: vi.fn(),
  }),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import PortalPage from "@/app/portal/page";

// Fixture base del resumen del portal (portalResumenResponseSchema, HU-25).
// congelacion: null tambien se prueba en el happy path: la pagina debe
// tolerar el null sin romper el render (HU25-C04).
const RESUMEN_ACTIVA = {
  cliente: {
    id: "cliente-1",
    nombres: "Ana Maria",
    apellidos: "Perez Gomez",
    cedula: "1234567890",
    sede: { id: "sede-1", nombre: "Sede Principal" },
  },
  estadoAccesoGym: "ACTIVA",
  fechaVencimiento: "2026-12-31",
  congelacion: null,
  fechaActual: "2026-06-15",
};

beforeEach(() => {
  mockResumen.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("INC03-POR-01/02 (INC03-VEN-03): el portal pinta los datos reales del resumen", () => {
  it("muestra nombre completo, cedula, sede y el estado calculado por el backend (ACTIVA -> Activo)", async () => {
    mockResumen.mockResolvedValue(RESUMEN_ACTIVA);

    render(<PortalPage />);

    await waitFor(() => expect(mockResumen).toHaveBeenCalledTimes(1));
    // La identidad viene del resumen (no de la sesion): nombre completo del cliente.
    expect(await screen.findByText("Ana Maria Perez Gomez")).toBeTruthy();
    expect(await screen.findByText("1234567890")).toBeTruthy();
    expect(await screen.findByText("Sede Principal")).toBeTruthy();
    // Etiqueta CONF-04 para ACTIVA.
    expect(await screen.findByText("Activo")).toBeTruthy();
  });

  it("VENCIDA se muestra como 'Vencido' y nunca como 'Activo'", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "VENCIDA",
      fechaVencimiento: "2026-05-31",
    });

    render(<PortalPage />);

    expect(await screen.findByText("Vencido")).toBeTruthy();
    expect(screen.queryByText("Activo")).toBeNull();
  });

  it("PROGRAMADA se muestra como 'Programado' (CONF-04)", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "PROGRAMADA",
      fechaVencimiento: "2026-07-01",
    });

    render(<PortalPage />);

    expect(await screen.findByText("Programado")).toBeTruthy();
    expect(screen.queryByText("Activo")).toBeNull();
  });

  it("CONGELADO se muestra como 'Congelado' (CONF-04)", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "CONGELADO",
      congelacion: { fechaInicio: "2026-06-10", fechaFin: "2026-06-20" },
    });

    render(<PortalPage />);

    expect(await screen.findByText("Congelado")).toBeTruthy();
    expect(screen.queryByText("Activo")).toBeNull();
  });
});

describe("INC03-POR-06: cliente sin membresia nunca se muestra como Activo", () => {
  it("SIN_VIGENCIA se muestra como 'Sin vigencia', con fecha nula y sin la palabra 'Activo'", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "SIN_VIGENCIA",
      fechaVencimiento: null,
    });

    render(<PortalPage />);

    expect(await screen.findByText("Sin vigencia")).toBeTruthy();
    expect(screen.queryByText("Activo")).toBeNull();
    // Sin vigencia no hay fecha de vencimiento que mostrar.
    expect(screen.queryByText("2026-12-31")).toBeNull();
  });
});

describe("INC03-POR-03/04: fechas de vencimiento y congelacion", () => {
  it("muestra la fecha de vencimiento en formato YYYY-MM-DD (HU25-C03)", async () => {
    mockResumen.mockResolvedValue(RESUMEN_ACTIVA);

    render(<PortalPage />);

    expect(await screen.findByText("2026-12-31")).toBeTruthy();
  });

  it("con congelacion vigente muestra el rango {fechaInicio, fechaFin} (HU25-C04)", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "CONGELADO",
      congelacion: { fechaInicio: "2026-06-10", fechaFin: "2026-06-20" },
    });

    render(<PortalPage />);

    expect(await screen.findByText("2026-06-10")).toBeTruthy();
    expect(await screen.findByText("2026-06-20")).toBeTruthy();
  });
});

describe("INC03-VEN-04 / DEC-026: el portal deniega el acceso al servicio vencido", () => {
  it("con estadoAccesoGym VENCIDA el portal muestra un indicador de 'sin acceso'", async () => {
    mockResumen.mockResolvedValue({
      ...RESUMEN_ACTIVA,
      estadoAccesoGym: "VENCIDA",
      fechaVencimiento: "2026-05-31",
    });

    render(<PortalPage />);

    expect(await screen.findByText(/sin acceso/i)).toBeTruthy();
  });
});
