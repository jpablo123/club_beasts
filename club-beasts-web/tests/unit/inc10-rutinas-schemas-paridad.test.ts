/**
 * INC-10 (RED) — Paridad del espejo de validación web con el contrato canónico.
 * Criterios: C4 (espejo `src/lib/rutina-schemas.ts`, sin zod) / INC10-R04
 * (anti-deriva INC09-R08).
 *
 * El web NO importa `features/` en producto (tsconfig/dependencias propias) y
 * no usa zod: la validación de UI es un ESPEJO de
 * `HU-18|HU-19|HU-20|HU-26-schemas.ts`. Este test es la barrera anti-drift:
 * compara el espejo contra los schemas CANÓNICOS de
 * `club-beasts-api/features/acceptance-criteria/` (import solo de TESTS,
 * permitido; el import de producto sigue prohibido).
 *
 * Contrato fijado por este RED para `src/lib/rutina-schemas.ts` (GREEN T8):
 *  - exporta los literales EXACTOS del bloque 6 (mismo orden y capitalización):
 *    TIPO_RUTINA, TIPO_RUTINA_BASE, NIVEL_EXPERIENCIA, DIA_SEMANA,
 *    GRUPO_MUSCULAR, UNIDAD_MEDIDA, MEDIDA_ANTROPOMETRICA, ZONA_BIOMECANICA,
 *    HALLAZGO_BIOMECANICO.
 *  - exporta `LIMITES_RUTINA` con los límites exactos C4:
 *    { macrociclos: 20, mesociclos: 20, microciclos: 20, sesiones: 30,
 *      ejercicios: 30, series: 30, evaluaciones: 50 }.
 *  - exporta `SIN_RUTINA_MENSAJE` = "No tienes una rutina activa" y
 *    `MENSAJES_ASIGNACION` (5 literales DEC-070 idénticos al canónico).
 *  - exporta `validarCampo(campo, valor): string | null` con los MISMOS
 *    mensajes (primer error) de los validadores hoja del canónico.
 *  - exporta `validarContencionCiclos(macrociclos): string[]` idéntico al
 *    canónico (mismos mensajes por nombre de ciclo).
 *
 * FASE RED (2026-11-05): el espejo NO existe (GREEN T8). Los tests fallan por
 * COMPORTAMIENTO AUSENTE (módulo inexistente) con mensaje explícito.
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 */
import { describe, it, expect } from "vitest";

const RUTA_ESPEJO = "../../src/lib/rutina-schemas";
const RUTA_CANONICO_HU18 = "../../../club-beasts-api/features/acceptance-criteria/HU-18-schemas";
const RUTA_CANONICO_HU19 = "../../../club-beasts-api/features/acceptance-criteria/HU-19-schemas";
const RUTA_CANONICO_HU20 = "../../../club-beasts-api/features/acceptance-criteria/HU-20-schemas";
const RUTA_CANONICO_HU26 = "../../../club-beasts-api/features/acceptance-criteria/HU-26-schemas";

async function importarEspejo(): Promise<any> {
  const ruta: string = RUTA_ESPEJO;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC10-RED: falta el espejo de producto src/lib/rutina-schemas.ts " +
        "(validacion de UI, GREEN T8). Fallo de comportamiento ausente esperado."
    );
  }
}

async function importarModulo(ruta: string, etiqueta: string): Promise<any> {
  const especificador: string = ruta;
  try {
    return await import(/* @vite-ignore */ especificador);
  } catch {
    throw new Error(
      `INC10-RED: no se pudo importar el contrato canonico ${etiqueta} ` +
        `(entorno/fixture del RED, no comportamiento).`
    );
  }
}

/** Primer mensaje del validador hoja canónico para un valor (INC09-R08). */
function mensajeHoja(schema: any, valor: unknown): string | null {
  const resultado = schema.safeParse(valor);
  if (resultado.success) return null;
  return resultado.error.errors[0].message as string;
}

/** [campo, valor] que deben validar igual en espejo y canónico. */
const CASOS_VALIDOS: Array<[string, unknown]> = [
  ["nombre", "Rutina base INC10"],
  ["nombre", "Rutina personalizada 2"],
  ["nombreItem", "Sesion fuerza A"],
  ["nombreItem", "Micro. 1 (avanzado)"],
  ["textoLargo", "Descripcion corta"],
  ["textoLargo", null],
  ["textoLargo", undefined],
  ["objetivoGeneral", "Ganar masa muscular"],
  ["diagnostico", "Buena postura general"],
  ["textoDiagnostico", "Sin restricciones"],
  ["textoDiagnostico", null],
  ["resultado", "100 kg"],
  ["valorMedida", 75.5],
  ["valorMedida", 0.1],
  ["valorMedida", 500],
  ["descripcionHallazgo", "Leve molestia"],
  ["descripcionHallazgo", null],
  ["repeticiones", "8"],
  ["repeticiones", "8-12"],
  ["repeticiones", "999-999"],
  ["intensidad", "70% 1RM"],
  ["descansoSegundos", 0],
  ["descansoSegundos", 3600],
  ["fechaEvaluacion", "2026-01-01"],
];

