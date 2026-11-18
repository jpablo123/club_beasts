/**
 * INC-10 (RED) — Contrato canónico de schemas de rutinas (unit).
 * Criterios: RU-02 (validación creación base), RU-03 (secciones B1/B2),
 * RU-06 (tipo inmutable), RU-10 (info/diagnóstico 7 campos DEC-062),
 * RU-11 (árbol macro-meso-micro), RU-12 (fechas y contención DEC-018),
 * RU-13 (sesión->ejercicio->serie), RU-14 (evaluaciones tipadas DEC-063:
 * 13 medidas / 10 zonas / 4 hallazgos), RU-15 (completitud), RU-19 (límites
 * C4 y contrato cerrado), RU-20/23 (regla de vigencia), RU-21/31 (cierre),
 * RU-35 (invariante 0-1 activas), RU-36..RU-38 (visibilidad portal),
 * RU-39 (SIN_RUTINA_MENSAJE), RU-41 (portal strict sin `actor`) y literales
 * DEC-070.
 *
 * Estos tests fijan los schemas CANÓNICOS de
 * `features/acceptance-criteria/HU-18|HU-19|HU-20|HU-21|HU-26-schemas.ts`
 * (INC09-R08 anti-deriva): los tests de integración derivan de aquí sus
 * mensajes y el GREEN debe copiarlos sin cambios a `src/schemas/rutina.schema.ts`.
 *
 * Nota de fase: los schemas canónicos EXISTEN hoy (los generó el analista),
 * por lo que estos tests están en VERDE desde el RED: son la barrera de drift
 * para el GREEN. El rojo de comportamiento vive en los tests de integración
 * (endpoints inexistentes) y en los de web/E2E (pantallas inexistentes).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 *
 * ── ENMIENDA INC10-FIX-01 (patrón C4) — INC-10-rutinas, re-escopo de unit ──
 * Contrato de enmienda: cambios documentados header + inline, nunca edición
 * silenciosa. Re-escopo del conteo del contrato de error DEC-070 (única
 * expectativa afectada; 0 cambios de expectativa de negocio):
 *   (1) DECISIÓN (5+1 separado): `CODIGOS_ERROR_ASIGNACION`/
 *       `MENSAJES_ASIGNACION` se mantienen en sus 5 entradas base — los
 *       exports canónicos NO se amplían (`features/**`/`src/**` fuera de
 *       alcance de INC10-FIX-01, enmienda C4 de T7 ya aplicada) — y el 6º
 *       código `ASIGNACION_CONFLICTO` (DEC-070, 409 de concurrencia) se
 *       aserta por separado vía `CODIGO_ASIGNACION_CONFLICTO`/
 *       `MENSAJE_ASIGNACION_CONFLICTO` (mensaje exacto: "Otra asignación
 *       cambió la rutina activa del cliente: vuelve a intentar").
 *   (2) Los asserts de `MENSAJES_ASIGNACION`/`CODIGOS_ERROR_ASIGNACION`
 *       (abajo) fijan los 5 códigos base SIN cambios y cubren además el 6º
 *       literal y la unión completa de 6 códigos del contrato DEC-070.
 * Ninguna otra cláusula de este archivo cambia.
 */
import { describe, it, expect } from "vitest";
import {
  DIA_SEMANA,
  GRUPO_MUSCULAR,
  HALLAZGO_BIOMECANICO,
  MEDIDA_ANTROPOMETRICA,
  NIVEL_EXPERIENCIA,
  SECCIONES_RUTINA,
  TIPO_RUTINA,
  UNIDAD_MEDIDA,
  ZONA_BIOMECANICA,
  actualizarRutinaPersonalizadaSchema,
  analisisBiomecanicoItemSchema,
  antropometriaItemSchema,
  crearRutinaPersonalizadaSchema,
  macrocicloSchema,
  rutinaPortalSchema,
  rutinaResumenSchema,
  sesionSchema,
  testSchema,
  validarContencionCiclos,
  type Macrociclo,
} from "../../features/acceptance-criteria/HU-19-schemas";
import {
  SECCIONES_RUTINA_BASE,
  TIPO_RUTINA_BASE,
  actualizarRutinaBaseSchema,
  crearRutinaBaseSchema,
  rutinaBaseDatosSchema,
} from "../../features/acceptance-criteria/HU-18-schemas";
import {
  CODIGO_ASIGNACION_CONFLICTO,
  CODIGOS_ERROR_ASIGNACION,
  ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA,
  MENSAJE_ASIGNACION_CONFLICTO,
  MENSAJES_ASIGNACION,
  asignarRutinaSchema,
  estadoAsignacionPorFechaFin,
  esVisibleRutinaPersonalizada,
  puedeActivarRutina,
  rutinaAsignacionSchema,
} from "../../features/acceptance-criteria/HU-20-schemas";
import {
  cerrarAsignacionActiva,
  historialRutinasSchema,
  maxUnaActivaPorCliente,
} from "../../features/acceptance-criteria/HU-21-schemas";
import {
  SIN_RUTINA_MENSAJE,
  TIPO_RUTINA_PORTAL,
  respuestaRutinaPortalSchema,
  rutinaPortalBaseSchema,
  rutinaPortalPersonalizadaSchema,
  sinRutinaPortalSchema,
  visibleEnPortal,
} from "../../features/acceptance-criteria/HU-26-schemas";

// ─── Helpers de derivación de mensajes (INC09-R08) ───────────────────────────

type ResultadoParse = { success: boolean; error?: any };

function primerError(resultado: ResultadoParse): string {
  if (resultado.success || !resultado.error) {
    throw new Error("se esperaba un error del schema canonico");
  }
  return resultado.error.errors[0].message as string;
}

function errorDeCampo(
  resultado: ResultadoParse,
  campo: string
): string | undefined {
  return resultado.error?.errors.find((e: any) => e.path[0] === campo)
    ?.message as string | undefined;
}

function hayErrorEn(resultado: ResultadoParse, campo: string): boolean {
  return Boolean(
    resultado.error?.errors.some((e: any) => e.path[0] === campo)
  );
}

/** Serie mínima válida. */
const SERIE = {
  repeticiones: "8-12",
  intensidad: "70% 1RM",
  descansoSegundos: 90,
};

