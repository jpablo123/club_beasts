// @vitest-environment jsdom
/**
 * INC-10 (RED) — RutinaVista (whitelist) y RutinaSection (ficha staff).
 * Criterios: RU-32/RU-30 (staff ve actor en el historial, nunca en la vista de
 * contenido), DEC-068 (estructura completa), DEC-070 (marcadores
 * SIN_RUTINA / OCULTA_POR_VIGENCIA), DEC-065 (solo DUENO edita/asigna),
 * C1 (montaje bajo demanda) y C7 (localizadores exactos).
 *
 * Contrato fijado por este RED (GREEN T8):
 *  - `RutinaVista({ rutina })` (export default, `src/components/rutinas/
 *    RutinaVista.tsx`): vista de SOLO LECTURA por WHITELIST — renderiza solo
 *    los campos de contenido del DTO (nombre, tipoRutina, descripcion,
 *    objetivo, nivelExperiencia, sesiones->ejercicios->series; para
 *    personalizada: informacionGeneral, diagnostico, macrociclos, tests,
 *    antropometria, analisisBiomecanico). `actor`, `actualizadoPor` y
 *    cualquier clave fuera de la whitelist NUNCA se renderizan (SEC-01/SEC-03).
 *  - Encabezados de sección exactos (SECCIONES_RUTINA_BASE / SECCIONES_RUTINA):
 *    base -> "Informacion general", "Sesiones y ejercicios"; personalizada ->
 *    "Informacion general", "Diagnostico", "Ciclos (macro-meso-micro)",
 *    "Evaluaciones".
 *  - `RutinaSection({ clienteId })` (export default, `src/components/rutinas/
 *    RutinaSection.tsx`): montaje bajo demanda (consulta
 *    `api.asignaciones.activa(clienteId)` UNA vez al montar); renderiza
 *    `<section role="region" aria-label="Rutina activa">` (exact).
 *    Estados (DEC-070): badge con el texto exacto "ACTIVA" | "SIN_RUTINA" |
 *    "OCULTA_POR_VIGENCIA" (staff con indicador; ocultación sin borrar).
 *    Con ACTIVA: botón "Ver versión asignada" (C3). Solo DUENO ve el botón
 *    "Asignar rutina"; RECEPCIONISTA no (DEC-065).
 *
 * FASE RED (2026-11-05): los componentes NO existen (GREEN T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockAsignacionesActiva, rolActual } = vi.hoisted(() => ({
  mockAsignacionesActiva: vi.fn(),
  rolActual: { valor: "DUENO" as string },
}));

vi.mock("@/lib/api", () => ({
  api: {
    asignaciones: {
      activa: (...args: unknown[]) => mockAsignacionesActiva(...args),
      historial: vi.fn(),
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
    data: { user: { name: "Admin", role: rolActual.valor } },
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

const RUTA_VISTA = "../../src/components/rutinas/RutinaVista";
const RUTA_SECCION = "../../src/components/rutinas/RutinaSection";

async function importarComponente(ruta: string, nombre: string): Promise<any> {
  const especificador: string = ruta;
  try {
    return await import(/* @vite-ignore */ especificador);
  } catch {
    throw new Error(
      `INC10-RED: falta el componente de producto @/components/rutinas/${nombre} ` +
        `(GREEN T8). Fallo de comportamiento ausente esperado.`
    );
  }
}

/** DTO base con claves de staff y una clave NO whitelist (para probar el filtro). */
const DTO_BASE = {
  id: "ru-1",
  tipoRutina: "GENERICA",
  nombre: "Rutina vista INC10",
  descripcion: "Descripcion visible",
  objetivo: "Objetivo visible",
  nivelExperiencia: "PRINCIPIANTE",
  sesiones: [
    {
      nombre: "Sesion fuerza A",
      dia: "lunes",
      ejercicios: [
        {
          nombre: "Press banca",
          series: [
            { repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90 },
          ],
        },
      ],
    },
  ],
  fechaActualizacion: "2026-11-05T10:00:00.000Z",
  actualizadoPor: { id: "u-staff", nombre: "Actualizado Prohibido" },
  actor: { id: "u-staff", nombre: "Nombre Actor Prohibido" },
  notasInternas: "SECRETO fuera de la whitelist",
};

