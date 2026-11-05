// @vitest-environment jsdom
/**
 * INC-08 (RED) — Payload de edicion staff: `estado` SOLO cuando el usuario
 * lo cambio (DEC-054). Criterios: `INC08-ED-01`, `INC08-ED-02`, `INC08-ED-03`.
 *
 * Contrato fijado por este RED (para el GREEN, T9):
 *  - Editar un campo suelto (p. ej. telefono) SIN tocar `estado` guarda con
 *    un PATCH que NO incluye la clave `estado` ni la clave `motivo` (hoy la
 *    UI siempre manda `estado` porque el form se inicializa con la ficha, y
 *    el backend responde 400 "Motivo es requerido cuando cambia el estado").
 *  - Un `motivo` escrito sin cambio de estado NO viaja en el payload
 *    (CONF-07/DEC-054: el motivo solo acompana a un cambio real de estado).
 *  - Cuando el usuario SI cambia `estado`, el payload incluye `estado` con el
 *    nuevo valor y `motivo` cuando se escribio; sin motivo el backend sigue
 *    respondiendo 400 (DEC-035 intacta — verificado por la base INC-04 y el
 *    E2E `inc08-edicion-estado.spec.ts`, fila 9).
 *  - El resto del contrato del payload NO cambia (INC00-CLI-02/03):
 *    `nombres`, `apellidos`, `email`, `observaciones` siempre viajan y
 *    `sedeId`/`telefono` viajan cuando el form los trae. Asercion explicita
 *    del conjunto de claves (INC08-R03: nada de campos no previstos).
 *
 * El contrato de API NO cambia (DEC-054): estas pruebas observan el payload
 * que la UI arma via el mock de `api.clientes.update`, con el builder real
 * `construirPayloadEdicionCliente` en el camino (sin mockearlo).
 *
 * FASE RED (2026-10-30): el comportamiento actual codifica el pre-DEC-054
 * (siempre incluye `estado`), asi que los tests marcados [RED] fallan por el
 * comportamiento ausente; los marcados [PIN] fijan lo que DEC-054 NO cambia
 * (regresion DEC-035/INC00-CLI-02) y hoy estan verdes.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`, sin aserciones vacias; un paso obligatorio ausente falla el test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockGet, mockUpdate, mockMembresiasList, mockPush } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUpdate: vi.fn(),
  mockMembresiasList: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    clientes: {
      get: (...args: unknown[]) => mockGet(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    membresias: {
      list: (...args: unknown[]) => mockMembresiasList(...args),
    },
  },
}));

let roleActual = "DUENO";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: roleActual ? { user: { name: "Admin", role: roleActual } } : null,
    status: roleActual ? "authenticated" : "unauthenticated",
  }),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "cliente-1" }),
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
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

import FichaClientePage from "@/app/clientes/[id]/page";

/** Ficha persistida: estado "ACTIVO" (el valor que el form arrastra al abrir). */
const CLIENTE = {
  id: "cliente-1",
  cedula: "1234567890",
  nombres: "Ana",
  apellidos: "Perez",
  telefono: "3001112233",
  email: "ana@clubbeasts.com",
  estado: "ACTIVO",
  observaciones: "Observacion previa",
  sede: { id: "sede-1", nombre: "Sede Principal" },
  createdAt: "2026-01-01T10:00:00.000Z",
};

/**
 * Conjunto exacto de claves del PATCH cuando NO hay cambio de estado
 * (INC00-CLI-02/03 sin la clave `estado` de DEC-054): `nombres` y
 * `apellidos` siempre; `email` y `observaciones` siempre (null si se
 * limpian); `telefono` y `sedeId` cuando el form los trae.
 */
const CLAVES_SIN_ESTADO = ["apellidos", "email", "nombres", "observaciones", "sedeId", "telefono"];

/** Mismo contrato + `estado` + `motivo` cuando el usuario SI cambio estado. */
const CLAVES_CON_ESTADO = [...CLAVES_SIN_ESTADO, "estado", "motivo"].sort();