/** Ejercicio mínimo válido. */
const EJERCICIO = {
  nombre: "Press banca",
  series: [SERIE],
};

/** Sesión mínima válida (raíz de genérica/inducción y hoja de microciclo). */
const SESION = {
  nombre: "Sesion fuerza A",
  dia: "lunes",
  ejercicios: [EJERCICIO],
};

/** Body mínimo válido de genérica/inducción (RU-01). */
function bodyBase(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "GENERICA",
    nombre: "Rutina base INC10",
    sesiones: [SESION],
    ...ajustes,
  };
}

/** Microciclo válido contenido en enero 2026. */
const MICRO = {
  nombre: "Micro 1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-01-31",
  sesiones: [SESION],
};

/** Mesociclo válido contenido en el primer semestre 2026. */
const MESO = {
  nombre: "Meso 1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-06-30",
  microciclos: [MICRO],
};

/** Macrociclo válido del año 2026. */
const MACRO = {
  nombre: "Macro 1",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  mesociclos: [MESO],
};

/** Body mínimo válido de personalizada (RU-09). */
function bodyPersonalizada(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "PERSONALIZADA",
    nombre: "Rutina personalizada INC10",
    informacionGeneral: {
      objetivoGeneral: "Ganar masa muscular",
      nivelExperiencia: "INTERMEDIO",
      fechaEvaluacion: "2026-01-01",
    },
    diagnostico: {
      diagnostico: "Buena postura general",
    },
    macrociclos: [MACRO],
    ...ajustes,
  };
}

/** Árbol macro válido para `validarContencionCiclos`. */
function macroArbol(
  ajustesMacro: Record<string, unknown> = {},
  ajustesMeso: Record<string, unknown> = {},
  ajustesMicro: Record<string, unknown> = {}
): Macrociclo {
  return {
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
            fechaFin: "2026-01-31",
            objetivo: null,
            observaciones: null,
            sesiones: [SESION as never],
            ...ajustesMicro,
          },
        ],
        ...ajustesMeso,
      },
    ],
    ...ajustesMacro,
  } as Macrociclo;
}

// ─── RU-02 / RU-08 — validación de la creación base y contrato cerrado ───────

describe("RU-02 validación de campos de creación base (mensajes exactos)", () => {
  it("nombre corto (2) -> 'Nombre debe tener entre 3 y 100 caracteres'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ nombre: "ab" })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "nombre")).toBe(
      "Nombre debe tener entre 3 y 100 caracteres"
    );
  });

  it("nombre largo (101) -> mismo mensaje de rango", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ nombre: "a".repeat(101) })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "nombre")).toBe(
      "Nombre debe tener entre 3 y 100 caracteres"
    );
  });

  it("nombre con caracteres no permitidos ('Rutina@1') -> 'Nombre contiene caracteres no permitidos'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ nombre: "Rutina@1" })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "nombre")).toBe(
      "Nombre contiene caracteres no permitidos"
    );
  });

  it("nombre ausente -> fallo del schema en el campo nombre (GAP documentado: sin required_error)", () => {
    // GAP INC10-R08-GAP-01: `nombreRutinaBase` (HU-19-schemas) no define
    // `required_error`, por lo que el canónico emite el default de zod para el
    // campo ausente, mientras la tabla de RU-02 espera el mensaje de rango.
    // Derivación INC09-R08 = el canónico manda; el divergencia se reporta al
    // orquestador (mismo tratamiento para `sesiones` ausentes).
    const { nombre: _omitido, ...sinNombre } = bodyBase();
    const resultado = crearRutinaBaseSchema.safeParse(sinNombre);
    expect(resultado.success).toBe(false);
    expect(hayErrorEn(resultado, "nombre")).toBe(true);
  });

  it("tipoRutina PERSONALIZADA -> 'Tipo de rutina debe ser GENERICA o INDUCCION'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ tipoRutina: "PERSONALIZADA" })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "tipoRutina")).toBe(
      "Tipo de rutina debe ser GENERICA o INDUCCION"
    );
  });

  it("tipoRutina en minúsculas ('generica') -> mismo mensaje (enum cerrado)", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ tipoRutina: "generica" })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "tipoRutina")).toBe(
      "Tipo de rutina debe ser GENERICA o INDUCCION"
    );
  });

  it("sesiones: [] -> 'Debe registrar al menos 1 sesión'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(bodyBase({ sesiones: [] }));
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "sesiones")).toBe(
      "Debe registrar al menos 1 sesión"
    );
  });

  it("sesiones ausentes -> fallo del schema en el campo sesiones (GAP: sin required_error)", () => {
    const { sesiones: _omitido, ...sinSesiones } = bodyBase();
    const resultado = crearRutinaBaseSchema.safeParse(sinSesiones);
    expect(resultado.success).toBe(false);
    expect(hayErrorEn(resultado, "sesiones")).toBe(true);
  });

  it("nivelExperiencia fuera de enum -> 'Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ nivelExperiencia: "EXPERTO" })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "nivelExperiencia")).toBe(
      "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO"
    );
  });

  it("descripcion de 501 caracteres -> 'El texto debe tener entre 1 y 500 caracteres'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ descripcion: "a".repeat(501) })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "descripcion")).toBe(
      "El texto debe tener entre 1 y 500 caracteres"
    );
  });

  it("sesión sin ejercicios -> 'Cada sesión debe tener al menos 1 ejercicio'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({ sesiones: [{ nombre: "Sesion vacia", ejercicios: [] }] })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada sesión debe tener al menos 1 ejercicio");
  });

  it("ejercicio sin series -> 'Cada ejercicio debe tener al menos 1 serie'", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({
        sesiones: [
          { nombre: "Sesion fuerza A", ejercicios: [{ nombre: "Sentadilla", series: [] }] },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada ejercicio debe tener al menos 1 serie");
  });
});

