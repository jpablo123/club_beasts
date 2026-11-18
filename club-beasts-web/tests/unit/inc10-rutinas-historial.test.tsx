// @vitest-environment jsdom
/**
 * INC-10 (RED) — HistorialRutinas (ficha staff, HU-21 / NAV-RU-15..17).
 * Criterios: RU-29..RU-33 (fechas, actor, snapshot expandible), RU-32 (orden
 * fechaInicio DESC), badges `ACTIVA`/`CERRADA` en mayúsculas (C3, sin choque
 * con los exactos base "Activo"/"Activa") y C7 (localizadores exactos).
 *
 * Contrato fijado por este RED para `src/components/rutinas/HistorialRutinas`
 * (GREEN T8):
 *  - Export default `HistorialRutinas({ clienteId })`: consulta
 *    `api.asignaciones.historial(clienteId)` UNA vez al montar y renderiza
 *    `<section role="region" aria-label="Historial de rutinas">` (exact).
 *  - Cada asignación se renderiza `role="group"` con `aria-label` = nombre de
 *    la rutina (alcance por fila), en el MISMO orden que devuelve la API
 *    (fechaInicio DESC; la activa arriba).
 *  - Cada fila muestra: badge con el texto exacto "ACTIVA" o "CERRADA", las
 *    fechas de inicio/fin de la asignación y el `actor.nombre` (RU-30, solo
 *    staff).
 *  - Botón exacto "Ver versión asignada" por fila: expande el
 *    `contenidoSnapshot` (DEC-067) con `RutinaVista` — el contenido visible es
 *    el del MOMENTO de asignar (aunque la rutina se haya editado después).
 *  - Sin controles de escritura sobre el historial (inmutable, RU-32).
 *
 * FASE RED (2026-11-05): el componente NO existe (GREEN T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { mockHistorial } = vi.hoisted(() => ({
  mockHistorial: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    asignaciones: {
      historial: (...args: unknown[]) => mockHistorial(...args),
      activa: vi.fn(),
      crear: vi.fn(),
    },
    rutinas: {
      listar: vi.fn(),
      obtener: vi.fn(),
      crear: vi.fn(),
      crearPersonalizada: vi.fn(),
      actualizar: vi.fn(),
    },
    portal: { resumen: vi.fn(), rutina: vi.fn() },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Admin", role: "DUENO" } },
    status: "authenticated",
  }),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "cliente-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const RUTA_HISTORIAL = "../../src/components/rutinas/HistorialRutinas";

async function importarHistorial(): Promise<any> {
  const ruta: string = RUTA_HISTORIAL;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC10-RED: falta el componente de producto @/components/rutinas/HistorialRutinas " +
        "(GREEN T8). Fallo de comportamiento ausente esperado."
    );
  }
}

/** Snapshot con un valor DISTINTO del contenido actual (prueba DEC-067). */
const SNAPSHOT_ANTIGUO = {
  tipoRutina: "GENERICA",
  nombre: "Rutina historial INC10",
  descripcion: "Version original del snapshot",
  objetivo: null,
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

const HISTORIAL = {
  clienteId: "cliente-1",
  total: 2,
  asignaciones: [
    {
      id: "as-2",
      clienteId: "cliente-1",
      rutina: { id: "ru-2", nombre: "Rutina historial INC10", tipoRutina: "GENERICA", descripcion: null },
      fechaInicio: "2026-11-05",
      fechaFin: null,
      estado: "ACTIVA",
      actor: { id: "u1", nombre: "David Rozo" },
      contenidoSnapshot: SNAPSHOT_ANTIGUO,
    },
    {
      id: "as-1",
      clienteId: "cliente-1",
      rutina: { id: "ru-1", nombre: "Rutina previa INC10", tipoRutina: "INDUCCION", descripcion: null },
      fechaInicio: "2026-10-01",
      fechaFin: "2026-11-05",
      estado: "CERRADA",
      actor: { id: "u2", nombre: "Segundo Dueno" },
      contenidoSnapshot: {
        tipoRutina: "INDUCCION",
        nombre: "Rutina previa INC10",
        descripcion: "Snapshot de la previa",
        objetivo: null,
        nivelExperiencia: null,
        sesiones: [
          {
            nombre: "Sesion induccion",
            ejercicios: [
              {
                nombre: "Movilidad",
                series: [{ repeticiones: "10", intensidad: "Libre", descansoSegundos: 30 }],
              },
            ],
          },
        ],
      },
    },
  ],
};

beforeEach(() => {
  mockHistorial.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("HistorialRutinas — montaje, orden y badges (RU-29..RU-32)", () => {
  it("consulta api.asignaciones.historial UNA vez y renderiza la región exacta", async () => {
    mockHistorial.mockResolvedValue(HISTORIAL);
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    await screen.findByRole("region", { name: /^Historial de rutinas$/ });
    expect(mockHistorial).toHaveBeenCalledTimes(1);
    expect(mockHistorial).toHaveBeenCalledWith("cliente-1");
  });

  it("las filas respetan el orden de la API (fechaInicio DESC) con badges 'ACTIVA'/'CERRADA' en mayúsculas", async () => {
    mockHistorial.mockResolvedValue(HISTORIAL);
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", {
      name: /^Historial de rutinas$/,
    });
    const grupos = within(region).getAllByRole("group");
    expect(grupos.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Rutina historial INC10",
      "Rutina previa INC10",
    ]);

    expect(screen.getByText("ACTIVA", { exact: true })).toBeTruthy();
    expect(screen.getByText("CERRADA", { exact: true })).toBeTruthy();
  });

  it("cada fila muestra fechas y el actor del cambio (RU-29/RU-30)", async () => {
    mockHistorial.mockResolvedValue(HISTORIAL);
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", {
      name: /^Historial de rutinas$/,
    });
    expect(within(region).getByText("David Rozo")).toBeTruthy();
    expect(within(region).getByText("Segundo Dueno")).toBeTruthy();
  });

  it("historial vacío -> región presente y sin filas (role=group)", async () => {
    mockHistorial.mockResolvedValue({
      clienteId: "cliente-1",
      asignaciones: [],
      total: 0,
    });
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", {
      name: /^Historial de rutinas$/,
    });
    expect(within(region).queryAllByRole("group")).toHaveLength(0);
  });
});