/** [campo, valor] inválidos: el espejo debe emitir EXACTAMENTE el mensaje canónico. */
const CASOS_INVALIDOS: Array<[string, unknown]> = [
  ["nombre", "ab"],
  ["nombre", "a".repeat(101)],
  ["nombre", "Rutina@1"],
  ["nombreItem", "ab"],
  ["nombreItem", "a".repeat(121)],
  ["textoLargo", ""],
  ["textoLargo", "a".repeat(501)],
  ["objetivoGeneral", "Ganar mas"],
  ["objetivoGeneral", "a".repeat(1001)],
  ["diagnostico", "Bien"],
  ["diagnostico", "a".repeat(2001)],
  ["textoDiagnostico", ""],
  ["textoDiagnostico", "a".repeat(1001)],
  ["resultado", ""],
  ["resultado", "a".repeat(201)],
  ["valorMedida", 0],
  ["valorMedida", 500.1],
  ["descripcionHallazgo", ""],
  ["descripcionHallazgo", "a".repeat(501)],
  ["repeticiones", "15-8"],
  ["repeticiones", "0"],
  ["repeticiones", "1000"],
  ["repeticiones", "abc"],
  ["repeticiones", "8-"],
  ["repeticiones", "9999-9999"],
  ["intensidad", ""],
  ["intensidad", "a".repeat(51)],
  ["descansoSegundos", -1],
  ["descansoSegundos", 3601],
  ["descansoSegundos", 90.5],
  ["fechaEvaluacion", "2099-01-01"],
  ["fechaEvaluacion", "31/01/2026"],
];

/** Mapa campo -> schema canónico COMO VIAJA en el contrato (fuente de mensajes).
 *  Los campos opcionales usan el envoltorio `opcionalTexto` del canónico
 *  (null/ausente = sin diligenciar; el texto presente sí valida rango). */
function hojaCanonica(canonico19: any, canonico18: any, campo: string): any {
  const hojas: Record<string, any> = {
    nombre: canonico19.nombreRutinaBase,
    nombreItem: canonico19.nombreItemBase,
    textoLargo: canonico19.opcionalTexto(canonico19.textoLargoBase),
    objetivoGeneral: canonico19.objetivoGeneralBase,
    diagnostico: canonico19.diagnosticoBase,
    textoDiagnostico: canonico19.opcionalTexto(canonico19.textoDiagnosticoBase),
    resultado: canonico19.resultadoTestBase,
    valorMedida: canonico19.valorMedidaBase,
    descripcionHallazgo: canonico19.opcionalTexto(canonico19.descripcionHallazgoBase),
    repeticiones: canonico19.repeticionesBase,
    intensidad: canonico19.intensidadBase,
    descansoSegundos: canonico19.descansoSegundosBase,
    fechaEvaluacion: canonico19.fechaEvaluacionBase,
  };
  const hoja = hojas[campo];
  if (!hoja) throw new Error(`INC10-RED: campo desconocido en la tabla de paridad: ${campo}`);
  return hoja;
}

/** Árbol macro inválido: mesociclo fuera del macrociclo. */
const MACRO_MESO_FUERA = {
  nombre: "Macro 1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  objetivo: null,
  observaciones: null,
  mesociclos: [
    {
      nombre: "Meso 1",
      fechaInicio: "2025-12-01",
      fechaFin: "2026-06-30",
      objetivo: null,
      observaciones: null,
      microciclos: [
        {
          nombre: "Micro 1",
          fechaInicio: "2026-01-01",
          fechaFin: "2026-01-31",
          objetivo: null,
          observaciones: null,
          sesiones: [],
        },
      ],
    },
  ],
};

/** Árbol macro inválido: microciclo fuera del mesociclo. */
const MACRO_MICRO_FUERA = {
  nombre: "Macro 1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  objetivo: null,
  observaciones: null,
  mesociclos: [
    {
      nombre: "Meso 1",
      fechaInicio: "2026-01-01",
      fechaFin: "2026-06-30",
      objetivo: null,
      observaciones: null,
      microciclos: [
        {
          nombre: "Micro 1",
          fechaInicio: "2026-01-01",
          fechaFin: "2026-07-15",
          objetivo: null,
          observaciones: null,
          sesiones: [],
        },
      ],
    },
  ],
};

