// @vitest-environment jsdom
/**
 * INC-03 — Tarea 13 (RED): creacion rapida de cliente desde recepcion (HU-31).
 * Criterios: INC03-RAP-01..07, DEC-031..033.
 *
 * FASE RED: la pantalla de recepcion no existe (`src/app/recepcion/page`).
 * Mismo patron que recepcion-consulta.test.tsx: import dinamico con ruta en
 * variable -> tsc compila y cada test falla en runtime con mensaje de
 * contrato claro. El GREEN crea la seccion de alta rapida consumiendo
 * `api.recepcion.crearClienteRapido()` y `api.clientes.update()`.
 *
 * Contrato fijado por este RED (para el GREEN):
 *  - `api.recepcion.crearClienteRapido(payload)` -> POST /recepcion/clientes-rapidos.
 *  - Formulario minimo (DEC-031): inputs `aria-label="Cedula rapida"`,
 *    `"Nombres rapido"`, `"Apellidos rapido"`, `"Telefono rapido"`; boton
 *    "Crear cliente rapido"; SIN campo obligatorio de sede (sedeId opcional).
 *  - Tras el 201 con `perfilPendiente: true` se muestra la marca
 *    "Perfil pendiente" (DEC-032), el estado "Nuevo" y el creador (RAP-06).
 *  - Completar perfil (DEC-033): input `aria-label="Email para completar perfil"`
 *    + boton "Completar perfil" -> `api.clientes.update(id, { email })` y la
 *    marca se limpia.
 *  - Errores 400/409: mensaje del backend en `role="alert"`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";

const { mockCrear, mockUpdate } = vi.hoisted(() => ({
  mockCrear: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    recepcion: {
      crearClienteRapido: (...args: unknown[]) => mockCrear(...args),
    },
    clientes: {
      update: (...args: unknown[]) => mockUpdate(...args),
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

// Fixture del 201 (clienteRapidoResponseSchema, HU-31 + DEC-031/032).
const RAPIDO_201 = {
  id: "cliente-9",
  cedula: "99887766",
  nombres: "Luis Carlos",
  apellidos: "Martinez Ruiz",
  telefono: "3201234567",
  email: null,
  sede: { id: "sede-1", nombre: "Sede Principal" },
  estado: "NUEVO",
  perfilPendiente: true,
  observaciones: null,
  creadoPor: { id: "user-2", nombre: "Rita Recepcion" },
};

// Cliente tras completar el perfil con email (DEC-033: limpia la marca).
const RAPIDO_COMPLETADO = {
  ...RAPIDO_201,
  email: "luis@clubbeasts.com",
  perfilPendiente: false,
};

function apiError(message: string, code: string, status: number) {
  const err = new Error(message) as Error & {
    code?: string;
    status?: number;
    kind?: string;
  };
  err.code = code;
  err.status = status;
  err.kind = status === 409 ? "unknown" : "validation";
  return err;
}

async function renderAltaRapida() {
  const Pagina = await cargarPaginaRecepcion();
  render(<Pagina />);
  return {
    inputCedula: await screen.findByLabelText("Cedula rapida"),
    inputNombres: screen.getByLabelText("Nombres rapido"),
    inputApellidos: screen.getByLabelText("Apellidos rapido"),
    inputTelefono: screen.getByLabelText("Telefono rapido"),
  };
}

async function enviarAltaRapida() {
  const campos = await renderAltaRapida();
  fireEvent.change(campos.inputCedula, { target: { value: "99887766" } });
  fireEvent.change(campos.inputNombres, { target: { value: "Luis Carlos" } });
  fireEvent.change(campos.inputApellidos, {
    target: { value: "Martinez Ruiz" },
  });
  fireEvent.change(campos.inputTelefono, { target: { value: "3201234567" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Crear cliente rapido" })
  );
  return campos;
}

beforeEach(() => {
  mockCrear.mockReset();
  mockUpdate.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("INC03-RAP-01 / DEC-031: formulario minimo sin sede obligatoria", () => {
  it("envia solo {cedula, nombres, apellidos, telefono} (sin sedeId) y no exige sede en el formulario", async () => {
    mockCrear.mockResolvedValue(RAPIDO_201);

    await enviarAltaRapida();

    await waitFor(() => expect(mockCrear).toHaveBeenCalledTimes(1));
    // Igualdad exacta: el payload NO arrastra sedeId (DEC-031: opcional).
    expect(mockCrear.mock.calls[0][0]).toEqual({
      cedula: "99887766",
      nombres: "Luis Carlos",
      apellidos: "Martinez Ruiz",
      telefono: "3201234567",
    });
    // El formulario minimo no exige sede: no hay selector de sede obligado.
    expect(screen.queryByLabelText("Sede *")).toBeNull();
  });
});

describe("INC03-RAP-02/06 / DEC-032: marca de perfil pendiente y trazabilidad tras el 201", () => {
  it("con perfilPendiente=true en la respuesta se muestra la marca 'Perfil pendiente'", async () => {
    mockCrear.mockResolvedValue(RAPIDO_201);

    await enviarAltaRapida();

    expect(await screen.findByText("Perfil pendiente")).toBeTruthy();
  });

  it("pinta el estado 'Nuevo' y el creador del cliente rapido", async () => {
    mockCrear.mockResolvedValue(RAPIDO_201);

    await enviarAltaRapida();

    expect(await screen.findByText("Nuevo")).toBeTruthy();
    expect(await screen.findByText("Rita Recepcion")).toBeTruthy();
  });
});

describe("INC03-RAP-03 / DEC-033: completar el perfil con email", () => {
  it("el PATCH envia { email } a /clientes/:id y limpia la marca de perfil pendiente", async () => {
    mockCrear.mockResolvedValue(RAPIDO_201);
    mockUpdate.mockResolvedValue(RAPIDO_COMPLETADO);

    await enviarAltaRapida();
    // La marca esta visible antes de completar el perfil.
    expect(await screen.findByText("Perfil pendiente")).toBeTruthy();

    fireEvent.change(
      await screen.findByLabelText("Email para completar perfil"),
      { target: { value: "luis@clubbeasts.com" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Completar perfil" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("cliente-9", {
        email: "luis@clubbeasts.com",
      })
    );
    // DEC-033: con email persistido la marca se limpia.
    await waitFor(() =>
      expect(screen.queryByText("Perfil pendiente")).toBeNull()
    );
  });
});

describe("INC03-RAP-04/07: mensajes de error del backend", () => {
  it("un 400 VALIDATION_ERROR de telefono se muestra en role=alert con el mensaje exacto", async () => {
    mockCrear.mockRejectedValue(
      apiError(
        "Teléfono debe ser móvil colombiano (3XXXXXXXXX)",
        "VALIDATION_ERROR",
        400
      )
    );

    await enviarAltaRapida();

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(
      "Teléfono debe ser móvil colombiano (3XXXXXXXXX)"
    );
    // Sin marca de exito cuando el backend rechaza la creacion.
    expect(screen.queryByText("Perfil pendiente")).toBeNull();
  });

  it("un 409 DUPLICATE de cedula se muestra en role=alert", async () => {
    mockCrear.mockRejectedValue(
      apiError("Ya existe un cliente con esa cédula", "DUPLICATE", 409)
    );

    await enviarAltaRapida();

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Ya existe un cliente con esa cédula");
  });
});
