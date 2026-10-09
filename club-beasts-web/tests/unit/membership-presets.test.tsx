// @vitest-environment jsdom
/**
 * INC00-MEM-06 — Presets de membresia en la UI (Tarea 10 / GAP-008).
 *
 * Las tres ramas del componente (`openCreate`, `handlePlanChange`,
 * `handleFechaInicioChange`) deben calcular `fechaFin = fechaInicio + N - 1`
 * para que el periodo tenga exactamente N dias calendario inclusivos
 * (DEC-005 + DEC-006). El modo "Personalizado" no cambia.
 *
 * Oraculo independiente: el test suma dias con `Date` local y formatea
 * dd/mm/yyyy, sin usar la funcion del modulo bajo prueba.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: {
    membresias: {
      list: (...args: unknown[]) => mockList(...args),
    },
  },
}));

import MembershipSection from "@/components/MembershipSection";

const PRESETS = [
  { value: "1m", dias: 30 },
  { value: "3m", dias: 90 },
  { value: "6m", dias: 180 },
  { value: "1a", dias: 365 },
];

function hoyISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sumarDiasCalendario(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dias);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha fin esperada para un preset de N dias: inicio + (N - 1). */
function finEsperado(inicio: string, dias: number): string {
  return fechaLarga(sumarDiasCalendario(inicio, dias - 1));
}

function fechaFinIncorrecta(inicio: string, dias: number): string {
  // Lo que pasaba con `inicio + dias`: N+1 dias inclusivos (bug GAP-008).
  return fechaLarga(sumarDiasCalendario(inicio, dias));
}

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue({ membresias: [], fechaActual: "2026-06-15" });
});

afterEach(() => {
  cleanup();
});

async function abrirFormularioCreate() {
  render(<MembershipSection clienteId="cliente-1" />);
  const boton = await screen.findByRole("button", { name: "Nueva Membresía" });
  fireEvent.click(boton);
}

describe("INC00-MEM-06 preset de 30 dias en la UI", () => {
  it("al abrir 'Nueva Membresía' el fin es inicio + 29 dias (30 inclusivos)", async () => {
    await abrirFormularioCreate();

    const hoy = hoyISO();
    expect(screen.getByText(finEsperado(hoy, 30))).toBeTruthy();
    expect(screen.queryByText(fechaFinIncorrecta(hoy, 30))).toBeNull();
  });
});

describe("INC00-MEM-06 los 4 presets calculan N dias inclusivos", () => {
  for (const preset of PRESETS) {
    it(`el preset ${preset.value} (${preset.dias} dias) pinta fin = inicio + ${preset.dias - 1}`, async () => {
      await abrirFormularioCreate();

      fireEvent.change(screen.getByLabelText("Plan"), {
        target: { value: preset.value },
      });

      const hoy = hoyISO();
      expect(screen.getByText(finEsperado(hoy, preset.dias))).toBeTruthy();
      expect(screen.queryByText(fechaFinIncorrecta(hoy, preset.dias))).toBeNull();
    });
  }
});

describe("INC00-MEM-06 rama handleFechaInicioChange", () => {
  it("recalcula el fin al cambiar la fecha inicio con cruce de mes", async () => {
    await abrirFormularioCreate();

    fireEvent.change(screen.getByLabelText("Fecha Inicio"), {
      target: { value: "2026-01-31" },
    });

    // 30 dias inclusivos desde 2026-01-31 terminan el 2026-03-01.
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(screen.queryByText("02/03/2026")).toBeNull();
  });

  it("recalcula el fin al cambiar la fecha inicio con cruce de anio", async () => {
    await abrirFormularioCreate();

    fireEvent.change(screen.getByLabelText("Plan"), {
      target: { value: "3m" },
    });
    fireEvent.change(screen.getByLabelText("Fecha Inicio"), {
      target: { value: "2026-12-10" },
    });

    // 90 dias inclusivos desde 2026-12-10 terminan el 2027-03-09.
    expect(screen.getByText("09/03/2027")).toBeTruthy();
    expect(screen.queryByText("10/03/2027")).toBeNull();
  });

  it("en modo Personalizado el fin no se recalcula al cambiar el inicio", async () => {
    await abrirFormularioCreate();

    const finInicial = finEsperado(hoyISO(), 30);
    expect(screen.getByText(finInicial)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Plan"), {
      target: { value: "personalizado" },
    });
    fireEvent.change(screen.getByLabelText("Fecha Inicio"), {
      target: { value: "2020-05-01" },
    });

    // Sin preset no hay calculo: conserva el fin anterior y no aplica N dias.
    expect(screen.getByText(finInicial)).toBeTruthy();
    expect(screen.queryByText("29/05/2020")).toBeNull();
  });
});
