// @vitest-environment jsdom
/**
 * INC-03 — Tarea 13 (RED): consulta por cedula en recepcion (HU-29).
 * Criterios: INC03-REC-01..09, INC03-POR-05 (guard de rol), DEC-028.
 *
 * FASE RED: la pantalla de recepcion no existe (`src/app/recepcion/page`).
 * El import dinamico con ruta en variable compila bajo tsc (sin resolucion
 * estatica) y hace fallar CADA test en runtime con un mensaje de contrato
 * claro, en lugar de romper la coleccion de la suite completa (mejora sobre
 * el precedente INC-00 de "suites sin compilar"). El GREEN crea la pagina
 * consumiendo `api.recepcion.consulta()` y los tests pasan sin editarse.
 *
 * Contrato fijado por este RED (para el GREEN):
 *  - `api.recepcion.consulta(cedula)` -> GET /recepcion/consulta?cedula=...
 *  - Formulario: input `aria-label="Cedula de consulta"`, boton "Consultar".
 *  - La respuesta pinta: nombreCompleto, cedula, sede, etiqueta CONF-04 del
 *    estadoAccesoGym, fechaVencimiento (YYYY-MM-DD), rango de congelacion,
 *    ultimoIngreso (fecha/hora/sede) y las alertas (DEC-028).
 *  - Errores 400/404: el mensaje del backend se muestra en `role="alert"`.
 *  - Un CLIENTE no ve el formulario (defensa en profundidad del middleware).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";

const { mockConsulta } = vi.hoisted(() => ({
  mockConsulta: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    recepcion: {
      consulta: (...args: unknown[]) => mockConsulta(...args),
    },
  },
}));

let roleActual = "RECEPCIONISTA";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: roleActual
      ? { user: { name: "Rita Recepcion", role: roleActual } }
      : null,
    status: roleActual ? "authenticated" : "unauthenticated",
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

/**
 * El modulo de la pantalla de recepcion aun no existe (RED de INC-03).
 * Import dinamico con ruta en variable: tsc no resuelve estaticamente el
 * specifier (compila sin errores) y el fallo ocurre por test, en runtime,
 * con el mensaje de contrato de abajo.
 */
