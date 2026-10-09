/**
 * INC-02 (HU-15 + DEC-024) — Reglas de pausa que consume la UI.
 *
 * Reglas verificadas:
 *  - DEC-006: extremos INCLUSIVOS. La pausa sigue vigente cuando
 *    `hoy == fechaFin` (queda 1 dia); `hoy > fechaFin` deja de estarlo,
 *    que es exactamente cuando el backend responde
 *    `409 CONGELACION_INEXISTENTE` (spec INC-02, caso limite 3).
 *  - Pausa futura (`hoy < fechaInicio`): sigue vigente (se puede
 *    descongelar devolviendo los N dias completos, caso limite 1).
 *  - La ultima fila de la secuencia de pausa manda (orden por `version`,
 *    igual que `@@unique([membresiaId, version])` del backend): una
 *    `DESCONGELACION` cierra la pausa; una `EDICION_CONGELACION` reemplaza
 *    el rango.
 *  - `hoyBogotaISO` fija la fecha en `America/Bogota` (DEC-005) sin depender
 *    de la zona horaria del runtime (misma formula que `getTodayBogota`).
 *
 * Aritmetica de fechas sobre componentes de calendario (DEC-005/DEC-006).
 */
import { describe, it, expect } from "vitest";
import {
  hoyBogotaISO,
  pausaVigente,
  restarDiasCalendario,
  type FilaCambioPausa,
} from "@/lib/membresia-fechas";

const HOY = "2026-06-15";

function fila(
  accion: string,
  version: number,
  congelacionInicio: string | null,
  congelacionFin: string | null,
  motivo: string | null = null
): FilaCambioPausa {
  return { accion, version, congelacionInicio, congelacionFin, motivo };
}

const CREACION = fila("CREACION", 1, null, null);

describe("INC-02 pausaVigente: regla inclusiva (DEC-006)", () => {
  it("sigue vigente cuando hoy es exactamente la fecha fin de la pausa", () => {
    const cambios = [CREACION, fila("CONGELACION", 2, "2026-06-10", "2026-06-15", "Viaje")];
    expect(pausaVigente(cambios, "2026-06-15")).toEqual({
      fechaInicio: "2026-06-10",
      fechaFin: "2026-06-15",
      motivo: "Viaje",
    });
  });

  it("sigue vigente cuando hoy es el primer dia de la pausa", () => {
    const cambios = [CREACION, fila("CONGELACION", 2, "2026-06-15", "2026-06-20")];
    expect(pausaVigente(cambios, "2026-06-15")?.fechaInicio).toBe("2026-06-15");
  });

  it("ya no esta vigente un dia despues del fin (409 CONGELACION_INEXISTENTE)", () => {
    const cambios = [CREACION, fila("CONGELACION", 2, "2026-06-10", "2026-06-15")];
    expect(pausaVigente(cambios, "2026-06-16")).toBeNull();
  });

  it("una pausa futura (hoy < inicio) sigue vigente", () => {
    const cambios = [CREACION, fila("CONGELACION", 2, "2026-06-20", "2026-06-25")];
    expect(pausaVigente(cambios, "2026-06-15")).toEqual({
      fechaInicio: "2026-06-20",
      fechaFin: "2026-06-25",
      motivo: null,
    });
  });

  it("un rango invertido no se considera vigente", () => {
    const cambios = [CREACION, fila("CONGELACION", 2, "2026-06-20", "2026-06-10")];
    expect(pausaVigente(cambios, "2026-06-15")).toBeNull();
  });
});

describe("INC-02 pausaVigente: secuencia de cambios", () => {
  it("sin filas de pausa (solo CREACION) devuelve null", () => {
    expect(pausaVigente([CREACION], HOY)).toBeNull();
    expect(pausaVigente([], HOY)).toBeNull();
  });

  it("una DESCONGELACION cierra la pausa", () => {
    const cambios = [
      CREACION,
      fila("CONGELACION", 2, "2026-06-10", "2026-06-20"),
      fila("DESCONGELACION", 3, "2026-06-10", "2026-06-20"),
    ];
    expect(pausaVigente(cambios, HOY)).toBeNull();
  });

  it("una EDICION_CONGELACION reemplaza el rango de la pausa", () => {
    const cambios = [
      CREACION,
      fila("CONGELACION", 2, "2026-06-10", "2026-06-12"),
      fila("EDICION_CONGELACION", 3, "2026-06-10", "2026-06-25", "Cambio de viaje"),
    ];
    expect(pausaVigente(cambios, HOY)).toEqual({
      fechaInicio: "2026-06-10",
      fechaFin: "2026-06-25",
      motivo: "Cambio de viaje",
    });
  });

  it("manda la fila de mayor version aunque el array venga desordenado", () => {
    const cambios = [
      fila("CONGELACION", 2, "2026-06-01", "2026-06-05"),
      CREACION,
      fila("DESCONGELACION", 3, "2026-06-01", "2026-06-05"),
      fila("CONGELACION", 4, "2026-06-10", "2026-06-20"),
    ];
    expect(pausaVigente(cambios, HOY)?.fechaFin).toBe("2026-06-20");
  });
});

describe("INC-02 hoyBogotaISO (DEC-005, America/Bogota)", () => {
  it("usa el calendario de Bogota y no el del runtime", () => {
    // 02:30Z del 16 = 21:30 del 15 en Bogota (UTC-5).
    expect(hoyBogotaISO(new Date("2026-06-16T02:30:00Z"))).toBe("2026-06-15");
    // 10:00Z del 15 = 05:00 del 15 en Bogota.
    expect(hoyBogotaISO(new Date("2026-06-15T10:00:00Z"))).toBe("2026-06-15");
    // 23:59Z del 15 = 18:59 del 15 en Bogota.
    expect(hoyBogotaISO(new Date("2026-06-15T23:59:00Z"))).toBe("2026-06-15");
  });

  it("devuelve siempre un string YYYY-MM-DD", () => {
    expect(hoyBogotaISO(new Date("2026-01-01T00:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("INC-02 restarDiasCalendario (revert de la extension al editar)", () => {
  it("resta dias dentro del mismo mes", () => {
    expect(restarDiasCalendario("2026-06-20", 6)).toBe("2026-06-14");
  });

  it("cruza de mes: 2026-03-02 - 5 dias -> 2026-02-25", () => {
    expect(restarDiasCalendario("2026-03-02", 5)).toBe("2026-02-25");
  });

  it("cruza de anio: 2026-01-03 - 5 dias -> 2025-12-29", () => {
    expect(restarDiasCalendario("2026-01-03", 5)).toBe("2025-12-29");
  });

  it("restar 0 dias devuelve la misma fecha", () => {
    expect(restarDiasCalendario("2026-06-15", 0)).toBe("2026-06-15");
  });
});