/** Payload exacto que llego a `api.clientes.update` (unico guardado). */
function payloadDelGuardado(): Record<string, unknown> {
  expect(mockUpdate, "el guardado debe llamar a api.clientes.update").toHaveBeenCalledTimes(1);
  const [id, payload] = mockUpdate.mock.calls[0] as [string, Record<string, unknown>];
  expect(id).toBe("cliente-1");
  return payload;
}

async function entrarEnEdicion(): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
}

/** Edita el telefono (campo suelto) sin tocar el selector de Estado. */
function editarTelefono(): void {
  fireEvent.change(screen.getByDisplayValue("3001112233"), {
    target: { value: "3007778899" },
  });
}

beforeEach(() => {
  roleActual = "DUENO";
  mockGet.mockReset();
  mockUpdate.mockReset();
  mockMembresiasList.mockReset();
  mockPush.mockReset();
  mockGet.mockResolvedValue(CLIENTE);
  mockMembresiasList.mockResolvedValue({ membresias: [], fechaActual: "2026-06-15" });
  mockUpdate.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
});

// ─── INC08-ED-01: campo suelto -> 200 sin motivo, payload sin `estado` ───────

describe("INC08-ED-01 editar un campo suelto no exige motivo (DEC-054)", () => {
  it("[RED] editar solo telefono guarda sin exigir motivo: el PATCH no incluye `estado` ni `motivo`", async () => {
    render(<FichaClientePage />);
    await entrarEnEdicion();
    editarTelefono();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    // DEC-054: `estado` SOLO viaja cuando el usuario lo cambio.
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(payload.telefono).toBe("3007778899");

    // Guardado efectivo (200): la ficha vuelve a modo lectura sin alertas.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull()
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("[RED] el payload del campo suelto contiene exactamente los campos del contrato (INC08-R03)", async () => {
    render(<FichaClientePage />);
    await entrarEnEdicion();
    editarTelefono();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    // Sin `estado` ni `motivo`; el resto del contrato (INC00-CLI-02/03) intacto.
    expect(Object.keys(payload).sort()).toEqual(CLAVES_SIN_ESTADO);
  });
});

// ─── INC08-ED-02: motivo exigido SOLO con cambio de estado ───────────────────

describe("INC08-ED-02 el motivo solo viaja con un cambio real de estado", () => {
  it("[RED] un motivo escrito sin cambiar estado no viaja en el payload (CONF-07 / DEC-054)", async () => {
    render(<FichaClientePage />);
    await entrarEnEdicion();
    editarTelefono();
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Motivo viajero sin estado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
  });

  it("[PIN] al cambiar estado sin motivo el payload conserva `estado` y omite `motivo` (400 backend, DEC-035 intacta)", async () => {
    // El backend (no la UI) rechaza el cambio sin motivo con 400 — DEC-035
    // sigue intacta tras DEC-054. Este PIN es verde hoy y debe seguirlo
    // estando: el GREEN no debe agregar validacion de motivo cuando NO hay
    // cambio de estado.
    mockUpdate.mockRejectedValueOnce({
      name: "ApiError",
      message: "Motivo es requerido cuando cambia el estado",
      code: "VALIDATION_ERROR",
      status: 400,
      kind: "validation",
    });

    render(<FichaClientePage />);
    await entrarEnEdicion();
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "SUSPENDIDO" },
    });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    expect(payload.estado).toBe("SUSPENDIDO");
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
  });
});

// ─── INC08-ED-03: asercion del payload (estado solo cuando cambio) ───────────

describe("INC08-ED-03 el PATCH solo incluye `estado` cuando el usuario lo cambio", () => {
  it("[PIN] al cambiar estado el payload SI incluye `estado` con el nuevo valor y el motivo escrito", async () => {
    render(<FichaClientePage />);
    await entrarEnEdicion();
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "SUSPENDIDO" },
    });
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Falta de pago" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    expect(payload.estado).toBe("SUSPENDIDO");
    expect(payload.motivo).toBe("Falta de pago");
  });

  it("[PIN] el payload con cambio de estado no arrastra campos fuera del contrato (INC08-R03)", async () => {
    render(<FichaClientePage />);
    await entrarEnEdicion();
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "SUSPENDIDO" },
    });
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Falta de pago" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = payloadDelGuardado();
    expect(Object.keys(payload).sort()).toEqual(CLAVES_CON_ESTADO);
  });
});