describe("RU-08 contrato cerrado (.strict())", () => {
  it("campo desconocido en creación base -> fallo del schema (strict)", () => {
    const resultado = crearRutinaBaseSchema.safeParse(bodyBase({ extra: 1 }));
    expect(resultado.success).toBe(false);
  });

  it("campo desconocido en creación personalizada -> fallo del schema (strict)", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ extra: 1 })
    );
    expect(resultado.success).toBe(false);
  });

  it("serie con campo desconocido -> fallo del schema (strict)", () => {
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({
        sesiones: [
          {
            nombre: "Sesion fuerza A",
            ejercicios: [{ nombre: "Press banca", series: [{ ...SERIE, peso: 80 }] }],
          },
        ],
      })
    );
    expect(resultado.success).toBe(false);
  });
});

// ─── RU-03 — secciones B1/B2 cubren exactamente el contrato ──────────────────

describe("RU-03 estructura organizada (SECCIONES_RUTINA_BASE)", () => {
  it("B1+B2 cubren exactamente los campos de la creación base (sin campos fuera de sección)", () => {
    const union = [
      ...SECCIONES_RUTINA_BASE.B1.campos,
      ...SECCIONES_RUTINA_BASE.B2.campos,
    ];
    expect(new Set(union).size, "sin campos duplicados").toBe(union.length);
    expect([...union].sort()).toEqual(
      ["descripcion", "nivelExperiencia", "nombre", "objetivo", "sesiones", "tipoRutina"].sort()
    );
    expect(SECCIONES_RUTINA_BASE.B1.titulo).toBe("Informacion general");
    expect(SECCIONES_RUTINA_BASE.B2.titulo).toBe("Sesiones y ejercicios");
  });
});

// ─── RU-06 — tipoRutina inmutable en el PATCH base ───────────────────────────

describe("RU-06 actualización base (merge por secciones, tipo inmutable)", () => {
  it("PATCH solo con descripcion es válido (ausente = conserva)", () => {
    const resultado = actualizarRutinaBaseSchema.safeParse({
      descripcion: "Nueva descripcion",
    });
    expect(resultado.success).toBe(true);
  });

  it("tipoRutina en el body del PATCH -> fallo (inmutable, fuera del contrato)", () => {
    const resultado = actualizarRutinaBaseSchema.safeParse({
      tipoRutina: "INDUCCION",
    });
    expect(resultado.success).toBe(false);
  });
});

// ─── RU-10 — información general + diagnóstico (DEC-062: 7 campos) ───────────

describe("RU-10 información general y diagnóstico (7 campos)", () => {
  it("SECCIONES_RUTINA P1+P2 son exactamente los 7 campos de DEC-062", () => {
    expect([...SECCIONES_RUTINA.P1.campos]).toEqual([
      "objetivoGeneral",
      "nivelExperiencia",
      "fechaEvaluacion",
    ]);
    expect([...SECCIONES_RUTINA.P2.campos]).toEqual([
      "diagnostico",
      "restriccionesMedicas",
      "lesionesPrevias",
      "observacionesGenerales",
    ]);
  });

  it("objetivoGeneral de 9 caracteres -> 'Objetivo general debe tener entre 10 y 1000 caracteres'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        informacionGeneral: {
          objetivoGeneral: "Ganar mas",
          nivelExperiencia: "INTERMEDIO",
          fechaEvaluacion: "2026-01-01",
        },
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Objetivo general debe tener entre 10 y 1000 caracteres"
    );
  });

  it("fechaEvaluacion futura -> 'Fecha de evaluación no puede ser futura'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        informacionGeneral: {
          objetivoGeneral: "Ganar masa muscular",
          nivelExperiencia: "INTERMEDIO",
          fechaEvaluacion: "2099-01-01",
        },
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Fecha de evaluación no puede ser futura");
  });

  it("fechaEvaluacion mal formada -> 'Fecha de evaluación debe ser una fecha válida (YYYY-MM-DD)'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        informacionGeneral: {
          objetivoGeneral: "Ganar masa muscular",
          nivelExperiencia: "INTERMEDIO",
          fechaEvaluacion: "31/01/2026",
        },
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Fecha de evaluación debe ser una fecha válida (YYYY-MM-DD)"
    );
  });

  it("diagnostico de 4 caracteres -> 'Diagnóstico debe tener entre 5 y 2000 caracteres'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ diagnostico: { diagnostico: "Bien" } })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Diagnóstico debe tener entre 5 y 2000 caracteres"
    );
  });

  it("restriccionesMedicas de 1001 caracteres -> 'El texto debe tener entre 1 y 1000 caracteres'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        diagnostico: {
          diagnostico: "Buena postura general",
          restriccionesMedicas: "a".repeat(1001),
        },
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "El texto debe tener entre 1 y 1000 caracteres"
    );
  });

  it("informacionGeneral ausente -> fallo con la marca del bloque requerido", () => {
    const { informacionGeneral: _omitido, ...sinInfo } = bodyPersonalizada();
    const resultado = crearRutinaPersonalizadaSchema.safeParse(sinInfo);
    expect(resultado.success).toBe(false);
    expect(
      resultado.error?.errors.some((e: any) => e.path[0] === "informacionGeneral")
    ).toBe(true);
  });

  it("diagnostico ausente -> fallo con la marca del bloque requerido", () => {
    const { diagnostico: _omitido, ...sinDiag } = bodyPersonalizada();
    const resultado = crearRutinaPersonalizadaSchema.safeParse(sinDiag);
    expect(resultado.success).toBe(false);
    expect(
      resultado.error?.errors.some((e: any) => e.path[0] === "diagnostico")
    ).toBe(true);
  });
});

// ─── RU-11 / RU-12 — árbol macro-meso-micro y contención de fechas ───────────

describe("RU-11 árbol macro-meso-micro (mensajes por nivel)", () => {
  it("macrociclos: [] -> 'Debe registrar al menos un macrociclo'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ macrociclos: [] })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "macrociclos")).toBe(
      "Debe registrar al menos un macrociclo"
    );
  });

  it("macro sin mesociclos -> 'Cada macrociclo debe tener al menos 1 mesociclo'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [
          { nombre: "Macro 1", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", mesociclos: [] },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada macrociclo debe tener al menos 1 mesociclo");
  });

  it("meso sin microciclos -> 'Cada mesociclo debe tener al menos 1 microciclo'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [
          {
            nombre: "Macro 1",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-12-31",
            mesociclos: [
              { nombre: "Meso 1", fechaInicio: "2026-01-01", fechaFin: "2026-06-30", microciclos: [] },
            ],
          },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada mesociclo debe tener al menos 1 microciclo");
  });

  it("micro sin sesiones -> 'Cada microciclo debe tener al menos 1 sesión'", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [
          {
            nombre: "Macro 1",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-12-31",
            mesociclos: [
              {
                nombre: "Meso 1",
                fechaInicio: "2026-01-01",
                fechaFin: "2026-06-30",
                microciclos: [
                  { nombre: "Micro 1", fechaInicio: "2026-01-01", fechaFin: "2026-01-31", sesiones: [] },
                ],
              },
            ],
          },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada microciclo debe tener al menos 1 sesión");
  });
});