describe("paridad espejo web ↔ schemas canónicos (INC10-R04/C4)", () => {
  it("los literales del bloque 6 son idénticos (mismo orden y capitalización)", async () => {
    const espejo = await importarEspejo();
    const canonico19 = await importarModulo(RUTA_CANONICO_HU19, "HU-19-schemas");
    const canonico18 = await importarModulo(RUTA_CANONICO_HU18, "HU-18-schemas");
    for (const literal of [
      "TIPO_RUTINA",
      "NIVEL_EXPERIENCIA",
      "DIA_SEMANA",
      "GRUPO_MUSCULAR",
      "UNIDAD_MEDIDA",
      "MEDIDA_ANTROPOMETRICA",
      "ZONA_BIOMECANICA",
      "HALLAZGO_BIOMECANICO",
    ] as const) {
      expect([...espejo[literal]], `literal ${literal}`).toEqual([...canonico19[literal]]);
    }
    expect([...espejo.TIPO_RUTINA_BASE]).toEqual([...canonico18.TIPO_RUTINA_BASE]);
  });

  it("LIMITES_RUTINA son los límites exactos C4", async () => {
    const espejo = await importarEspejo();
    expect(espejo.LIMITES_RUTINA).toEqual({
      macrociclos: 20,
      mesociclos: 20,
      microciclos: 20,
      sesiones: 30,
      ejercicios: 30,
      series: 30,
      evaluaciones: 50,
    });
  });

  it("SIN_RUTINA_MENSAJE coincide con el literal del canónico HU-26", async () => {
    const espejo = await importarEspejo();
    const canonico26 = await importarModulo(RUTA_CANONICO_HU26, "HU-26-schemas");
    expect(espejo.SIN_RUTINA_MENSAJE).toBe(canonico26.SIN_RUTINA_MENSAJE);
    expect(espejo.SIN_RUTINA_MENSAJE).toBe("No tienes una rutina activa");
  });

  it("MENSAJES_ASIGNACION es idéntico al canónico HU-20 (5 literales)", async () => {
    const espejo = await importarEspejo();
    const canonico20 = await importarModulo(RUTA_CANONICO_HU20, "HU-20-schemas");
    expect(espejo.MENSAJES_ASIGNACION).toEqual(canonico20.MENSAJES_ASIGNACION);
  });

  for (const [campo, valor] of CASOS_VALIDOS) {
    it(`validarCampo(${campo}, ${JSON.stringify(valor)}) -> null`, async () => {
      const espejo = await importarEspejo();
      const canonico19 = await importarModulo(RUTA_CANONICO_HU19, "HU-19-schemas");
      const canonico18 = await importarModulo(RUTA_CANONICO_HU18, "HU-18-schemas");
      const hoja = hojaCanonica(canonico19, canonico18, campo);
      expect(mensajeHoja(hoja, valor), "el caso debe ser válido en el canónico").toBeNull();
      expect(espejo.validarCampo(campo, valor)).toBeNull();
    });
  }

  for (const [campo, valor] of CASOS_INVALIDOS) {
    it(`validarCampo(${campo}, ${JSON.stringify(valor)}) -> mensaje del canónico`, async () => {
      const espejo = await importarEspejo();
      const canonico19 = await importarModulo(RUTA_CANONICO_HU19, "HU-19-schemas");
      const canonico18 = await importarModulo(RUTA_CANONICO_HU18, "HU-18-schemas");
      const hoja = hojaCanonica(canonico19, canonico18, campo);
      const esperado = mensajeHoja(hoja, valor);
      expect(esperado, "el caso debe ser inválido en el canónico").not.toBeNull();
      expect(espejo.validarCampo(campo, valor)).toBe(esperado);
    });
  }

  it("validarContencionCiclos del espejo es idéntico al canónico (mismos mensajes)", async () => {
    const espejo = await importarEspejo();
    const canonico19 = await importarModulo(RUTA_CANONICO_HU19, "HU-19-schemas");
    for (const arbol of [MACRO_MESO_FUERA, MACRO_MICRO_FUERA]) {
      const erroresEsperados = canonico19.validarContencionCiclos([arbol]);
      expect(erroresEsperados.length, "premisa: el árbol debe ser inválido").toBeGreaterThan(0);
      expect(espejo.validarContencionCiclos([arbol])).toEqual(erroresEsperados);
    }
    expect(espejo.validarContencionCiclos([])).toEqual([]);
  });
});
