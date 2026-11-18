// @vitest-environment jsdom
/**
 * INC-10 (RED) — AsignarRutinaForm (ficha staff, DEC-065/DEC-070).
 * Criterios: RU-20 (asignación), RU-23/26/28 (409 con literales), C3
 * (localizadores exactos: "Inicio de la asignación" NUNCA "Fecha de inicio"),
 * C5/C6 (literal `SIN_VIGENCIA_PERSONALIZADA`, path `/asignacion`).
 *
 * Contrato fijado por este RED para `src/components/rutinas/AsignarRutinaForm`
 * (GREEN T8):
 *  - Export default `AsignarRutinaForm({ clienteId, rutinas, onAsignada,
 *    onCancelar })` con `rutinas` = resúmenes ofrecidos
 *    (`{ id, nombre, tipoRutina }`).
 *  - Campos con etiqueta exacta: "Rutina" (select) e "Inicio de la asignación"
 *    (input de fecha OPCIONAL; NUNCA "Fecha de inicio", C7).
 *  - Botones exactos: "Confirmar asignación" (submit) y "Volver a la ficha"
 *    (cancelar -> `onCancelar`).
 *  - Submit llama `api.asignaciones.crear(clienteId, { rutinaId, fechaInicio? })`
 *    (sin `fechaInicio` cuando el campo está vacío; nunca envía `fechaFin`,
 *    `estado` ni `actor` — son del sistema).
 *  - Éxito -> `onAsignada(asignacion)`.
 *  - Error del API -> `role="alert"` con el mensaje devuelto (los códigos 409
 *    usan los literales exactos de `MENSAJES_ASIGNACION`, DEC-070).
 *
 * FASE RED (2026-11-05): el componente NO existe (GREEN T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { mockAsignarCrear, mockOnAsignada, mockOnCancelar } = vi.hoisted(() => ({
  mockAsignarCrear: vi.fn(),
  mockOnAsignada: vi.fn(),
  mockOnCancelar: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    asignaciones: {
      crear: (...args: unknown[]) => mockAsignarCrear(...args),
      activa: vi.fn(),
      historial: vi.fn(),
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

const RUTA_FORM = "../../src/components/rutinas/AsignarRutinaForm";

async function importarForm(): Promise<any> {
  const ruta: string = RUTA_FORM;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC10-RED: falta el componente de producto @/components/rutinas/AsignarRutinaForm " +
        "(GREEN T8). Fallo de comportamiento ausente esperado."
    );
  }
}

/** Literales DEC-070 (idénticos al canónico HU-20-schemas). */
const MENSAJES_ASIGNACION = {
  CLIENTE_NO_ENCONTRADO: "Cliente no encontrado",
  RUTINA_NO_ENCONTRADA: "Rutina no encontrada",
  SIN_VIGENCIA_PERSONALIZADA:
    "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
  RUTINA_YA_ACTIVA: "La rutina ya está activa para este cliente",
  CLIENTE_INACTIVO: "Cliente sin estado activo: no se le pueden asignar rutinas",
} as const;

const RUTINAS = [
  { id: "ru-1", nombre: "Rutina generica INC10", tipoRutina: "GENERICA" },
  { id: "ru-2", nombre: "Rutina pers INC10", tipoRutina: "PERSONALIZADA" },
];

async function renderForm() {
  const modulo = await importarForm();
  return render(
    <modulo.default
      clienteId="cliente-1"
      rutinas={RUTINAS}
      onAsignada={mockOnAsignada}
      onCancelar={mockOnCancelar}
    />
  );
}

beforeEach(() => {
  mockAsignarCrear.mockReset();
  mockOnAsignada.mockClear();
  mockOnCancelar.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("AsignarRutinaForm — localizadores C3", () => {
  it("etiqueta exacta 'Inicio de la asignación' (NUNCA 'Fecha de inicio') y botones exactos", async () => {
    await renderForm();

    expect(screen.getByLabelText("Inicio de la asignación")).toBeTruthy();
    expect(screen.queryByLabelText("Fecha de inicio")).toBeNull();
    expect(screen.getByLabelText("Rutina")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Confirmar asignación$/ })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Volver a la ficha$/ })).toBeTruthy();
  });
});

describe("AsignarRutinaForm — envío", () => {
  it("confirmar llama api.asignaciones.crear con clienteId/rutinaId y SIN fechaFin/estado/actor", async () => {
    mockAsignarCrear.mockResolvedValue({ id: "as-1", estado: "ACTIVA" });
    await renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    expect(mockAsignarCrear).toHaveBeenCalledTimes(1);
    const [clienteId, payload] = mockAsignarCrear.mock.calls[0];
    expect(clienteId).toBe("cliente-1");
    expect(payload.rutinaId).toBe("ru-1");
    expect(payload).not.toHaveProperty("fechaFin");
    expect(payload).not.toHaveProperty("estado");
    expect(payload).not.toHaveProperty("actor");
    expect(mockOnAsignada).toHaveBeenCalledTimes(1);
  });

  it("con fecha diligenciada envía fechaInicio y la rutina seleccionada", async () => {
    mockAsignarCrear.mockResolvedValue({ id: "as-2", estado: "ACTIVA" });
    await renderForm();

    fireEvent.change(screen.getByLabelText("Rutina"), { target: { value: "ru-2" } });
    fireEvent.change(screen.getByLabelText("Inicio de la asignación"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    const [, payload] = mockAsignarCrear.mock.calls[0];
    expect(payload.rutinaId).toBe("ru-2");
    expect(payload.fechaInicio).toBe("2026-01-01");
    expect(mockOnAsignada).toHaveBeenCalledTimes(1);
  });
});

describe("AsignarRutinaForm — rechazos 409 con literales DEC-070", () => {
  for (const code of [
    "SIN_VIGENCIA_PERSONALIZADA",
    "CLIENTE_INACTIVO",
    "RUTINA_YA_ACTIVA",
  ] as const) {
    it(`${code} -> role="alert" con '${MENSAJES_ASIGNACION[code]}'`, async () => {
      mockAsignarCrear.mockRejectedValue(
        Object.assign(new Error(MENSAJES_ASIGNACION[code]), { code, status: 409 })
      );
      await renderForm();

      fireEvent.click(screen.getByRole("button", { name: "Confirmar asignación" }));

      const alerta = await screen.findByRole("alert");
      expect(alerta.textContent).toBe(MENSAJES_ASIGNACION[code]);
      expect(mockOnAsignada, "sin éxito no hay callback").not.toHaveBeenCalled();
    });
  }

  it("el error no desmonta el formulario: 'Confirmar asignación' sigue operativo", async () => {
    mockAsignarCrear.mockRejectedValueOnce(
      Object.assign(new Error(MENSAJES_ASIGNACION.RUTINA_YA_ACTIVA), {
        code: "RUTINA_YA_ACTIVA",
        status: 409,
      })
    );
    await renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar asignación" }));
    await screen.findByRole("alert");

    mockAsignarCrear.mockResolvedValueOnce({ id: "as-3", estado: "ACTIVA" });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar asignación" }));
    expect(mockOnAsignada).toHaveBeenCalledTimes(1);
  });

  it("'Volver a la ficha' llama onCancelar", async () => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Volver a la ficha" }));
    expect(mockOnCancelar).toHaveBeenCalledTimes(1);
    expect(mockAsignarCrear).not.toHaveBeenCalled();
  });
});