describe("RU-12 fechas de ciclos y contención (DEC-018)", () => {
  it("macro con fechaFin < fechaInicio -> 'Fecha de fin no puede ser anterior a la fecha de inicio'", () => {
    const resultado = macrocicloSchema.safeParse({
      nombre: "Macro 1",
      fechaInicio: "2026-03-31",
      fechaFin: "2026-01-01",
      mesociclos: [MESO],
    });
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "fechaFin")).toBe(
      "Fecha de fin no puede ser anterior a la fecha de inicio"
    );
  });

  it("fechaFin inválida ('2026-02-30') -> 'Fecha de fin debe ser una fecha válida (YYYY-MM-DD)'", () => {
    const resultado = macrocicloSchema.safeParse({
      nombre: "Macro 1",
      fechaInicio: "2026-01-01",
      fechaFin: "2026-02-30",
      mesociclos: [MESO],
    });
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "fechaFin")).toBe(
      "Fecha de fin debe ser una fecha válida (YYYY-MM-DD)"
    );
  });

  it("validarContencionCiclos: mesociclo fuera del macrociclo -> mensaje por nombre", () => {
    const errores = validarContencionCiclos([
      macroArbol({}, { fechaInicio: "2025-12-01", fechaFin: "2026-06-30" }),
    ]);
    expect(errores).toContain(
      "Mesociclo 'Meso 1' debe estar contenido en el rango del macrociclo 'Macro 1'"
    );
  });

  it("validarContencionCiclos: microciclo fuera del mesociclo -> mensaje por nombre", () => {
    const errores = validarContencionCiclos([
      macroArbol({}, {}, { fechaInicio: "2026-01-01", fechaFin: "2026-07-15" }),
    ]);
    expect(errores).toContain(
      "Microciclo 'Micro 1' debe estar contenido en el rango del mesociclo 'Meso 1'"
    );
  });

  it("validarContencionCiclos: árbol contenido -> sin errores", () => {
    expect(validarContencionCiclos([macroArbol()])).toEqual([]);
  });

  it("el microciclo sale del rango del mesociclo -> la creación completa falla con el mensaje de contención (RU-12)", () => {
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [
          {
            nombre: "Macro 1",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-12-31",
            mesociclos: [
              {
                nombre: "Meso 1",
                fechaInicio: "2026-01-01",
                fechaFin: "2026-06-30",
                microciclos: [
                  { nombre: "Micro 1", fechaInicio: "2026-01-01", fechaFin: "2026-07-15", sesiones: [SESION] },
                ],
              },
            ],
          },
        ],
      })
    );
    // La contención es del SERVICIO (validarContencionCiclos -> primer error).
    // El schema solo exige consistencia interna de cada ciclo; el envío pasa el
    // schema y el servicio debe rechazarlo con el mensaje de contención.
    expect(resultado.success).toBe(true);
    const errores = validarContencionCiclos(
      (resultado.data as { macrociclos: Macrociclo[] }).macrociclos
    );
    expect(errores[0]).toBe(
      "Microciclo 'Micro 1' debe estar contenido en el rango del mesociclo 'Meso 1'"
    );
  });
});

// ─── RU-13 — repeticiones / intensidad / descansoSegundos ────────────────────

describe("RU-13 serie: repeticiones, intensidad y descanso (valores límite)", () => {
  function serieCon(ajustes: Record<string, unknown>) {
    return crearRutinaBaseSchema.safeParse(
      bodyBase({
        sesiones: [
          {
            nombre: "Sesion fuerza A",
            ejercicios: [{ nombre: "Press banca", series: [{ ...SERIE, ...ajustes }] }],
          },
        ],
      })
    );
  }

  it("'15-8' (inicio > fin) -> 'Repeticiones: el valor inicial no puede superar al final'", () => {
    const resultado = serieCon({ repeticiones: "15-8" });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Repeticiones: el valor inicial no puede superar al final"
    );
  });

  it("'0' (fuera de 1..999) -> 'Repeticiones debe estar entre 1 y 999'", () => {
    const resultado = serieCon({ repeticiones: "0" });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Repeticiones debe estar entre 1 y 999");
  });

  it("'abc' -> \"Repeticiones debe tener formato '8' o '8-12'\"", () => {
    const resultado = serieCon({ repeticiones: "abc" });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Repeticiones debe tener formato '8' o '8-12'");
  });

  it("'999-999' (máx 7 chars) es válido", () => {
    expect(serieCon({ repeticiones: "999-999" }).success).toBe(true);
  });

  it("'9999-999' (8 chars) -> formato inválido", () => {
    const resultado = serieCon({ repeticiones: "9999-999" });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Repeticiones debe tener formato '8' o '8-12'");
  });

  it("descansoSegundos 3601 -> 'Descanso debe estar entre 0 y 3600 segundos'", () => {
    const resultado = serieCon({ descansoSegundos: 3601 });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Descanso debe estar entre 0 y 3600 segundos");
  });

  it("descansoSegundos -1 -> mismo mensaje de rango", () => {
    const resultado = serieCon({ descansoSegundos: -1 });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Descanso debe estar entre 0 y 3600 segundos");
  });

  it("descansoSegundos 90.5 (no entero) -> 'Descanso debe ser un número entero de segundos'", () => {
    const resultado = serieCon({ descansoSegundos: 90.5 });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Descanso debe ser un número entero de segundos");
  });

  it("intensidad de 51 caracteres -> 'Intensidad debe tener entre 1 y 50 caracteres'", () => {
    const resultado = serieCon({ intensidad: "a".repeat(51) });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Intensidad debe tener entre 1 y 50 caracteres");
  });

  it("descansoSegundos 0 y 3600 (extremos) son válidos", () => {
    expect(serieCon({ descansoSegundos: 0 }).success).toBe(true);
    expect(serieCon({ descansoSegundos: 3600 }).success).toBe(true);
  });
});

