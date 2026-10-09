/**
 * Membresía Logic Unit Tests
 *
 * Tests para las funciones puras de negocio de membresía:
 * - calcularEstado: determina PROGRAMADA / ACTIVA / VENCIDA
 * - hasOverlap: detecta solapamiento de períodos
 * - getTodayBogota: retorna fecha actual en timezone Bogotá
 *
 * NOTA: Estas funciones NO están exportadas actualmente en membresia.service.ts.
 * Para que estos tests pasen (fase GREEN de TDD), se deben exportar:
 *   export function calcularEstado(...)
 *   export function hasOverlap(...)
 *   export function getTodayBogota(...)
 *
 * Esto es intencional: los tests definen el contrato primero (RED).
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// Import directo de las funciones puras del módulo de servicio.
// Si las funciones no están exportadas, estos imports fallarán → RED phase.
import {
  calcularEstado,
  hasOverlap,
  getTodayBogota,
} from "../../src/services/membresia.service.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── calcularEstado ──────────────────────────────────────────────────────────

describe("calcularEstado", () => {
  it("retorna PROGRAMADA cuando hoy es anterior a fechaInicio", () => {
    expect(calcularEstado("2025-06-01", "2025-12-31", "2025-05-15")).toBe(
      "PROGRAMADA"
    );
  });

  it("retorna ACTIVA cuando hoy está entre inicio y fin", () => {
    expect(calcularEstado("2025-01-01", "2025-12-31", "2025-06-15")).toBe(
      "ACTIVA"
    );
  });

  it("retorna VENCIDA cuando hoy es posterior a fechaFin", () => {
    expect(calcularEstado("2025-01-01", "2025-06-30", "2025-07-01")).toBe(
      "VENCIDA"
    );
  });

  it("retorna ACTIVA cuando hoy es exactamente igual a fechaInicio", () => {
    expect(calcularEstado("2025-06-15", "2025-12-31", "2025-06-15")).toBe(
      "ACTIVA"
    );
  });

  it("retorna ACTIVA cuando hoy es exactamente igual a fechaFin", () => {
    expect(calcularEstado("2025-01-01", "2025-06-15", "2025-06-15")).toBe(
      "ACTIVA"
    );
  });

  it("retorna VENCIDA cuando hoy es un día después de fechaFin", () => {
    expect(calcularEstado("2025-01-01", "2025-06-15", "2025-06-16")).toBe(
      "VENCIDA"
    );
  });

  it("retorna PROGRAMADA cuando hoy es un día antes de fechaInicio", () => {
    expect(calcularEstado("2025-06-01", "2025-12-31", "2025-05-31")).toBe(
      "PROGRAMADA"
    );
  });
});

// ─── hasOverlap ──────────────────────────────────────────────────────────────

describe("hasOverlap", () => {
  const periods = [
    { fechaInicio: "2025-01-01", fechaFin: "2025-03-31" },
    { fechaInicio: "2025-06-01", fechaFin: "2025-09-30" },
  ];

  it("retorna false cuando no hay solape (gap entre períodos)", () => {
    expect(hasOverlap(periods, "2025-04-01", "2025-05-31")).toBe(false);
  });

  it("retorna true cuando hay solape parcial al inicio del nuevo", () => {
    expect(hasOverlap(periods, "2025-02-15", "2025-04-15")).toBe(true);
  });

  it("retorna true cuando hay solape parcial al final del nuevo", () => {
    expect(hasOverlap(periods, "2025-05-15", "2025-07-15")).toBe(true);
  });

  it("retorna true cuando el nuevo periodo es contenido por uno existente", () => {
    expect(hasOverlap(periods, "2025-02-01", "2025-02-28")).toBe(true);
  });

  it("retorna true cuando el nuevo periodo cubre uno existente", () => {
    expect(hasOverlap(periods, "2025-01-01", "2025-12-31")).toBe(true);
  });

  it("retorna true cuando hay solape por un día (extremos se tocan)", () => {
    // 2025-03-31 <= 2025-04-01 && 2025-04-01 <= 2025-03-31 → true
    expect(hasOverlap(periods, "2025-03-31", "2025-04-01")).toBe(true);
  });

  it("retorna false con lista vacía", () => {
    expect(hasOverlap([], "2025-01-01", "2025-12-31")).toBe(false);
  });

  it("retorna false cuando el nuevo es anterior a todos los existentes", () => {
    expect(hasOverlap(periods, "2024-01-01", "2024-12-31")).toBe(false);
  });

  it("retorna false cuando el nuevo es posterior a todos los existentes", () => {
    expect(hasOverlap(periods, "2026-01-01", "2026-12-31")).toBe(false);
  });

  describe("exclusión de ID", () => {
    const periodsWithId = [
      { id: "m1", fechaInicio: "2025-01-01", fechaFin: "2025-03-31" },
      { id: "m2", fechaInicio: "2025-06-01", fechaFin: "2025-09-30" },
    ];

    it("excluye el periodo con el ID especificado del chequeo", () => {
      // Si excluimos m1, el solape con m1 no cuenta
      expect(
        hasOverlap(periodsWithId, "2025-02-01", "2025-02-28", "m1")
      ).toBe(false);
    });

    it("excluye m1 pero detecta solape con m2", () => {
      expect(
        hasOverlap(periodsWithId, "2025-02-01", "2025-07-01", "m1")
      ).toBe(true);
    });

    it("excluye m2 y no detecta solape con m1", () => {
      expect(
        hasOverlap(periodsWithId, "2025-07-01", "2025-08-01", "m2")
      ).toBe(false);
    });

    it("sin excludeId, detecta solape con ambos", () => {
      expect(hasOverlap(periodsWithId, "2025-02-01", "2025-07-01")).toBe(
        true
      );
    });
  });
});

// ─── getTodayBogota ──────────────────────────────────────────────────────────

describe("getTodayBogota", () => {
  it("retorna formato YYYY-MM-DD", () => {
    const result = getTodayBogota();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retorna fecha con componentes válidos", () => {
    const result = getTodayBogota();
    const [year, month, day] = result.split("-").map(Number);
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it("retorna la fecha de hoy en timezone Bogotá (UTC-5)", () => {
    // Simular una hora UTC que en Bogotá es otro día
    // Ej: 03:00 UTC = 22:00前一天 en Bogotá (UTC-5)
    const fakeNow = new Date("2025-06-15T03:00:00Z"); // UTC
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const result = getTodayBogota();

    // 03:00 UTC → 22:00前一天 en Bogotá
    expect(result).toBe("2025-06-14");

    vi.useRealTimers();
  });

  it("retorna midnight Bogotá correctamente", () => {
    // 05:00 UTC = 00:00 Bogotá
    const fakeNow = new Date("2025-06-15T05:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const result = getTodayBogota();
    expect(result).toBe("2025-06-15");

    vi.useRealTimers();
  });
});
