// @vitest-environment jsdom
/**
 * INC00-CLI-02 + INC00-CLI-03 — Ficha de cliente en modo edicion.
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 11 / GAP-003)
 *
 * Cubre de extremo a extremo:
 *  - limpiar email/observaciones envia `null` y tras guardar la ficha
 *    muestra "-" en el campo limpiado;
 *  - la edicion envia `sedeId` y `estado`;
 *  - los selectores solo existen cuando `canEdit` (DUENO/RECEPCIONISTA).
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

const CLIENTE_LIMPIO = {
  ...CLIENTE,
  email: null,
  observaciones: null,
  estado: "SUSPENDIDO",
  sede: { id: "sede-2", nombre: "Sede Secundaria" },
};

beforeEach(() => {
  roleActual = "DUENO";
  mockGet.mockReset();
  mockUpdate.mockReset();
  mockMembresiasList.mockReset();
  mockPush.mockReset();
  mockGet.mockResolvedValueOnce(CLIENTE).mockResolvedValue(CLIENTE_LIMPIO);
  mockMembresiasList.mockResolvedValue({ membresias: [], fechaActual: "2026-06-15" });
  mockUpdate.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
});

describe("INC00-CLI-03 limpiar email y observaciones en la ficha", () => {
  it("envia null al guardar y muestra '-' tras recargar", async () => {
    render(<FichaClientePage />);

    const editar = await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(editar);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Observaciones"), {
      target: { value: "   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdate.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe("cliente-1");
    expect(payload.email).toBeNull();
    expect(payload.observaciones).toBeNull();

    // Tras guardar se recarga la ficha: el campo limpio muestra "-".
    await waitFor(() => expect(screen.queryByText("ana@clubbeasts.com")).toBeNull());
    await waitFor(() => expect(screen.queryByText("Observacion previa")).toBeNull());
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
  });

  it("conserva el email cuando no se modifica", async () => {
    render(<FichaClientePage />);

    const editar = await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(editar);
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.email).toBe("ana@clubbeasts.com");
    expect(payload.observaciones).toBe("Observacion previa");
  });
});

describe("INC00-CLI-02 sede y estado en la ficha", () => {
  it("envia sedeId, estado y motivo elegidos en el modo edicion", async () => {
    render(<FichaClientePage />);

    const editar = await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(editar);

    fireEvent.change(await screen.findByLabelText("Sede"), {
      target: { value: "sede-2" },
    });
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "SUSPENDIDO" },
    });
    // INC-04 / DEC-035: todo cambio de estado exige motivo (el test aceptado
    // de INC00-CLI-02 se actualiza enviandolo, nunca se elimina).
    fireEvent.change(await screen.findByLabelText("Motivo"), {
      target: { value: "Falta de pago" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.sedeId).toBe("sede-2");
    expect(payload.estado).toBe("SUSPENDIDO");
    expect(payload.motivo).toBe("Falta de pago");
    // Sigue enviando lo basico del formulario.
    expect(payload.nombres).toBe("Ana");
    expect(payload.apellidos).toBe("Perez");
  });

  it("muestra la sede y el estado actualizados en modo lectura tras guardar", async () => {
    render(<FichaClientePage />);

    const editar = await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(editar);
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Sede: Sede Secundaria")).toBeTruthy());
    // Sin modo edicion no hay selectores.
    expect(screen.queryByLabelText("Sede")).toBeNull();
    expect(screen.queryByLabelText("Estado")).toBeNull();
  });

  it("un rol sin permiso (CLIENTE) no ve Editar ni los selectores de sede/estado", async () => {
    roleActual = "CLIENTE";

    render(<FichaClientePage />);

    await screen.findByText("Ficha del Cliente");
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByLabelText("Sede")).toBeNull();
    expect(screen.queryByLabelText("Estado")).toBeNull();
  });
});

// ─── INC04-EST-06 (HU-17 b2 UI, DEC-035): motivo en el formulario ───────────

describe("INC04-EST-06 el formulario de edicion captura el motivo del cambio de estado", () => {
  it("muestra el campo Motivo en modo edicion para los roles con permiso", async () => {
    render(<FichaClientePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    // El campo existe (aunque todavia no se haya tocado el estado): es la
    // entrada del motivo que el backend exige en todo cambio de estado.
    expect(await screen.findByLabelText("Motivo")).toBeTruthy();
  });

  it("el 400 del backend por motivo faltante se muestra en un role=alert y no guarda", async () => {
    // El backend rechaza el cambio sin motivo (INC04-EST-03): la UI debe
    // mostrar el mensaje accesible y permanecer en modo edicion.
    mockUpdate.mockRejectedValue({
      name: "ApiError",
      message: "Motivo es requerido cuando cambia el estado",
      code: "VALIDATION_ERROR",
      status: 400,
      kind: "validation",
    });

    render(<FichaClientePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.change(await screen.findByLabelText("Estado"), {
      target: { value: "INACTIVO" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Motivo es requerido cuando cambia el estado");
    // Sigue en modo edicion: el estado no se aplico.
    expect(screen.getByLabelText("Estado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });
});