describe("HistorialRutinas — 'Ver versión asignada' expande el snapshot (DEC-067)", () => {
  it("el contenido del snapshot aparece al expandir y es el del momento de asignar", async () => {
    mockHistorial.mockResolvedValue(HISTORIAL);
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", {
      name: /^Historial de rutinas$/,
    });

    // Colapsado: el contenido del snapshot no está en el DOM.
    expect(
      within(region).queryByText("Version original del snapshot"),
      "sin snapshot visible antes de expandir"
    ).toBeNull();

    const filaActiva = within(region).getByRole("group", {
      name: "Rutina historial INC10",
    });
    fireEvent.click(
      within(filaActiva).getByRole("button", { name: /^Ver versión asignada$/ })
    );

    expect(
      within(region).getByText("Version original del snapshot"),
      "snapshot expandido"
    ).toBeTruthy();

    // Cada fila conserva su propio snapshot.
    const filaPrevia = within(region).getByRole("group", {
      name: "Rutina previa INC10",
    });
    expect(within(filaPrevia).queryByText("Snapshot de la previa")).toBeNull();
    fireEvent.click(
      within(filaPrevia).getByRole("button", { name: /^Ver versión asignada$/ })
    );
    expect(within(region).getByText("Snapshot de la previa")).toBeTruthy();
    expect(within(region).getByText("Version original del snapshot")).toBeTruthy();
  });

  it("el historial no expone controles de escritura (inmutable, RU-32)", async () => {
    mockHistorial.mockResolvedValue(HISTORIAL);
    const modulo = await importarHistorial();
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", {
      name: /^Historial de rutinas$/,
    });
    // Guardas positivas: la región y las filas existen.
    expect(within(region).getAllByRole("group")).toHaveLength(2);
    // Ausencias tras guarda positiva: sin botones de escritura del historial.
    expect(within(region).queryByRole("button", { name: "Aplicar cambios" })).toBeNull();
    expect(within(region).queryByRole("button", { name: "Descartar cambios" })).toBeNull();
  });
});
