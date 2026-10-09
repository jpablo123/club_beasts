// @vitest-environment jsdom
/**
 * INC-02 (HU-15 + DEC-024) — UI de congelacion en la ficha del cliente.
 *
 * Criterios cubiertos (fase GREEN):
 *  - HU15-C03: badge "Congelado" visible en la seccion de membresias.
 *  - DEC-017: las acciones congelar / descongelar / editar congelacion solo
 *    se pintan con `canManage` (DUENO / RECEPCIONISTA); sin el permiso no hay
 *    ninguna accion de pausa.
 *  - DEC-022 en cliente: fin >= hoy y rango contenido en la vigencia se
 *    validan antes de llamar al backend.
 *  - DEC-024: los 3 endpoints consumen `version` (lock optimista); en
 *    descongelar el cuerpo lleva `motivo` solo si el usuario escribio uno.
 *  - DEC-025: ningun texto sugiere bloqueo de acceso (la congelacion es una
 *    pausa informativa); el feedback tras cada operacion muestra la nueva
 *    `fechaFin` y los `diasCongelados` / `diasDevueltos`.
 *
 * El mock de `api.membresias.list` fija `fechaActual`, por lo que todas las
 * fechas del test son deterministas (no dependen del reloj de la maquina).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockList, mockCongelar, mockDescongelar, mockEditarCongelacion } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockCongelar: vi.fn(),
  mockDescongelar: vi.fn(),
  mockEditarCongelacion: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    membresias: {
      list: (...args: unknown[]) => mockList(...args),
      congelar: (...args: unknown[]) => mockCongelar(...args),
      descongelar: (...args: unknown[]) => mockDescongelar(...args),
      editarCongelacion: (...args: unknown[]) => mockEditarCongelacion(...args),
    },
  },
}));

import MembershipSection from "@/components/MembershipSection";

const HOY = "2026-06-15";
const ACTOR = { id: "u1", nombre: "Ana Dueño" };

function cambio(extra: Record<string, unknown>) {
  return {
    id: `cambio-${extra.version}`,
    fechaInicioAnterior: null,
    fechaFinAnterior: null,
    fechaInicioNueva: "2026-01-01",
    fechaFinNueva: "2026-12-31",
    actor: ACTOR,
    createdAt: "2026-01-01T10:00:00.000Z",
    ...extra,
  };
}

const CREACION = cambio({ accion: "CREACION", version: 1 });

const MEMBRESIA_ACTIVA = {
  id: "memb-1",
  clienteId: "cliente-1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  estado: "ACTIVA",
  version: 3,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  creadoPor: ACTOR,
  actualizadoPor: ACTOR,
  cambios: [CREACION],
};

const MEMBRESIA_CONGELADA = {
  ...MEMBRESIA_ACTIVA,
  fechaFin: "2027-01-10",
  estado: "CONGELADO",
  version: 2,
  cambios: [
    CREACION,
    cambio({
      accion: "CONGELACION",
      version: 2,
      motivo: "Viaje de trabajo",
      congelacionInicio: "2026-06-10",
      congelacionFin: "2026-06-20",
      fechaFinAnterior: "2026-12-31",
      fechaFinNueva: "2027-01-10",
    }),
  ],
};

const RESULTADO_CONGELAR = {
  ...MEMBRESIA_CONGELADA,
  fechaFinAnterior: "2026-12-31",
  diasCongelados: 200,
  version: 4,
  cambios: MEMBRESIA_CONGELADA.cambios,
  congelacion: {
    fechaInicio: "2026-06-15",
    fechaFin: "2026-12-31",
    motivo: "Viaje de trabajo",
    diasCongelados: 200,
  },
};

const RESULTADO_DESCONGELAR = {
  ...MEMBRESIA_ACTIVA,
  fechaFin: "2027-01-04",
  fechaFinAnterior: "2027-01-10",
  diasDevueltos: 6,
  estado: "ACTIVA",
  version: 3,
  cambios: [
    CREACION,
    MEMBRESIA_CONGELADA.cambios[1],
    cambio({
      accion: "DESCONGELACION",
      version: 3,
      congelacionInicio: "2026-06-10",
      congelacionFin: "2026-06-20",
      fechaFinAnterior: "2027-01-10",
      fechaFinNueva: "2027-01-04",
    }),
  ],
  congelacion: null,
};

function apiError(message: string, code: string, status: number) {
  const err = new Error(message);
  Object.assign(err, { code, status, kind: "validation" });
  return err;
}

function mockearLista(membresias: unknown[]) {
  mockList.mockResolvedValue({ membresias, fechaActual: HOY });
}

async function abrirCongelar() {
  render(<MembershipSection clienteId="cliente-1" canManage />);
  fireEvent.click(await screen.findByRole("button", { name: "Congelar" }));
  await screen.findByRole("heading", { name: "Congelar membresía" });
}

beforeEach(() => {
  mockList.mockReset();
  mockCongelar.mockReset();
  mockDescongelar.mockReset();
  mockEditarCongelacion.mockReset();
  // Respuestas por defecto: cada test que necesite otro caso las pisa.
  mockCongelar.mockResolvedValue(RESULTADO_CONGELAR);
  mockDescongelar.mockResolvedValue(RESULTADO_DESCONGELAR);
  mockEditarCongelacion.mockResolvedValue({
    ...RESULTADO_CONGELAR,
    diasCongelados: 16,
    diasCongeladosAnterior: 11,
  });
  mockearLista([MEMBRESIA_ACTIVA]);
});

afterEach(() => {
  cleanup();
});

describe("HU15-C03 badge CONGELADO en la seccion de membresias", () => {
  it("pinta el badge 'Congelado' cuando el backend devuelve estado CONGELADO", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    render(<MembershipSection clienteId="cliente-1" canManage />);

    expect(await screen.findByText("Congelado")).toBeTruthy();
    // La pausa vigente queda visible como informacion (DEC-025: sin bloqueo).
    expect(screen.getByText(/Pausa: 10\/06\/2026 — 20\/06\/2026/)).toBeTruthy();
    expect(screen.getByText(/Viaje de trabajo/)).toBeTruthy();
  });

  it("sin pausa vigente no ofrece acciones de pausa, solo 'Congelar'", async () => {
    render(<MembershipSection clienteId="cliente-1" canManage />);

    expect(await screen.findByRole("button", { name: "Congelar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Descongelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar congelación" })).toBeNull();
    expect(screen.getByText("Activa")).toBeTruthy();
  });
});

describe("DEC-017 las acciones de pausa son solo de DUENO/RECEPCIONISTA", () => {
  it("sin canManage no pinta congelar, descongelar ni editar congelacion", async () => {
    render(<MembershipSection clienteId="cliente-1" canManage={false} />);

    expect(await screen.findByText("Activa")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Congelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descongelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar congelación" })).toBeNull();
  });

  it("con una pausa vigente y sin canManage tampoco pinta acciones de pausa", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    render(<MembershipSection clienteId="cliente-1" canManage={false} />);

    expect(await screen.findByText("Congelado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Descongelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar congelación" })).toBeNull();
  });
});

describe("DEC-022 validaciones de rango en el cliente", () => {
  it("rechaza un fin anterior a hoy sin llamar al backend", async () => {
    await abrirCongelar();

    fireEvent.change(screen.getByLabelText("Fecha de inicio"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Fecha de fin"), {
      target: { value: "2026-06-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    expect(await screen.findByText("La fecha de fin no puede ser anterior a hoy.")).toBeTruthy();
    expect(mockCongelar).not.toHaveBeenCalled();
  });

  it("rechaza un rango fuera de la vigencia sin llamar al backend", async () => {
    await abrirCongelar();

    fireEvent.change(screen.getByLabelText("Fecha de inicio"), {
      target: { value: "2025-12-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    expect(
      await screen.findByText("El rango de congelación debe estar dentro de la vigencia.")
    ).toBeTruthy();
    expect(mockCongelar).not.toHaveBeenCalled();
  });

  it("rechaza un motivo vacio sin llamar al backend", async () => {
    await abrirCongelar();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    expect(await screen.findByText("El motivo es obligatorio.")).toBeTruthy();
    expect(mockCongelar).not.toHaveBeenCalled();
  });
});

describe("INC02-R05 a11y: el error de congelacion se anuncia con role=alert", () => {
  it("el mensaje de error expone role='alert' para lectores de pantalla", async () => {
    await abrirCongelar();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe("El motivo es obligatorio.");
    expect(mockCongelar).not.toHaveBeenCalled();
  });
});

describe("flujo de congelar (HU15-C04 / DEC-024)", () => {
  it("prefechta el rango valido y envia version, motivo y las dos fechas", async () => {
    await abrirCongelar();

    expect((screen.getByLabelText("Fecha de inicio") as HTMLInputElement).value).toBe(HOY);
    expect((screen.getByLabelText("Fecha de fin") as HTMLInputElement).value).toBe("2026-12-31");

    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Viaje de trabajo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    await waitFor(() => expect(mockCongelar).toHaveBeenCalledTimes(1));
    expect(mockCongelar).toHaveBeenCalledWith("cliente-1", "memb-1", {
      fechaInicio: HOY,
      fechaFin: "2026-12-31",
      motivo: "Viaje de trabajo",
      version: 3,
    });
  });

  it("tras el exito muestra fechaFin nueva y diasCongelados y actualiza la fila sin recargar", async () => {
    mockCongelar.mockResolvedValue(RESULTADO_CONGELAR);
    await abrirCongelar();

    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Viaje de trabajo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("10/01/2027");
    expect(status.textContent).toContain("200 días congelados");

    // La fila se actualiza con la respuesta (merge), sin una 2a llamada al listado.
    expect(screen.getByText(/01\/01\/2026 — 10\/01\/2027/)).toBeTruthy();
    expect(screen.getByText("Congelado")).toBeTruthy();
    expect(screen.getByText(/· v4/)).toBeTruthy();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("muestra el conflicto de version (409) con el mensaje legible", async () => {
    mockCongelar.mockRejectedValue(
      apiError(
        "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.",
        "MEMBRESIA_CONFLICTO",
        409
      )
    );
    await abrirCongelar();

    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Viaje de trabajo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar congelación" }));

    expect(
      await screen.findByText(
        "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("flujo de descongelar (DEC-024)", () => {
  it("pide confirmacion, omite el motivo vacio y envia la version vigente", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    mockDescongelar.mockResolvedValue(RESULTADO_DESCONGELAR);
    render(<MembershipSection clienteId="cliente-1" canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Descongelar" }));
    await screen.findByRole("heading", { name: "Descongelar membresía" });
    // Confirmacion explicita del rango que se va a finalizar.
    expect(screen.getByText(/del 10\/06\/2026 al 20\/06\/2026/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar descongelación" }));

    await waitFor(() => expect(mockDescongelar).toHaveBeenCalledTimes(1));
    expect(mockDescongelar).toHaveBeenCalledWith("cliente-1", "memb-1", { version: 2 });
  });

  it("tras el exito muestra fechaFin nueva y diasDevueltos", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    mockDescongelar.mockResolvedValue(RESULTADO_DESCONGELAR);
    render(<MembershipSection clienteId="cliente-1" canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Descongelar" }));
    await screen.findByText("Descongelar membresía");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar descongelación" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("04/01/2027");
    expect(status.textContent).toContain("6 días devueltos");
    expect(screen.getByText(/01\/01\/2026 — 04\/01\/2027/)).toBeTruthy();
    expect(screen.getByText("Activa")).toBeTruthy();
  });

  it("muestra 409 CONGELACION_INEXISTENTE con el mensaje del backend", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    mockDescongelar.mockRejectedValue(
      apiError("No hay una congelación vigente en esta membresía", "CONGELACION_INEXISTENTE", 409)
    );
    render(<MembershipSection clienteId="cliente-1" canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Descongelar" }));
    await screen.findByText("Descongelar membresía");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar descongelación" }));

    expect(
      await screen.findByText("No hay una congelación vigente en esta membresía")
    ).toBeTruthy();
  });
});

describe("flujo de editar congelacion (DEC-024)", () => {
  it("prefecha el rango vigente y envia los 4 campos con la version", async () => {
    mockearLista([MEMBRESIA_CONGELADA]);
    mockEditarCongelacion.mockResolvedValue({
      ...RESULTADO_CONGELAR,
      diasCongelados: 16,
      diasCongeladosAnterior: 11,
    });
    render(<MembershipSection clienteId="cliente-1" canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Editar congelación" }));
    await screen.findByRole("heading", { name: "Editar congelación" });

    expect((screen.getByLabelText("Fecha de inicio") as HTMLInputElement).value).toBe("2026-06-10");
    expect((screen.getByLabelText("Fecha de fin") as HTMLInputElement).value).toBe("2026-06-20");
    expect((screen.getByLabelText("Motivo") as HTMLTextAreaElement).value).toBe("Viaje de trabajo");

    fireEvent.change(screen.getByLabelText("Fecha de fin"), { target: { value: "2026-06-25" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Cambio de viaje" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockEditarCongelacion).toHaveBeenCalledTimes(1));
    expect(mockEditarCongelacion).toHaveBeenCalledWith("cliente-1", "memb-1", {
      fechaInicio: "2026-06-10",
      fechaFin: "2026-06-25",
      motivo: "Cambio de viaje",
      version: 2,
    });

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("16 días congelados");
    expect(status.textContent).toContain("11 anteriores");
  });
});
