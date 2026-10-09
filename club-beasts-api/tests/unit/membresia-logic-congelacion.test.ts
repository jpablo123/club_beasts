/**
 * INC-02 (ampliacion DEC-024) — RED unitaria: formulas de dias y estado de
 * congelacion sobre `src/services/membresia.service.ts`.
 *
 * Criterios: `HU15-C07` (unitarias de `diasDevueltos` sobre los TRES estados de
 * la pausa), `HU15-C08` (unitarias de `fechaFin - N_anterior + N_nuevo`:
 * antes/despues de consumir y rango identico) y `HU15-C03`/cov. 28 (prueba
 * unitaria de `calcularEstado` con la fixture F7: vigencia VENCIDA + rango de
 * congelacion que cubre hoy -> `CONGELADO`).
 *
 * Contrato propuesto para la fase GREEN (spec INC-02, "Regla de dias de la
 * ampliacion (DEC-024) - formula verificable" y "Estado calculado"):
 *
 *   diasDevueltos(inicioRango, finRango, hoy)
 *     = max(0, finRango - max(hoy, inicioRango) + 1)
 *     // futura -> N completo; en curso -> fin - hoy + 1; terminada -> 0
 *
 *   fechaFinTrasEdicion(fechaFin, pausaInicio, pausaFin, rangoNuevoInicio, rangoNuevoFin)
 *     = fechaFin - diasInclusivos(pausaInicio, pausaFin)
 *                + diasInclusivos(rangoNuevoInicio, rangoNuevoFin)
 *     // revertir N_anterior completo y aplicar N_nuevo (casos limite 5/6/7)
 *
 *   calcularEstado(fechaInicio, fechaFin, hoy, congelaciones?)
 *     // extension: si hoy cae en [congelacionInicio, congelacionFin] -> CONGELADO
 *     // con precedencia sobre PROGRAMADA / ACTIVA / VENCIDA (fixture F7)
 *
 * Notas de RED:
 * - `calcularEstado` ya existe con 3 argumentos (los tests base estan en
 *   `membresia-logic.test.ts`); ignora el 4to argumento -> los tests que esperan
 *   `CONGELADO` fallan granularmente.
 * - `diasDevueltos` y `fechaFinTrasEdicion` NO estan exportados; `requerir()`
 *   lanza un error de contrato explicito dentro de cada test (granular) en
 *   lugar de romper la carga del modulo.
 * - Fechas fijas de calendario: todos los calculos reciben `hoy` como parametro
 *   explicito (patrón de `membresia-logic.test.ts`), sin fakes de reloj.
 */
import { describe, it, expect } from "vitest";
import * as membresiaService from "../../src/services/membresia.service.js";

type EstadoVigencia = "PROGRAMADA" | "ACTIVA" | "VENCIDA" | "CONGELADO";

type RangoCongelacion = {
  congelacionInicio: string;
  congelacionFin: string;
};

/** Contrato propuesto (fase GREEN) de las funciones puras de la ampliacion. */
type LogicaCongelacion = {
  calcularEstado(
    fechaInicio: string,
    fechaFin: string,
    hoy: string,
    congelaciones?: RangoCongelacion[]
  ): EstadoVigencia;
  diasDevueltos(inicioRango: string, finRango: string, hoy: string): number;
  fechaFinTrasEdicion(
    fechaFin: string,
    pausaInicio: string,
    pausaFin: string,
    rangoNuevoInicio: string,
    rangoNuevoFin: string
  ): string;
};

/**
 * Resuelve el export en tiempo de ejecucion (dentro del test) para que un
 * export ausente falle de forma granular y con mensaje de contrato claro.
 */
function requerir<K extends keyof LogicaCongelacion>(
  nombre: K
): LogicaCongelacion[K] {
  const exportado = (membresiaService as unknown as Record<string, unknown>)[
    nombre
  ];
  if (typeof exportado !== "function") {
    throw new Error(
      `Contrato RED INC-02 (DEC-024): falta exportar ${String(
        nombre
      )}(...) en src/services/membresia.service.ts`
    );
  }
  return exportado as LogicaCongelacion[K];
}

const calcularEstado = (
  ...args: Parameters<LogicaCongelacion["calcularEstado"]>
) => requerir("calcularEstado")(...args);

const diasDevueltos = (
  ...args: Parameters<LogicaCongelacion["diasDevueltos"]>
) => requerir("diasDevueltos")(...args);

const fechaFinTrasEdicion = (
  ...args: Parameters<LogicaCongelacion["fechaFinTrasEdicion"]>
) => requerir("fechaFinTrasEdicion")(...args);

// ─── calcularEstado con congelaciones (precedencia CONGELADO, F7) ─────────────

