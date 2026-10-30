// @vitest-environment jsdom
/**
 * INC05-PER-04 / INC05-NUT-04 — DEC-045 = (b): pintado minimo en la ficha del
 * cliente, etiquetado por `tipoServicio`.
 *
 * Contexto (spec INC-05, endpoint 8): `MembershipSection` consume
 * `GET .../membresias-gym`, cuya consulta (`membresia.service.ts:407-411`) no
 * filtra por tipo, asi que la seccion hoy recibe filas GYM, PERSONALIZADO y
 * NUTRICION en la misma lista y las pinta sin distinguirlas (incompatibilidad
 * #1 / DEC-045 (b)).
 *
 * RED (TDD): las dos aserciones de etiqueta (`Personalizado` en la fila
 * PERSONALIZADO y `Nutrición` en la fila NUTRICION) deben fallar hasta que la
 * GREEN pinte la etiqueta por `tipoServicio`. Las aserciones de no-rotulo
 * cruzado (filas GYM / PERSONALIZADO / NUTRICION) protegen el etiquetado
 * correcto en GREEN.
 *
 * Fixture determinista: `fechaActual = 2026-06-15` y tres periodos ACTIVA
 * (rango que contiene hoy) de 30 dias inclusivos cada uno, con rangos
 * distintos para localizar cada fila por su texto de fechas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: {
    membresias: {
      list: (...args: unknown[]) => mockList(...args),
    },
  },
}));

import MembershipSection from "@/components/MembershipSection";

const FECHA_ACTUAL = "2026-06-15";

interface FilaFixture {
  id: string;
  clienteId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  tipoServicio: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  creadoPor: { id: string; nombre: string };
  actualizadoPor: { id: string; nombre: string };
  cambios: unknown[];
}

function fila(
  id: string,
  tipoServicio: string,
  fechaInicio: string,
  fechaFin: string
): FilaFixture {
  return {
    id,
    clienteId: "cliente-inc05",
    fechaInicio,
    fechaFin,
    estado: "ACTIVA",
    tipoServicio,
    version: 1,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    creadoPor: { id: "usuario-1", nombre: "Ana Admin" },
    actualizadoPor: { id: "usuario-1", nombre: "Ana Admin" },
    cambios: [],
  };
}

// Tres tipos conviviendo en el mismo cliente; los tres periodos contienen
// `fechaActual`, de modo que su estado pintado (ACTIVA) es coherente.
const FILAS: FilaFixture[] = [
  fila("gym-1", "GYM", "2026-06-01", "2026-06-30"),
  fila("per-1", "PERSONALIZADO", "2026-06-05", "2026-07-04"),
  fila("nut-1", "NUTRICION", "2026-06-10", "2026-07-09"),
];

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Localiza la unica fila de la lista que muestra el rango dd/mm/yyyy — dd/mm/yyyy. */
function filaPorRango(inicio: string, fin: string): HTMLElement {
  const lista = document.querySelector("div.space-y-3");
  if (!lista) {
    throw new Error("La lista de membresías no está renderizada");
  }
  const rango = `${fechaLarga(inicio)} — ${fechaLarga(fin)}`;
  const filas = Array.from(lista.children) as HTMLElement[];
  const encontrada = filas.find((f) => (f.textContent ?? "").includes(rango));
  if (!encontrada) {
    throw new Error(
      `No se encontró la fila "${rango}". Filas reales: ${filas
        .map((f) => (f.textContent ?? "").trim())
        .join(" | ")}`
    );
  }
  return encontrada;
}

/** Renderiza la ficha y espera a que las 3 filas terminen de cargar. */
async function renderFicha(): Promise<void> {
  render(<MembershipSection clienteId="cliente-inc05" canManage />);
  const creados = await screen.findAllByText(/Creado por/);
  expect(creados).toHaveLength(3);
}

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue({ membresias: FILAS, fechaActual: FECHA_ACTUAL });
});

afterEach(() => {
  cleanup();
});

describe("INC05-PER-04 etiquetado del servicio personalizado en la ficha", () => {
  it("la fila del periodo PERSONALIZADO muestra la etiqueta Personalizado", async () => {
    await renderFicha();

    const filaPer = filaPorRango("2026-06-05", "2026-07-04");
    expect(filaPer.textContent ?? "").toMatch(/personalizado/i);
  });

  it("la fila del periodo PERSONALIZADO no muestra la etiqueta de Nutrición", async () => {
    await renderFicha();

    const filaPer = filaPorRango("2026-06-05", "2026-07-04");
    expect(filaPer.textContent ?? "").not.toMatch(/nutrici[oó]n/i);
  });
});

describe("INC05-NUT-04 etiquetado del servicio de nutrición en la ficha", () => {
  it("la fila del periodo NUTRICION muestra la etiqueta Nutrición", async () => {
    await renderFicha();

    const filaNut = filaPorRango("2026-06-10", "2026-07-09");
    expect(filaNut.textContent ?? "").toMatch(/nutrici[oó]n/i);
  });

  it("la fila del periodo NUTRICION no muestra la etiqueta de Personalizado", async () => {
    await renderFicha();

    const filaNut = filaPorRango("2026-06-10", "2026-07-09");
    expect(filaNut.textContent ?? "").not.toMatch(/personalizado/i);
  });
});

describe("INC05-PER-04 / INC05-NUT-04 la fila GYM no se rotula como otro servicio", () => {
  it("la fila GYM no muestra etiquetas de Personalizado ni de Nutrición", async () => {
    await renderFicha();

    const filaGym = filaPorRango("2026-06-01", "2026-06-30");
    expect(filaGym.textContent ?? "").not.toMatch(/(personalizado|nutrici[oó]n)/i);
  });
});