const DTO_PERSONALIZADA = {
  id: "ru-2",
  tipoRutina: "PERSONALIZADA",
  nombre: "Rutina pers vista INC10",
  descripcion: null,
  informacionGeneral: {
    objetivoGeneral: "Ganar masa muscular",
    nivelExperiencia: "INTERMEDIO",
    fechaEvaluacion: "2026-01-01",
  },
  diagnostico: {
    diagnostico: "Buena postura general",
    restriccionesMedicas: null,
    lesionesPrevias: null,
    observacionesGenerales: null,
  },
  macrociclos: [
    {
      nombre: "Macro 1",
      fechaInicio: "2026-01-01",
      fechaFin: "2026-12-31",
      mesociclos: [
        {
          nombre: "Meso 1",
          fechaInicio: "2026-01-01",
          fechaFin: "2026-06-30",
          microciclos: [
            {
              nombre: "Micro 1",
              fechaInicio: "2026-01-01",
              fechaFin: "2026-01-31",
              sesiones: [
                {
                  nombre: "Sesion fuerza A",
                  ejercicios: [
                    {
                      nombre: "Sentadilla",
                      series: [
                        { repeticiones: "5", intensidad: "80% 1RM", descansoSegundos: 180 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  tests: [{ nombre: "1RM sentadilla", resultado: "100 kg", fecha: "2026-01-01" }],
  antropometria: [{ medida: "peso", valor: 75.5, unidad: "kg", fecha: "2026-01-01" }],
  analisisBiomecanico: [{ zona: "RODILLA", hallazgo: "LEVE", fecha: "2026-01-01" }],
  actor: { id: "u-staff", nombre: "Nombre Actor Prohibido" },
  actualizadoPor: { id: "u-staff", nombre: "Actualizado Prohibido" },
};

beforeEach(() => {
  mockAsignacionesActiva.mockReset();
  rolActual.valor = "DUENO";
});

afterEach(() => {
  cleanup();
});

// ─── RutinaVista — render por whitelist (sin actor) ──────────────────────────

describe("RutinaVista — whitelist de contenido (SEC-01/SEC-03)", () => {
  it("renderiza el contenido base y jamás actor/actualizadoPor ni claves fuera de la whitelist", async () => {
    const modulo = await importarComponente(RUTA_VISTA, "RutinaVista");
    render(<modulo.default rutina={DTO_BASE} />);

    // Contenido whitelist visible.
    expect(screen.getByText("Rutina vista INC10")).toBeTruthy();
    expect(screen.getByText("Descripcion visible")).toBeTruthy();
    expect(screen.getByText("Sesion fuerza A")).toBeTruthy();
    expect(screen.getByText("Press banca")).toBeTruthy();
    expect(screen.getByText("8-12")).toBeTruthy();

    // Encabezados de sección exactos B1/B2.
    expect(screen.getByRole("heading", { name: /^Informacion general$/ })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /^Sesiones y ejercicios$/ })
    ).toBeTruthy();

    // FUERA de la whitelist: nunca en el DOM.
    expect(screen.queryByText("Nombre Actor Prohibido")).toBeNull();
    expect(screen.queryByText("Actualizado Prohibido")).toBeNull();
    expect(screen.queryByText("SECRETO fuera de la whitelist")).toBeNull();
  });

  it("personalizada: secciones P1/P2/P3/P5 con el árbol completo (DEC-068) y evaluaciones", async () => {
    const modulo = await importarComponente(RUTA_VISTA, "RutinaVista");
    render(<modulo.default rutina={DTO_PERSONALIZADA} />);

    for (const encabezado of [
      "Informacion general",
      "Diagnostico",
      "Ciclos (macro-meso-micro)",
      "Evaluaciones",
    ]) {
      expect(screen.getByRole("heading", { name: new RegExp("^" + encabezado + "$") }), encabezado).toBeTruthy();
    }
    expect(screen.getByText("Macro 1")).toBeTruthy();
    expect(screen.getByText("Micro 1")).toBeTruthy();
    expect(screen.getByText("Sentadilla")).toBeTruthy();
    expect(screen.getByText("1RM sentadilla")).toBeTruthy();
    expect(screen.getByText("Buena postura general")).toBeTruthy();

    expect(screen.queryByText("Nombre Actor Prohibido")).toBeNull();
    expect(screen.queryByText("Actualizado Prohibido")).toBeNull();
  });
});

// ─── RutinaSection — montaje bajo demanda + estados + permisos ───────────────

describe("RutinaSection — montaje bajo demanda (C1)", () => {
  it("consulta api.asignaciones.activa UNA vez con el clienteId al montar", async () => {
    mockAsignacionesActiva.mockResolvedValue({
      clienteId: "cliente-1",
      asignacion: null,
      estado: "SIN_RUTINA",
    });
    const modulo = await importarComponente(RUTA_SECCION, "RutinaSection");
    render(<modulo.default clienteId="cliente-1" />);

    await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(mockAsignacionesActiva).toHaveBeenCalledTimes(1);
    expect(mockAsignacionesActiva).toHaveBeenCalledWith("cliente-1");
  });

  it("estado ACTIVA -> badge 'ACTIVA' y botón 'Ver versión asignada'", async () => {
    mockAsignacionesActiva.mockResolvedValue({
      clienteId: "cliente-1",
      asignacion: {
        id: "as-1",
        clienteId: "cliente-1",
        rutina: { id: "ru-1", nombre: "Rutina vista INC10", tipoRutina: "GENERICA", descripcion: null },
        fechaInicio: "2026-11-01",
        fechaFin: null,
        estado: "ACTIVA",
        actor: { id: "u1", nombre: "David Rozo" },
        contenidoSnapshot: DTO_BASE,
      },
      estado: "ACTIVA",
    });
    const modulo = await importarComponente(RUTA_SECCION, "RutinaSection");
    render(<modulo.default clienteId="cliente-1" />);

    const region = await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(region).toBeTruthy();
    expect(screen.getByText("ACTIVA", { exact: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Ver versión asignada$/ })).toBeTruthy();
    // El actor es visible a staff en la ficha (RU-30).
    expect(screen.getByText("David Rozo")).toBeTruthy();
  });

  it("estado SIN_RUTINA -> indicador exacto 'SIN_RUTINA' sin 'Ver versión asignada'", async () => {
    mockAsignacionesActiva.mockResolvedValue({
      clienteId: "cliente-1",
      asignacion: null,
      estado: "SIN_RUTINA",
    });
    const modulo = await importarComponente(RUTA_SECCION, "RutinaSection");
    render(<modulo.default clienteId="cliente-1" />);

    await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(screen.getByText("SIN_RUTINA", { exact: true })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver versión asignada" })).toBeNull();
  });

  it("estado OCULTA_POR_VIGENCIA -> indicador exacto con la asignación intacta (DEC-066)", async () => {
    mockAsignacionesActiva.mockResolvedValue({
      clienteId: "cliente-1",
      asignacion: {
        id: "as-2",
        clienteId: "cliente-1",
        rutina: { id: "ru-2", nombre: "Rutina pers vista INC10", tipoRutina: "PERSONALIZADA", descripcion: null },
        fechaInicio: "2026-11-01",
        fechaFin: null,
        estado: "ACTIVA",
        actor: { id: "u1", nombre: "David Rozo" },
        contenidoSnapshot: DTO_PERSONALIZADA,
      },
      estado: "OCULTA_POR_VIGENCIA",
    });
    const modulo = await importarComponente(RUTA_SECCION, "RutinaSection");
    render(<modulo.default clienteId="cliente-1" />);

    await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(screen.getByText("OCULTA_POR_VIGENCIA", { exact: true })).toBeTruthy();
    expect(screen.getByText("David Rozo")).toBeTruthy();
  });
});

describe("RutinaSection — permisos (DEC-065: solo DUENO edita/asigna)", () => {
  it("DUENO ve el botón 'Asignar rutina'; RECEPCIONISTA no", async () => {
    mockAsignacionesActiva.mockResolvedValue({
      clienteId: "cliente-1",
      asignacion: null,
      estado: "SIN_RUTINA",
    });
    const modulo = await importarComponente(RUTA_SECCION, "RutinaSection");

    rolActual.valor = "DUENO";
    const { unmount } = render(<modulo.default clienteId="cliente-1" />);
    await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(screen.getByRole("button", { name: /^Asignar rutina$/ })).toBeTruthy();
    unmount();

    rolActual.valor = "RECEPCIONISTA";
    render(<modulo.default clienteId="cliente-1" />);
    await screen.findByRole("region", { name: /^Rutina activa$/ });
    expect(screen.queryByRole("button", { name: "Asignar rutina" })).toBeNull();
  });
});