describe("calcularEstado — extension con congelaciones: CONGELADO prevalece (F7 / cov. 28)", () => {
  it("HU15-C03 (F7) vigencia VENCIDA con una pausa que cubre hoy devuelve CONGELADO", () => {
    expect(
      calcularEstado("2026-01-01", "2026-01-31", "2026-02-08", [
        { congelacionInicio: "2026-02-01", congelacionFin: "2026-02-15" },
      ])
    ).toBe("CONGELADO");
  });

  it("vigencia ACTIVA con una pausa que cubre hoy devuelve CONGELADO", () => {
    expect(
      calcularEstado("2026-01-01", "2026-12-31", "2026-02-08", [
        { congelacionInicio: "2026-02-01", congelacionFin: "2026-02-15" },
      ])
    ).toBe("CONGELADO");
  });

  it("vigencia PROGRAMADA con una pausa que cubre hoy devuelve CONGELADO", () => {
    expect(
      calcularEstado("2026-03-01", "2026-12-31", "2026-02-08", [
        { congelacionInicio: "2026-02-01", congelacionFin: "2026-02-15" },
      ])
    ).toBe("CONGELADO");
  });

  it("hoy igual a congelacionFin sigue dentro de la pausa (limite inclusivo)", () => {
    expect(
      calcularEstado("2026-01-01", "2026-12-31", "2026-02-15", [
        { congelacionInicio: "2026-02-01", congelacionFin: "2026-02-15" },
      ])
    ).toBe("CONGELADO");
  });

  it("hoy igual a congelacionInicio sigue dentro de la pausa (limite inclusivo)", () => {
    expect(
      calcularEstado("2026-01-01", "2026-12-31", "2026-02-01", [
        { congelacionInicio: "2026-02-01", congelacionFin: "2026-02-15" },
      ])
    ).toBe("CONGELADO");
  });

  it("pausa ya terminada (hoy > congelacionFin) vuelve al estado base VENCIDA", () => {
    expect(
      calcularEstado("2026-01-01", "2026-01-31", "2026-02-08", [
        { congelacionInicio: "2026-01-10", congelacionFin: "2026-01-15" },
      ])
    ).toBe("VENCIDA");
  });

  it("pausa futura (hoy < congelacionInicio) vuelve al estado base ACTIVA", () => {
    expect(
      calcularEstado("2026-01-01", "2026-12-31", "2026-02-08", [
        { congelacionInicio: "2026-03-01", congelacionFin: "2026-03-10" },
      ])
    ).toBe("ACTIVA");
  });

  it("sin congelaciones (3 argumentos) conserva el calculo actual ACTIVA", () => {
    expect(calcularEstado("2026-01-01", "2026-12-31", "2026-02-08")).toBe(
      "ACTIVA"
    );
  });

  it("lista de congelaciones vacia conserva el calculo actual VENCIDA", () => {
    expect(
      calcularEstado("2026-01-01", "2026-01-31", "2026-02-08", [])
    ).toBe("VENCIDA");
  });
});

// ─── diasDevueltos — formula DEC-024 sobre los tres estados de la pausa ───────

describe("diasDevueltos — max(0, finRango - max(hoy, inicioRango) + 1) (HU15-C07)", () => {
  it("pausa futura (hoy < inicio) devuelve N completo: 10 dias", () => {
    // rango 2026-02-15..2026-02-24 (N = 10), hoy 2026-02-10
    expect(diasDevueltos("2026-02-15", "2026-02-24", "2026-02-10")).toBe(10);
  });

  it("pausa en curso (hoy dentro) devuelve fin - hoy + 1: 8 dias (fixture F8 / D1)", () => {
    // rango 2026-02-06..2026-02-15 (N = 10), hoy 2026-02-08 -> 15 - 8 + 1 = 8
    expect(diasDevueltos("2026-02-06", "2026-02-15", "2026-02-08")).toBe(8);
  });

  it("pausa en curso con 7 de 10 dias consumidos devuelve los 3 restantes", () => {
    // rango 2026-02-01..2026-02-10 (N = 10), hoy 2026-02-08 -> 10 - 8 + 1 = 3
    expect(diasDevueltos("2026-02-01", "2026-02-10", "2026-02-08")).toBe(3);
  });

  it("hoy igual al inicio devuelve N completo (caso limite)", () => {
    expect(diasDevueltos("2026-02-01", "2026-02-10", "2026-02-01")).toBe(10);
  });

  it("hoy igual al fin devuelve 1 (ultimo dia de la pausa)", () => {
    expect(diasDevueltos("2026-02-01", "2026-02-10", "2026-02-10")).toBe(1);
  });

  it("hoy un dia despues del fin devuelve 0 (pausa terminada, duro)", () => {
    expect(diasDevueltos("2026-02-01", "2026-02-10", "2026-02-11")).toBe(0);
  });

  it("hoy mucho despues del fin devuelve 0 (nunca negativo)", () => {
    expect(diasDevueltos("2026-02-01", "2026-02-10", "2026-03-31")).toBe(0);
  });

  it("rango invertido (fin < inicio) devuelve 0 por el max(0, ...)", () => {
    expect(diasDevueltos("2026-02-10", "2026-02-01", "2026-02-05")).toBe(0);
  });
});