async function cargarPaginaRecepcion(): Promise<ComponentType> {
  const ruta = "@/app/recepcion/page";
  try {
    const mod = (await import(/* @vite-ignore */ ruta)) as {
      default: ComponentType;
    };
    return mod.default;
  } catch (err) {
    throw new Error(
      `Contrato INC-03: falta la pantalla de recepcion en ${ruta}. ` +
        `Causa: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// Fixture base de la consulta (consultaRecepcionResponseSchema, HU-29).
const CONSULTA_ACTIVA = {
  id: "cliente-1",
  nombreCompleto: "Ana Maria Perez Gomez",
  cedula: "1234567890",
  sede: { id: "sede-1", nombre: "Sede Principal" },
  foto: null,
  estadoAccesoGym: "ACTIVA",
  fechaVencimiento: "2026-12-31",
  congelacion: null,
  ultimoIngreso: {
    fecha: "2026-06-14",
    hora: "18:30:00",
    sede: { id: "sede-1", nombre: "Sede Principal" },
  },
  alertas: [],
  fechaActual: "2026-06-15",
};

function apiError(message: string, code: string, status: number) {
  const err = new Error(message) as Error & {
    code?: string;
    status?: number;
    kind?: string;
  };
  err.code = code;
  err.status = status;
  err.kind = status === 403 ? "forbidden" : "validation";
  return err;
}

async function renderConsultaYBuscar(cedula: string) {
  const Pagina = await cargarPaginaRecepcion();
  render(<Pagina />);
  fireEvent.change(await screen.findByLabelText("Cedula de consulta"), {
    target: { value: cedula },
  });
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
}

beforeEach(() => {
  roleActual = "RECEPCIONISTA";
  mockConsulta.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("INC03-REC-01..04/09: la consulta pinta identidad, estado, vencimiento, congelacion y ultimo ingreso", () => {
  it("consulta por cedula valida: pinta nombreCompleto, cedula, sede, estado, fecha y ultimoIngreso", async () => {
    mockConsulta.mockResolvedValue(CONSULTA_ACTIVA);

    await renderConsultaYBuscar("1234567890");

    await waitFor(() =>
      expect(mockConsulta).toHaveBeenCalledWith("1234567890")
    );
    // REC-01: identidad.
    expect(await screen.findByText("Ana Maria Perez Gomez")).toBeTruthy();
    expect(await screen.findByText("1234567890")).toBeTruthy();
    expect(screen.getByText("Sede Principal")).toBeTruthy();
    // REC-02: estado real (CONF-04: ACTIVA -> "Activo").
    expect(await screen.findByText("Activo")).toBeTruthy();
    // REC-03: fecha de vencimiento YYYY-MM-DD.
    expect(await screen.findByText("2026-12-31")).toBeTruthy();
    // REC-04: ultimo ingreso (fecha y hora).
    expect(await screen.findByText("2026-06-14")).toBeTruthy();
    expect(await screen.findByText("18:30:00")).toBeTruthy();
  });

  it("REC-03: con estado CONGELADO muestra el rango de congelacion", async () => {
    mockConsulta.mockResolvedValue({
      ...CONSULTA_ACTIVA,
      estadoAccesoGym: "CONGELADO",
      congelacion: { fechaInicio: "2026-06-10", fechaFin: "2026-06-20" },
    });

    await renderConsultaYBuscar("1234567890");

    expect(await screen.findByText("Congelado")).toBeTruthy();
    expect(await screen.findByText("2026-06-10")).toBeTruthy();
    expect(await screen.findByText("2026-06-20")).toBeTruthy();
  });

  it("VENCIDA se muestra como 'Vencido' y nunca como 'Activo' (INC03-VEN-03)", async () => {
    mockConsulta.mockResolvedValue({
      ...CONSULTA_ACTIVA,
      estadoAccesoGym: "VENCIDA",
      fechaVencimiento: "2026-05-31",
    });

    await renderConsultaYBuscar("1234567890");

    expect(await screen.findByText("Vencido")).toBeTruthy();
    expect(screen.queryByText("Activo")).toBeNull();
  });
});

describe("INC03-REC-05 / DEC-028: alertas derivadas del estado", () => {
  it("pinta las alertas ESTADO_CLIENTE y MEMBRESIA_VENCIDA con sus mensajes exactos", async () => {
    mockConsulta.mockResolvedValue({
      ...CONSULTA_ACTIVA,
      estadoAccesoGym: "VENCIDA",
      fechaVencimiento: "2026-05-31",
      alertas: [
        {
          codigo: "ESTADO_CLIENTE",
          mensaje: "El cliente tiene estado SUSPENDIDO",
        },
        {
          codigo: "MEMBRESIA_VENCIDA",
          mensaje: "La membresía venció el 2026-05-31",
        },
      ],
    });

    await renderConsultaYBuscar("1234567890");

    expect(
      await screen.findByText("El cliente tiene estado SUSPENDIDO")
    ).toBeTruthy();
    expect(
      await screen.findByText("La membresía venció el 2026-05-31")
    ).toBeTruthy();
  });
});

describe("INC03-REC-06/07: mensajes de error del backend", () => {
  it("un 400 VALIDATION_ERROR de cedula se muestra en role=alert con el mensaje exacto", async () => {
    mockConsulta.mockRejectedValue(
      apiError(
        "Cédula debe ser numérica de 6 a 10 dígitos",
        "VALIDATION_ERROR",
        400
      )
    );

    await renderConsultaYBuscar("ABC");

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(
      "Cédula debe ser numérica de 6 a 10 dígitos"
    );
  });

  it("un 404 NOT_FOUND ('Cliente no encontrado') se muestra en role=alert", async () => {
    mockConsulta.mockRejectedValue(
      apiError("Cliente no encontrado", "NOT_FOUND", 404)
    );

    await renderConsultaYBuscar("99999999");

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Cliente no encontrado");
  });
});

describe("INC03-REC-08 / INC03-POR-05: guard de rol de la pantalla", () => {
  it("un CLIENTE no ve el formulario de consulta de recepcion", async () => {
    roleActual = "CLIENTE";

    const Pagina = await cargarPaginaRecepcion();
    render(<Pagina />);

    // Defensa en profundidad: ademas del middleware, la pagina no pinta
    // herramientas de recepcion para un rol CLIENTE.
    await waitFor(() =>
      expect(screen.queryByLabelText("Cedula de consulta")).toBeNull()
    );
    expect(mockConsulta).not.toHaveBeenCalled();
  });
});
