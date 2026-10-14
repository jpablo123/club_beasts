// @vitest-environment jsdom
/**
 * INC-03 — Tarea 13 (RED): registro de ingreso por sede en recepcion (HU-30).
 * Criterios: INC03-ING-01..09, INC03-ING-11 (UI), INC03-VEN-04 (feedback 403).
 *
 * FASE RED: la pantalla de recepcion no existe (`src/app/recepcion/page`).
 * Mismo patron que recepcion-consulta.test.tsx: import dinamico con ruta en
 * variable -> tsc compila y cada test falla en runtime con mensaje de
 * contrato claro. El GREEN crea la pagina consumiendo
 * `api.recepcion.registrarIngreso()` y `api.recepcion.listarIngresos()`.
 *
 * Contrato fijado por este RED (para el GREEN):
 *  - `api.recepcion.registrarIngreso({ cedula, sedeId })` -> POST /recepcion/ingresos.
 *  - `api.recepcion.listarIngresos(cedula)` -> GET /recepcion/ingresos?cedula=...
 *  - Formulario: input `aria-label="Cedula de ingreso"`,
 *    select `aria-label="Sede de ingreso"` (opciones de @/lib/sedes),
 *    boton "Registrar ingreso" y boton "Ver historial".
 *  - Exito (201): feedback en `role="status"` que confirma el ingreso.
 *  - 403 INGRESO_NO_PERMITIDO / 404 / 400: mensaje del backend en `role="alert"`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";

const { mockIngreso, mockListarIngresos } = vi.hoisted(() => ({
  mockIngreso: vi.fn(),
  mockListarIngresos: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    recepcion: {
      registrarIngreso: (...args: unknown[]) => mockIngreso(...args),
      listarIngresos: (...args: unknown[]) => mockListarIngresos(...args),
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Rita Recepcion", role: "RECEPCIONISTA" } },
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

/**
 * El modulo de la pantalla de recepcion aun no existe (RED de INC-03).
 * Import dinamico con ruta en variable: tsc compila sin resolver el
 * specifier y el fallo ocurre por test, en runtime, con mensaje de contrato.
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

// Fixture del ingreso registrado (ingresoResponseSchema, HU-30).
const INGRESO_201 = {
  id: "ingreso-1",
  clienteId: "cliente-1",
  cedula: "1234567890",
  fecha: "2026-06-15",
  hora: "07:15:00",
  sede: { id: "sede-2", nombre: "Sede Secundaria" },
  registradoPor: { id: "user-2", nombre: "Rita Recepcion" },
  createdAt: "2026-06-15T12:15:00.000Z",
};

// Fixture del historial (ingresosListResponseSchema, HU-30).
const LISTA_INGRESOS = {
  ingresos: [
    INGRESO_201,
    {
      ...INGRESO_201,
      id: "ingreso-2",
      fecha: "2026-06-14",
      hora: "18:30:00",
      sede: { id: "sede-1", nombre: "Sede Principal" },
    },
  ],
  total: 2,
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

async function renderIngreso() {
  const Pagina = await cargarPaginaRecepcion();
  render(<Pagina />);
  return {
    inputCedula: await screen.findByLabelText("Cedula de ingreso"),
    selectSede: await screen.findByLabelText("Sede de ingreso"),
  };
}

beforeEach(() => {
  mockIngreso.mockReset();
  mockListarIngresos.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("INC03-ING-01: registrar ingreso envia {cedula, sedeId} y confirma el 201", () => {
  it("al enviar el formulario llama a registrarIngreso con la cedula y la sede elegida y muestra feedback de exito", async () => {
    mockIngreso.mockResolvedValue(INGRESO_201);
    const { inputCedula, selectSede } = await renderIngreso();

    fireEvent.change(inputCedula, { target: { value: "1234567890" } });
    fireEvent.change(selectSede, { target: { value: "sede-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));

    await waitFor(() =>
      expect(mockIngreso).toHaveBeenCalledWith({
        cedula: "1234567890",
        sedeId: "sede-2",
      })
    );
    // Feedback de exito del 201 en una zona accesible role="status".
    const exito = await screen.findByRole("status");
    expect(exito.textContent).toContain("Ingreso registrado");
  });
});

describe("INC03-ING-04 (INC03-VEN-04) / ING-06 / ING-07: feedback de errores del backend", () => {
  it("un 403 INGRESO_NO_PERMITIDO (vencida) muestra el mensaje del backend en role=alert", async () => {
    mockIngreso.mockRejectedValue(
      apiError(
        "La membresía no está habilitada para ingresar (vencida el 2026-05-31)",
        "INGRESO_NO_PERMITIDO",
        403
      )
    );
    const { inputCedula } = await renderIngreso();

    fireEvent.change(inputCedula, { target: { value: "1234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(
      "La membresía no está habilitada para ingresar (vencida el 2026-05-31)"
    );
    // Sin exito visible cuando el backend deniega el ingreso.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("un 404 NOT_FOUND ('Cliente no encontrado') se muestra en role=alert sin confirmacion", async () => {
    mockIngreso.mockRejectedValue(
      apiError("Cliente no encontrado", "NOT_FOUND", 404)
    );
    const { inputCedula } = await renderIngreso();

    fireEvent.change(inputCedula, { target: { value: "99999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Cliente no encontrado");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("un 400 VALIDATION_ERROR de cedula se muestra en role=alert con el mensaje exacto", async () => {
    mockIngreso.mockRejectedValue(
      apiError(
        "Cédula debe ser numérica de 6 a 10 dígitos",
        "VALIDATION_ERROR",
        400
      )
    );
    const { inputCedula } = await renderIngreso();

    fireEvent.change(inputCedula, { target: { value: "ABC" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(
      "Cédula debe ser numérica de 6 a 10 dígitos"
    );
  });
});

describe("INC03-ING-05: historial de ingresos del cliente", () => {
  it("'Ver historial' consulta el listado por cedula y pinta los ingresos", async () => {
    mockListarIngresos.mockResolvedValue(LISTA_INGRESOS);
    const { inputCedula } = await renderIngreso();

    fireEvent.change(inputCedula, { target: { value: "1234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));

    await waitFor(() =>
      expect(mockListarIngresos).toHaveBeenCalledWith("1234567890")
    );
    // Ambas filas del fixture se pintan (orden desc: hoy 07:15 y ayer 18:30).
    expect(await screen.findByText("07:15:00")).toBeTruthy();
    expect(await screen.findByText("18:30:00")).toBeTruthy();
  });
});
