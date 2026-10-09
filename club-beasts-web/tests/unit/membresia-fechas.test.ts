/**
 * INC00-MEM-06 — Un preset de N dias produce exactamente N dias calendario inclusivos.
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 10 / GAP-008)
 *
 * Reglas de negocio:
 *  - DEC-005: los periodos se cuentan en dias completos (America/Bogota).
 *  - DEC-006: inicio y fin de vigencia son INCLUSIVOS.
 *
 * Consecuencia: un preset de N dias debe calcular
 *   fechaFin = fechaInicio + (N - 1)
 * para que `diasInclusivos(inicio, fin) === N`.
 *
 * Las fechas son strings `YYYY-MM-DD` y el calculo se hace sobre los
 * componentes de calendario (sin depender de la zona horaria del runtime).
 */
import { describe, it, expect } from "vitest";
import { diasInclusivos, sumarDiasInclusivos } from "@/lib/membresia-fechas";

const PRESETS = [30, 90, 180, 365];

/** Inicios que cubren bordes: mitad de mes, fin de febrero, cambio de anio y anio bisiesto. */
const INICIOS = ["2026-01-15", "2026-02-28", "2026-12-31", "2028-02-29"];

describe("INC00-MEM-06 presets de membresia con dias inclusivos", () => {
  for (const dias of PRESETS) {
    it(`el preset de ${dias} dias produce exactamente ${dias} dias inclusivos`, () => {
      for (const inicio of INICIOS) {
        const fin = sumarDiasInclusivos(inicio, dias);
        expect(
          diasInclusivos(inicio, fin),
          `${inicio} + ${dias} dias -> ${fin}`
        ).toBe(dias);
      }
    });
  }

  it("un periodo de un solo dia cuenta 1 dia inclusivo (mismo dia inicio/fin)", () => {
    expect(diasInclusivos("2026-03-10", "2026-03-10")).toBe(1);
    expect(sumarDiasInclusivos("2026-03-10", 1)).toBe("2026-03-10");
  });

  it("cruce de mes: 2026-01-31 + 30 dias -> 2026-03-01 (2026 no bisiesto)", () => {
    expect(sumarDiasInclusivos("2026-01-31", 30)).toBe("2026-03-01");
    expect(diasInclusivos("2026-01-31", "2026-03-01")).toBe(30);
  });

  it("cruce de anio: 2026-12-31 + 10 dias -> 2027-01-09", () => {
    expect(sumarDiasInclusivos("2026-12-31", 10)).toBe("2027-01-09");
    expect(diasInclusivos("2026-12-31", "2027-01-09")).toBe(10);
  });

  it("anio bisiesto: 2028-02-28 + 2 dias -> 2028-02-29", () => {
    expect(sumarDiasInclusivos("2028-02-28", 2)).toBe("2028-02-29");
    expect(diasInclusivos("2028-02-28", "2028-02-29")).toBe(2);
  });

  it("un rango invertido no cuenta dias", () => {
    expect(diasInclusivos("2026-03-10", "2026-03-09")).toBe(0);
    expect(diasInclusivos("2026-03-10", "2026-03-01")).toBe(0);
  });
});