// ─── fechaFinTrasEdicion — fechaFin - N_anterior + N_nuevo (HU15-C08) ────────

describe("fechaFinTrasEdicion — fechaFin - N_anterior + N_nuevo (casos limite 5/6/7 del spec)", () => {
  it("caso limite 5: pausa futura revierte N_anterior completo (fechaFin = 2026-04-19)", () => {
    // N_anterior = diasInclusivos(2026-02-01, 2026-02-10) = 10
    // N_nuevo    = diasInclusivos(2026-02-15, 2026-03-05) = 19
    // 2026-04-10 - 10 + 19 = 2026-04-19
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-15",
        "2026-03-05"
      )
    ).toBe("2026-04-19");
  });

  it("caso limite 6: editar despues de consumir revierte los N completos (fechaFin = 2026-04-02)", () => {
    // Ejemplo literal del spec: N = 10 -> 2026-04-10, N' = 2 -> 2026-04-02
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-08",
        "2026-02-09"
      )
    ).toBe("2026-04-02");
  });

  it("caso limite 7: rango identico (N' = N) deja fechaFin sin cambio", () => {
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-01",
        "2026-02-10"
      )
    ).toBe("2026-04-10");
  });

  it("extension: N' = 20 sobre N = 10 suma 10 dias (fechaFin = 2026-04-20)", () => {
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-01",
        "2026-02-20"
      )
    ).toBe("2026-04-20");
  });

  it("retraccion a un solo dia (N' = 1) resta 9 dias sobre N = 10 (fechaFin = 2026-04-01)", () => {
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-08",
        "2026-02-08"
      )
    ).toBe("2026-04-01");
  });

  it("invariante: fechaFin' - fechaFin = N' - N (auditable desde las filas del historial)", () => {
    const fechaFinAnterior = "2026-04-10";
    const fechaFinNueva = fechaFinTrasEdicion(
      fechaFinAnterior,
      "2026-02-01",
      "2026-02-10",
      "2026-02-08",
      "2026-02-09"
    );
    const dias = (desde: string, hasta: string) => {
      const [y1, m1, d1] = desde.split("-").map(Number);
      const [y2, m2, d2] = hasta.split("-").map(Number);
      return Math.round(
        (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000
      );
    };
    expect(dias(fechaFinAnterior, fechaFinNueva)).toBe(2 - 10);
  });

  it("rango que cruza fin de ano: N_anterior = 10 (2025-12-25..2026-01-03) y N' = 5 -> 2026-01-10", () => {
    expect(
      fechaFinTrasEdicion(
        "2026-01-15",
        "2025-12-25",
        "2026-01-03",
        "2026-01-05",
        "2026-01-09"
      )
    ).toBe("2026-01-10");
  });

  it("revertir primero y aplicar despues da el mismo resultado que la formula directa", () => {
    // `fechaFinTrasEdicion` devuelve el resultado FINAL (revert + aplicar),
    // no el intermedio: el paso `fechaFin - N_anterior` se calcula aqui con
    // aritmetica local para no usar la funcion fuera de su contrato.
    const sumarDias = (fecha: string, dias: number): string => {
      const [y, m, d] = fecha.split("-").map(Number);
      const t = new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(
        t.getUTCDate()
      )}`;
    };

    // N_anterior = diasInclusivos(2026-02-01, 2026-02-10) = 10
    // Paso 1 (revertir): 2026-04-10 - 10 = 2026-03-31
    const fechaFinRev = sumarDias("2026-04-10", -10);
    expect(fechaFinRev).toBe("2026-03-31");

    // Rango identico (N' = N = 10): el resultado final no cambia fechaFin,
    // igual que el caso limite 7 (2026-04-10 - 10 + 10 = 2026-04-10).
    expect(
      fechaFinTrasEdicion(
        "2026-04-10",
        "2026-02-01",
        "2026-02-10",
        "2026-02-01",
        "2026-02-10"
      )
    ).toBe("2026-04-10");

    // Paso 2 (aplicar N' = diasInclusivos(2026-02-08, 2026-02-09) = 2) sobre
    // el intermedio da lo mismo que aplicar la formula directa de una sola vez.
    const formulaDirecta = fechaFinTrasEdicion(
      "2026-04-10",
      "2026-02-01",
      "2026-02-10",
      "2026-02-08",
      "2026-02-09"
    );
    expect(formulaDirecta).toBe("2026-04-02");
    expect(sumarDias(fechaFinRev, 2)).toBe(formulaDirecta);
  });
});