// ─── RU-14 — evaluaciones tipadas (DEC-063: 13/10/4) ─────────────────────────

describe("RU-14 evaluaciones tipadas (enums 13/10/4)", () => {
  it("los enums tienen el tamaño exacto DEC-063", () => {
    expect(MEDIDA_ANTROPOMETRICA).toHaveLength(13);
    expect(ZONA_BIOMECANICA).toHaveLength(10);
    expect(HALLAZGO_BIOMECANICO).toHaveLength(4);
    expect(UNIDAD_MEDIDA).toEqual(["kg", "cm", "%", "unidad"]);
    expect(NIVEL_EXPERIENCIA).toEqual(["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"]);
    expect(TIPO_RUTINA).toEqual(["GENERICA", "INDUCCION", "PERSONALIZADA"]);
    expect(TIPO_RUTINA_BASE).toEqual(["GENERICA", "INDUCCION"]);
    expect(DIA_SEMANA).toHaveLength(7);
    expect(GRUPO_MUSCULAR).toHaveLength(11);
  });

  it("cada literal de MEDIDA_ANTROPOMETRICA es aceptado", () => {
    for (const medida of MEDIDA_ANTROPOMETRICA) {
      const unidad = medida === "peso" || medida === "masaMuscular"
        ? "kg"
        : medida === "porcentajeGrasa"
          ? "%"
          : "cm";
      const resultado = antropometriaItemSchema.safeParse({
        medida,
        valor: 70.5,
        unidad,
        fecha: "2026-01-01",
      });
      expect(resultado.success, `medida ${medida}`).toBe(true);
    }
  });

  it("medida fuera del enum -> 'Medida antropométrica contiene un valor no permitido'", () => {
    const resultado = antropometriaItemSchema.safeParse({
      medida: "grasa_total",
      valor: 70.5,
      unidad: "kg",
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Medida antropométrica contiene un valor no permitido"
    );
  });

  it("unidad incoherente (peso en cm) -> \"Unidad debe ser 'kg' para la medida 'peso'\"", () => {
    const resultado = antropometriaItemSchema.safeParse({
      medida: "peso",
      valor: 70.5,
      unidad: "cm",
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "unidad")).toBe(
      "Unidad debe ser 'kg' para la medida 'peso'"
    );
  });

  it("valor de medida 0 -> 'Valor debe estar entre 0.1 y 500'", () => {
    const resultado = antropometriaItemSchema.safeParse({
      medida: "peso",
      valor: 0,
      unidad: "kg",
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Valor debe estar entre 0.1 y 500");
  });

  it("cada literal de ZONA_BIOMECANICA con cada HALLAZGO es aceptado", () => {
    for (const zona of ZONA_BIOMECANICA) {
      for (const hallazgo of HALLAZGO_BIOMECANICO) {
        const resultado = analisisBiomecanicoItemSchema.safeParse({
          zona,
          hallazgo,
          fecha: "2026-01-01",
        });
        expect(resultado.success, `${zona}/${hallazgo}`).toBe(true);
      }
    }
  });

  it("hallazgo fuera de enum -> 'Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO'", () => {
    const resultado = analisisBiomecanicoItemSchema.safeParse({
      zona: "RODILLA",
      hallazgo: "GRAVE",
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO"
    );
  });

  it("zona fuera de enum -> 'Zona anatómica contiene un valor no permitido'", () => {
    const resultado = analisisBiomecanicoItemSchema.safeParse({
      zona: "ESPINA",
      hallazgo: "LEVE",
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Zona anatómica contiene un valor no permitido");
  });

  it("test con resultado de 201 caracteres -> 'Resultado debe tener entre 1 y 200 caracteres'", () => {
    const resultado = testSchema.safeParse({
      nombre: "1RM sentadilla",
      resultado: "a".repeat(201),
      fecha: "2026-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Resultado debe tener entre 1 y 200 caracteres");
  });
});

// ─── RU-19 — límites de arreglos (C4) y contrato cerrado ─────────────────────

describe("RU-19 límites exactos de arreglos (C4: max+1 -> 400)", () => {
  it("21 macrociclos -> 'Puede registrar máximo 20 macrociclos'", () => {
    const macrociclos = Array.from({ length: 21 }, (_, i) => ({
      ...MACRO,
      nombre: `Macro ${i + 1}`,
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ macrociclos })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "macrociclos")).toBe(
      "Puede registrar máximo 20 macrociclos"
    );
  });

  it("21 mesociclos por macro -> 'Cada macrociclo puede tener máximo 20 mesociclos'", () => {
    const mesociclos = Array.from({ length: 21 }, (_, i) => ({
      ...MESO,
      nombre: `Meso ${i + 1}`,
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [{ ...MACRO, mesociclos }],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Cada macrociclo puede tener máximo 20 mesociclos"
    );
  });

  it("21 microciclos por meso -> 'Cada mesociclo puede tener máximo 20 microciclos'", () => {
    const microciclos = Array.from({ length: 21 }, (_, i) => ({
      ...MICRO,
      nombre: `Micro ${i + 1}`,
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [{ ...MACRO, mesociclos: [{ ...MESO, microciclos }] }],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Cada mesociclo puede tener máximo 20 microciclos"
    );
  });

  it("31 sesiones por micro -> 'Cada microciclo puede tener máximo 30 sesiones'", () => {
    const sesiones = Array.from({ length: 31 }, (_, i) => ({
      ...SESION,
      nombre: `Sesion ${i + 1}`,
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({
        macrociclos: [
          {
            ...MACRO,
            mesociclos: [{ ...MESO, microciclos: [{ ...MICRO, sesiones }] }],
          },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Cada microciclo puede tener máximo 30 sesiones"
    );
  });

  it("31 ejercicios por sesión -> 'Cada sesión puede tener máximo 30 ejercicios'", () => {
    const ejercicios = Array.from({ length: 31 }, (_, i) => ({
      ...EJERCICIO,
      nombre: `Ejercicio ${i + 1}`,
    }));
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({
        sesiones: [{ nombre: "Sesion fuerza A", ejercicios }],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada sesión puede tener máximo 30 ejercicios");
  });

  it("31 series por ejercicio -> 'Cada ejercicio puede tener máximo 30 series'", () => {
    const series = Array.from({ length: 31 }, () => ({ ...SERIE }));
    const resultado = crearRutinaBaseSchema.safeParse(
      bodyBase({
        sesiones: [
          { nombre: "Sesion fuerza A", ejercicios: [{ nombre: "Press banca", series }] },
        ],
      })
    );
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Cada ejercicio puede tener máximo 30 series");
  });

  it("31 sesiones en la base -> 'Puede registrar máximo 30 sesiones'", () => {
    const sesiones = Array.from({ length: 31 }, (_, i) => ({
      ...SESION,
      nombre: `Sesion ${i + 1}`,
    }));
    const resultado = crearRutinaBaseSchema.safeParse(bodyBase({ sesiones }));
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "sesiones")).toBe(
      "Puede registrar máximo 30 sesiones"
    );
  });

  it("51 tests -> 'Puede registrar máximo 50 tests'", () => {
    const tests = Array.from({ length: 51 }, (_, i) => ({
      nombre: `Test ${i + 1}`,
      resultado: "100",
      fecha: "2026-01-01",
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ tests })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "tests")).toBe("Puede registrar máximo 50 tests");
  });

  it("51 medidas antropométricas -> 'Puede registrar máximo 50 medidas antropométricas'", () => {
    const antropometria = Array.from({ length: 51 }, () => ({
      medida: "peso",
      valor: 70.5,
      unidad: "kg",
      fecha: "2026-01-01",
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ antropometria })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "antropometria")).toBe(
      "Puede registrar máximo 50 medidas antropométricas"
    );
  });

  it("51 hallazgos biomecánicos -> 'Puede registrar máximo 50 hallazgos biomecánicos'", () => {
    const analisisBiomecanico = Array.from({ length: 51 }, () => ({
      zona: "RODILLA",
      hallazgo: "LEVE",
      fecha: "2026-01-01",
    }));
    const resultado = crearRutinaPersonalizadaSchema.safeParse(
      bodyPersonalizada({ analisisBiomecanico })
    );
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "analisisBiomecanico")).toBe(
      "Puede registrar máximo 50 hallazgos biomecánicos"
    );
  });

  it("actualizarRutinaPersonalizadaSchema rechaza tipoRutina (inmutable, strict)", () => {
    expect(
      actualizarRutinaPersonalizadaSchema.safeParse({ tipoRutina: "GENERICA" }).success
    ).toBe(false);
    expect(
      actualizarRutinaPersonalizadaSchema.safeParse({ diagnostico: { diagnostico: "Otra cosa" } })
        .success
    ).toBe(true);
  });
});

// ─── RU-20 / RU-23 — regla de vigencia (DEC-066) ─────────────────────────────

describe("RU-20/23 asignación y regla de vigencia", () => {
  it("asignarRutinaSchema acepta clienteId + rutinaId y fechaInicio opcional pasada", () => {
    expect(
      asignarRutinaSchema.safeParse({
        clienteId: "cl-1",
        rutinaId: "ru-1",
        fechaInicio: "2026-01-01",
      }).success
    ).toBe(true);
  });

  it("fechaInicio futura -> 'Fecha de inicio no puede ser futura'", () => {
    const resultado = asignarRutinaSchema.safeParse({
      clienteId: "cl-1",
      rutinaId: "ru-1",
      fechaInicio: "2099-01-01",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Fecha de inicio no puede ser futura");
  });

  it("fechaInicio mal formada -> 'Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)'", () => {
    const resultado = asignarRutinaSchema.safeParse({
      clienteId: "cl-1",
      rutinaId: "ru-1",
      fechaInicio: "31/01/2026",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe("Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)");
  });

  it("clienteId/rutinaId vacíos -> mensajes requeridos", () => {
    const sinCliente = asignarRutinaSchema.safeParse({ clienteId: "", rutinaId: "ru-1" });
    expect(sinCliente.success).toBe(false);
    expect(primerError(sinCliente)).toBe("clienteId es requerido");
    const sinRutina = asignarRutinaSchema.safeParse({ clienteId: "cl-1", rutinaId: "" });
    expect(sinRutina.success).toBe(false);
    expect(primerError(sinRutina)).toBe("rutinaId es requerido");
  });

  it("strict: fechaFin/estado/actor en el body -> fallo (son del sistema)", () => {
    for (const extra of [
      { fechaFin: "2026-12-31" },
      { estado: "ACTIVA" },
      { actor: { id: "u1", nombre: "Otro" } },
    ]) {
      const resultado = asignarRutinaSchema.safeParse({
        clienteId: "cl-1",
        rutinaId: "ru-1",
        ...extra,
      });
      expect(resultado.success, JSON.stringify(extra)).toBe(false);
    }
  });

  it("puedeActivarRutina: GENERICA/INDUCCION siempre permitidas sin vigencia (RU-24)", () => {
    for (const tipo of ["GENERICA", "INDUCCION"] as const) {
      expect(puedeActivarRutina(tipo)).toEqual({ permitido: true });
      expect(puedeActivarRutina(tipo, null)).toEqual({ permitido: true });
      expect(puedeActivarRutina(tipo, "VENCIDA")).toEqual({ permitido: true });
    }
  });

  it("puedeActivarRutina: PERSONALIZADA solo con vigencia ACTIVA (RU-23)", () => {
    expect(puedeActivarRutina("PERSONALIZADA", "ACTIVA")).toEqual({ permitido: true });
    for (const estado of ["NO_CONTRATADO", "PROGRAMADA", "CONGELADO", "VENCIDA"] as const) {
      const resultado = puedeActivarRutina("PERSONALIZADA", estado);
      expect(resultado, estado).toEqual({
        permitido: false,
        code: "SIN_VIGENCIA_PERSONALIZADA",
        error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
      });
    }
    expect(puedeActivarRutina("PERSONALIZADA", null)).toEqual({
      permitido: false,
      code: "SIN_VIGENCIA_PERSONALIZADA",
      error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
    });
    expect(puedeActivarRutina("PERSONALIZADA")).toEqual({
      permitido: false,
      code: "SIN_VIGENCIA_PERSONALIZADA",
      error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
    });
    expect(ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA).toEqual(["ACTIVA"]);
  });

  it("esVisibleRutinaPersonalizada: solo ACTIVA expone (DEC-066/INC05-PER-05)", () => {
    expect(esVisibleRutinaPersonalizada("ACTIVA")).toBe(true);
    for (const estado of ["NO_CONTRATADO", "PROGRAMADA", "CONGELADO", "VENCIDA"] as const) {
      expect(esVisibleRutinaPersonalizada(estado), estado).toBe(false);
    }
    expect(esVisibleRutinaPersonalizada(null)).toBe(false);
    expect(esVisibleRutinaPersonalizada(undefined)).toBe(false);
  });
});

// ─── DEC-070 — literales del contrato de error y estados ─────────────────────

describe("DEC-070 literales de error, marcadores y mensajes", () => {
  // ENMIENDA INC10-FIX-01 (INC-10, 2026-11-05) — DEC-070 re-escopo del conteo:
  // los 5 mensajes base quedan fijados SIN cambios; el 6º mensaje del 409 de
  // concurrencia se aserta por separado (decisión 5+1, ver header).
  it("MENSAJES_ASIGNACION tiene los mensajes exactos (5 base + 6º ASIGNACION_CONFLICTO aparte)", () => {
    expect(MENSAJES_ASIGNACION).toEqual({
      CLIENTE_NO_ENCONTRADO: "Cliente no encontrado",
      RUTINA_NO_ENCONTRADA: "Rutina no encontrada",
      SIN_VIGENCIA_PERSONALIZADA:
        "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
      RUTINA_YA_ACTIVA: "La rutina ya está activa para este cliente",
      CLIENTE_INACTIVO:
        "Cliente sin estado activo: no se le pueden asignar rutinas",
    });
    expect(MENSAJE_ASIGNACION_CONFLICTO).toBe(
      "Otra asignación cambió la rutina activa del cliente: vuelve a intentar"
    );
  });

  // ENMIENDA INC10-FIX-01 (INC-10, 2026-11-05) — DEC-070 completo = 6 códigos
  // de rechazo: los 5 base (tupla intacta) + `ASIGNACION_CONFLICTO` declarado
  // aparte (ENMIENDA C4 de T7). Se fija también la unión de 6 para que el
  // contrato DEC-070 quede cubierto completo (decisión 5+1, ver header).
  it("CODIGOS_ERROR_ASIGNACION cubre los 5 códigos base; DEC-070 completo suma ASIGNACION_CONFLICTO (6)", () => {
    expect([...CODIGOS_ERROR_ASIGNACION].sort()).toEqual(
      [
        "CLIENTE_INACTIVO",
        "CLIENTE_NO_ENCONTRADO",
        "RUTINA_NO_ENCONTRADA",
        "RUTINA_YA_ACTIVA",
        "SIN_VIGENCIA_PERSONALIZADA",
      ].sort()
    );
    expect(CODIGO_ASIGNACION_CONFLICTO).toBe("ASIGNACION_CONFLICTO");
    expect([...CODIGOS_ERROR_ASIGNACION, CODIGO_ASIGNACION_CONFLICTO].sort()).toEqual(
      [
        "ASIGNACION_CONFLICTO",
        "CLIENTE_INACTIVO",
        "CLIENTE_NO_ENCONTRADO",
        "RUTINA_NO_ENCONTRADA",
        "RUTINA_YA_ACTIVA",
        "SIN_VIGENCIA_PERSONALIZADA",
      ].sort()
    );
  });

  it("SIN_RUTINA_MENSAJE (HU-26) es el literal exacto", () => {
    expect(SIN_RUTINA_MENSAJE).toBe("No tienes una rutina activa");
    const resultado = sinRutinaPortalSchema.safeParse({ mensaje: SIN_RUTINA_MENSAJE });
    expect(resultado.success).toBe(true);
    expect(sinRutinaPortalSchema.safeParse({ mensaje: "x", actor: {} }).success).toBe(false);
  });
});

// ─── RU-21 / RU-31 / RU-35 — cierre, historial e invariante 0-1 ──────────────

describe("RU-21/31/35 cierre de asignación e invariante", () => {
  const activa = {
    id: "as-1",
    clienteId: "cl-1",
    rutina: { id: "ru-1", nombre: "Rutina X", tipoRutina: "GENERICA", descripcion: null },
    fechaInicio: "2026-11-01",
    fechaFin: null,
    estado: "ACTIVA",
    actor: { id: "u1", nombre: "David Rozo" },
    contenidoSnapshot: null,
  };

  it("estadoAsignacionPorFechaFin deriva ACTIVA/CERRADA sin columna", () => {
    expect(estadoAsignacionPorFechaFin(null)).toBe("ACTIVA");
    expect(estadoAsignacionPorFechaFin(undefined)).toBe("ACTIVA");
    expect(estadoAsignacionPorFechaFin("2026-11-05")).toBe("CERRADA");
  });

  it("cerrarAsignacionActiva cierra con fechaFin = fechaInicio de la nueva (RU-31)", () => {
    const cerrada = cerrarAsignacionActiva(activa as never, "2026-11-05");
    expect(cerrada).not.toBeNull();
    expect(cerrada?.fechaFin).toBe("2026-11-05");
    expect(cerrada?.estado).toBe("CERRADA");
  });

  it("cerrarAsignacionActiva sin activa previa devuelve null", () => {
    expect(cerrarAsignacionActiva(null, "2026-11-05")).toBeNull();
    expect(cerrarAsignacionActiva(undefined, "2026-11-05")).toBeNull();
  });

  it("maxUnaActivaPorCliente: 0 y 1 activas son válidas; 2 activas es inválida", () => {
    expect(maxUnaActivaPorCliente([])).toBe(true);
    expect(maxUnaActivaPorCliente([activa as never])).toBe(true);
    expect(
      maxUnaActivaPorCliente([
        activa as never,
        { ...activa, id: "as-2", fechaInicio: "2026-11-05" } as never,
      ])
    ).toBe(false);
    expect(
      maxUnaActivaPorCliente([
        { ...activa, fechaFin: "2026-11-05", estado: "CERRADA" } as never,
      ])
    ).toBe(true);
  });

  it("historialRutinasSchema exige clienteId, asignaciones[] y total entero >= 0", () => {
    expect(
      historialRutinasSchema.safeParse({ clienteId: "cl-1", asignaciones: [], total: 0 })
        .success
    ).toBe(true);
    expect(
      historialRutinasSchema.safeParse({ clienteId: "cl-1", asignaciones: [], total: -1 })
        .success
    ).toBe(false);
  });

  it("rutinaAsignacionSchema exige actor { id, nombre } y contenidoSnapshot opcional", () => {
    expect(rutinaAsignacionSchema.safeParse(activa).success).toBe(true);
    expect(
      rutinaAsignacionSchema.safeParse({ ...activa, actor: { id: "u1" } }).success
    ).toBe(false);
    expect(
      rutinaAsignacionSchema.safeParse({
        ...activa,
        contenidoSnapshot: bodyBase(),
      }).success
    ).toBe(true);
  });

  it("rutinaResumenSchema: { id, nombre, tipoRutina, descripcion }", () => {
    expect(
      rutinaResumenSchema.safeParse({
        id: "ru-1",
        nombre: "Rutina X",
        tipoRutina: "INDUCCION",
        descripcion: null,
      }).success
    ).toBe(true);
    expect(
      rutinaResumenSchema.safeParse({
        id: "ru-1",
        nombre: "Rutina X",
        tipoRutina: "BASE",
        descripcion: null,
      }).success
    ).toBe(false);
  });
});

// ─── RU-36..RU-42 — portal (DEC-068: estructura completa; strict sin staff) ──

describe("RU-36..RU-42 portal del cliente", () => {
  it("visibleEnPortal: genérica/inducción siempre; personalizada solo con vigencia ACTIVA", () => {
    expect(visibleEnPortal("GENERICA", null)).toBe(true);
    expect(visibleEnPortal("INDUCCION", "VENCIDA")).toBe(true);
    expect(visibleEnPortal("PERSONALIZADA", "ACTIVA")).toBe(true);
    for (const estado of ["NO_CONTRATADO", "PROGRAMADA", "CONGELADO", "VENCIDA"] as const) {
      expect(visibleEnPortal("PERSONALIZADA", estado), estado).toBe(false);
    }
  });

  it("TIPO_RUTINA_PORTAL: genérica/inducción visibles; personalizada discriminada aparte", () => {
    expect([...TIPO_RUTINA_PORTAL]).toEqual(["GENERICA", "INDUCCION"]);
  });

  it("rutinaPortalBaseSchema es strict y rechaza actor/actualizadoPor (SEC-01/SEC-03)", () => {
    const base = {
      tipoRutina: "GENERICA",
      asignacionId: "as-1",
      fechaInicio: "2026-11-01",
      nombre: "Rutina base INC10",
      descripcion: null,
      objetivo: null,
      nivelExperiencia: "PRINCIPIANTE",
      sesiones: [SESION],
    };
    expect(rutinaPortalBaseSchema.safeParse(base).success).toBe(true);
    expect(
      rutinaPortalBaseSchema.safeParse({ ...base, actor: { id: "u1", nombre: "David" } })
        .success
    ).toBe(false);
    expect(
      rutinaPortalBaseSchema.safeParse({
        ...base,
        actualizadoPor: { id: "u1", nombre: "David" },
      }).success
    ).toBe(false);
  });

  it("rutinaPortalPersonalizadaSchema expone la estructura completa (DEC-068) sin actor", () => {
    const personalizada = {
      tipoRutina: "PERSONALIZADA",
      asignacionId: "as-1",
      fechaInicio: "2026-11-01",
      nombre: "Rutina personalizada INC10",
      descripcion: null,
      informacionGeneral: {
        objetivoGeneral: "Ganar masa muscular",
        nivelExperiencia: "INTERMEDIO",
        fechaEvaluacion: "2026-01-01",
      },
      diagnostico: { diagnostico: "Buena postura general" },
      macrociclos: [MACRO],
      tests: [{ nombre: "1RM sentadilla", resultado: "100 kg", fecha: "2026-01-01" }],
      antropometria: [{ medida: "peso", valor: 70.5, unidad: "kg", fecha: "2026-01-01" }],
      analisisBiomecanico: [{ zona: "RODILLA", hallazgo: "LEVE", fecha: "2026-01-01" }],
    };
    expect(rutinaPortalPersonalizadaSchema.safeParse(personalizada).success).toBe(true);
    expect(
      rutinaPortalPersonalizadaSchema.safeParse({ ...personalizada, actor: { id: "u1" } })
        .success
    ).toBe(false);
  });

  it("respuestaRutinaPortalSchema acepta la rutina o el mensaje SIN_RUTINA", () => {
    expect(
      respuestaRutinaPortalSchema.safeParse({ mensaje: SIN_RUTINA_MENSAJE }).success
    ).toBe(true);
    const generica = {
      tipoRutina: "INDUCCION",
      asignacionId: "as-2",
      fechaInicio: "2026-11-01",
      nombre: "Rutina induccion INC10",
      descripcion: null,
      objetivo: null,
      nivelExperiencia: null,
      sesiones: [SESION],
    };
    expect(respuestaRutinaPortalSchema.safeParse(generica).success).toBe(true);
  });

  it("rutinaBaseDatosSchema/rutinaPortal exigen la forma de fecha y el resumen del staff", () => {
    const datos = {
      id: "ru-1",
      tipoRutina: "GENERICA",
      nombre: "Rutina base INC10",
      descripcion: null,
      objetivo: null,
      nivelExperiencia: "PRINCIPIANTE",
      sesiones: [SESION],
      fechaActualizacion: "2026-11-05T10:00:00.000Z",
      actualizadoPor: { id: "u1", nombre: "David Rozo" },
    };
    expect(rutinaBaseDatosSchema.safeParse(datos).success).toBe(true);
    expect(
      rutinaBaseDatosSchema.safeParse({ ...datos, actualizadoPor: { id: "u1" } }).success
    ).toBe(false);
  });
});
