/**
 * INC-10 (RED) — Creación y edición de la rutina PERSONALIZADA estructurada.
 * Criterios: RU-09..RU-19 (HU-19) + DEC-018 (macro-meso-micro), DEC-062
 * (7 campos info/diagnóstico), DEC-063 (evaluaciones tipadas), DEC-067
 * (snapshot sin retroactividad) y contrato API RATIFICADO (endpoints 1b/3/4).
 *
 * Endpoints fijados por este RED:
 *  - POST /rutinas-personalizadas (solo DUENO) -> 201
 *    `rutinaPersonalizadaDatosSchema`; 400 incluye `validarContencionCiclos`
 *    (fechas hijo ⊆ padre) ejecutado en servicio, con el PRIMER error.
 *  - GET /rutinas/:rutinaId -> detalle personalizado (árbol completo) +
 *    `actualizadoPor`.
 *  - PATCH /rutinas/:rutinaId -> 200 merge por secciones (presente = reemplaza
 *    el árbol de esa sección; ausente = conserva); `tipoRutina` inmutable.
 *
 * Mensajes derivados del schema CANONICO (INC09-R08):
 * `features/acceptance-criteria/HU-19-schemas.ts` (incluye
 * `validarContencionCiclos`).
 *
 * FASE RED (2026-11-05): los endpoints NO existen (GREEN T7).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 *
 * ENMIENDA C4 (INC-10, 2026-11-05) — D1 (prefijo numerico), D3 (spread de los
 * ajustes en RU-11) y D4 (fixture de vigencia ACTIVA en RU-33, DEC-066);
 * intencion y expectativas intactas.
 *
 * ENMIENDA INC10-FIX-05 (REV-05, 2026-11-15) — RU-17 ENMENDADO (patron C4,
 * producto 2026-11-15): el PATCH /rutinas/:rutinaId re-valida la contencion de
 * ciclos (RU-12/R4) sobre el ARBOL RESULTANTE DEL MERGE (antes solo la
 * creacion la ejecutaba; riesgo REV-05). "PATCH con macrociclos nuevos" pasa
 * de 200 a 400 VALIDATION_ERROR con el literal del PRIMER error
 * (INC05-CONF-01) y sin escritura. Se anaden 2 tests de rama: merge no
 * contenido a nivel micro -> 400 (+ arreglo corregido -> 200 reemplaza) y
 * PATCH parcial solo-renombre -> 200 con el arbol intacto.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  crearAppRutinas,
  loginDueno,
  loginRecepcionista,
  loginCliente,
  crearClienteUnico,
  crearSegundoDueno,
  crearRutinaPersonalizadaViaApi,
  fixtureVigenciaPersonalizada,
  asignarRutinaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  primerErrorCanonico,
  payloadRutinaPersonalizada,
  macrocicloValido,
  mesocicloValido,
  microcicloValido,
  sesionValida,
  PIN_CLIENTE_FIXTURE,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  actualizarRutinaPersonalizadaSchema,
  analisisBiomecanicoItemSchema,
  antropometriaItemSchema,
  crearRutinaPersonalizadaSchema,
  macrocicloSchema,
  rutinaPersonalizadaDatosSchema,
  validarContencionCiclos,
} from "../../features/acceptance-criteria/HU-19-schemas";
import {
  crearRutinaBaseSchema,
} from "../../features/acceptance-criteria/HU-18-schemas";
import { historialRutinasSchema } from "../../features/acceptance-criteria/HU-21-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10p"): cedulas de 10 digitos para `loginClientSchema` (`^\d{6,10}$`).
// Intencion intacta: unicidad por archivo + limpieza por `startsWith`.
const PREFIJO = "9952";

let app: any;
let dueno: SesionStaff;
let dueno2: SesionStaff;
let recep: SesionStaff;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc10-rutinas-secret";
  await limpiarFixtures(PREFIJO);
  ({ app } = await crearAppRutinas());
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
  dueno2 = await crearSegundoDueno(app);
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

async function getRutina(token: string, rutinaId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/rutinas/${rutinaId}`,
    headers: headers(token),
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

async function patchRutina(
  token: string,
  rutinaId: string,
  payload: Record<string, unknown>
) {
  const res = await app.inject({
    method: "PATCH",
    url: `/rutinas/${rutinaId}`,
    headers: headers(token),
    payload,
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

async function postPersonalizada(payload: Record<string, unknown>, token = dueno.token) {
  const res = await app.inject({
    method: "POST",
    url: "/rutinas-personalizadas",
    headers: headers(token),
    payload,
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

// ─── RU-09 — registro completo ───────────────────────────────────────────────

describe("RU-09 registro completo de la personalizada", () => {
  it("POST /rutinas-personalizadas completo -> 201 y GET devuelve el árbol con literales exactos", async () => {
    const payload = payloadRutinaPersonalizada({ nombre: "Rutina pers RU09" });
    const creada = await crearRutinaPersonalizadaViaApi(app, dueno.token, payload);
    expect(creada.statusCode).toBe(201);
    expect(rutinaPersonalizadaDatosSchema.safeParse(creada.body).success).toBe(true);
    expect(creada.body.tipoRutina).toBe("PERSONALIZADA");

    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.statusCode).toBe(200);
    expect(rutinaPersonalizadaDatosSchema.safeParse(detalle.body).success).toBe(true);
    expect(detalle.body.informacionGeneral).toEqual(payload.informacionGeneral);
    expect(detalle.body.diagnostico.diagnostico).toBe("Buena postura general");
    expect(detalle.body.macrociclos[0].mesociclos[0].microciclos[0].sesiones[0].ejercicios[0].series[0].repeticiones).toBe(
      "8-12"
    );
    expect(detalle.body.tests[0].nombre).toBe("1RM sentadilla");
    expect(detalle.body.antropometria.map((a: any) => a.medida).sort()).toEqual(
      ["perimetroCintura", "peso"].sort()
    );
    expect(detalle.body.analisisBiomecanico[0].zona).toBe("RODILLA");
  });
});

// ─── RU-10 — información general + diagnóstico (DEC-062) ─────────────────────

describe("RU-10 información general y diagnóstico (7 campos)", () => {
  const CASOS: Array<[string, Record<string, unknown>, string]> = [
    [
      "objetivoGeneral de 9 caracteres",
      {
        informacionGeneral: {
          objetivoGeneral: "Ganar mas",
          nivelExperiencia: "INTERMEDIO",
          fechaEvaluacion: "2026-01-01",
        },
      },
      "Objetivo general debe tener entre 10 y 1000 caracteres",
    ],
    [
      "fechaEvaluacion futura",
      {
        informacionGeneral: {
          objetivoGeneral: "Ganar masa muscular",
          nivelExperiencia: "INTERMEDIO",
          fechaEvaluacion: "2099-01-01",
        },
      },
      "Fecha de evaluación no puede ser futura",
    ],
    [
      "diagnostico de 4 caracteres",
      { diagnostico: { diagnostico: "Bien" } },
      "Diagnóstico debe tener entre 5 y 2000 caracteres",
    ],
    [
      "restriccionesMedicas de 1001 caracteres",
      {
        diagnostico: {
          diagnostico: "Buena postura general",
          restriccionesMedicas: "a".repeat(1001),
        },
      },
      "El texto debe tener entre 1 y 1000 caracteres",
    ],
  ];

  for (const [descripcion, ajustes, mensaje] of CASOS) {
    it(`${descripcion} -> 400 '${mensaje}'`, async () => {
      const payload = payloadRutinaPersonalizada({ nombre: "Rutina pers RU10", ...ajustes });
      expect(
        primerErrorCanonico(crearRutinaPersonalizadaSchema, payload),
        "premisa: el caso debe ser inválido en el canónico"
      ).toBe(mensaje);
      const res = await postPersonalizada(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.error).toBe(mensaje);
    });
  }

  it("bloques requeridos ausentes -> 400 VALIDATION_ERROR (GAP INC10-R08-GAP-01)", async () => {
    const base = payloadRutinaPersonalizada({ nombre: "Rutina pers RU10 bloques" });
    for (const incompleto of [
      { ...base, informacionGeneral: undefined },
      { ...base, diagnostico: undefined },
    ]) {
      const res = await postPersonalizada(incompleto);
      expect(res.statusCode, JSON.stringify(Object.keys(incompleto))).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    }
  });
});

// ─── RU-11 / RU-12 — árbol macro-meso-micro y contención de fechas ───────────

describe("RU-11 árbol macro-meso-micro (mensajes por nivel)", () => {
  const CASOS: Array<[string, Record<string, unknown>, string]> = [
    ["macrociclos vacíos", { macrociclos: [] }, "Debe registrar al menos un macrociclo"],
    [
      "macro sin mesociclos",
      {
        macrociclos: [
          { nombre: "Macro 1", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", mesociclos: [] },
        ],
      },
      "Cada macrociclo debe tener al menos 1 mesociclo",
    ],
    [
      "meso sin microciclos",
      {
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
      },
      "Cada mesociclo debe tener al menos 1 microciclo",
    ],
    [
      "micro sin sesiones",
      {
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
      },
      "Cada microciclo debe tener al menos 1 sesión",
    ],
  ];

  // ENMIENDA C4 (INC-10, 2026-11-05) — D3: el loop pasaba el objeto de ajustes
  // COMO valor de `macrociclos` (faltaba spread), por lo que el payload llevaba
  // `macrociclos: { macrociclos: [...] }` y el propio canónico respondía
  // "Expected array, received object". Se desparraman los ajustes: casos,
  // mensajes y expectativas intactos.
  for (const [descripcion, ajustes, mensaje] of CASOS) {
    it(`${descripcion} -> 400 '${mensaje}'`, async () => {
      const payload = payloadRutinaPersonalizada({
        nombre: "Rutina pers RU11",
        ...ajustes,
      });
      expect(primerErrorCanonico(crearRutinaPersonalizadaSchema, payload)).toBe(mensaje);
      const res = await postPersonalizada(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(mensaje);
    });
  }
});

describe("RU-12 coherencia de fechas y contención de ciclos", () => {
  it("macro con fechaFin < fechaInicio -> 400 'Fecha de fin no puede ser anterior a la fecha de inicio'", async () => {
    const macro = macrocicloValido({ fechaInicio: "2026-03-31", fechaFin: "2026-01-01" });
    expect(primerErrorCanonico(macrocicloSchema, macro)).toBe(
      "Fecha de fin no puede ser anterior a la fecha de inicio"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU12 fin", macrociclos: [macro] })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Fecha de fin no puede ser anterior a la fecha de inicio");
  });

  it("mesociclo fuera del rango del macrociclo -> 400 con el primer error de validarContencionCiclos", async () => {
    const macro = macrocicloValido({
      mesociclos: [mesocicloValido({ fechaInicio: "2025-12-01", fechaFin: "2026-06-30" })],
    });
    const mensaje = validarContencionCiclos([macro as never])[0];
    expect(mensaje).toBe(
      "Mesociclo 'Meso 1' debe estar contenido en el rango del macrociclo 'Macro 1'"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU12 meso", macrociclos: [macro] })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.error).toBe(mensaje);
  });

  it("microciclo fuera del rango del mesociclo -> 400 con el primer error de validarContencionCiclos", async () => {
    const macro = macrocicloValido({
      mesociclos: [
        mesocicloValido({
          microciclos: [microcicloValido({ fechaFin: "2026-07-15" })],
        }),
      ],
    });
    const mensaje = validarContencionCiclos([macro as never])[0];
    expect(mensaje).toBe(
      "Microciclo 'Micro 1' debe estar contenido en el rango del mesociclo 'Meso 1'"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU12 micro", macrociclos: [macro] })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(mensaje);
  });

  it("árbol contenido (hijo ⊆ padre) -> 201", async () => {
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU12 ok" })
    );
    expect(res.statusCode).toBe(201);
  });
});

// ─── RU-13 — sesiones -> ejercicios -> series ────────────────────────────────

describe("RU-13 series con intensidad, descanso y observaciones", () => {
  function payloadConSerie(ajustes: Record<string, unknown>) {
    return payloadRutinaPersonalizada({
      nombre: "Rutina pers RU13",
      macrociclos: [
        macrocicloValido({
          mesociclos: [
            mesocicloValido({
              microciclos: [
                microcicloValido({
                  sesiones: [
                    sesionValida({
                      ejercicios: [
                        {
                          nombre: "Press banca",
                          series: [
                            {
                              repeticiones: "8-12",
                              intensidad: "70% 1RM",
                              descansoSegundos: 90,
                              ...ajustes,
                            },
                          ],
                        },
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  const CASOS: Array<[string, Record<string, unknown>, string]> = [
    ["repeticiones '15-8'", { repeticiones: "15-8" }, "Repeticiones: el valor inicial no puede superar al final"],
    ["repeticiones '0'", { repeticiones: "0" }, "Repeticiones debe estar entre 1 y 999"],
    ["repeticiones 'abc'", { repeticiones: "abc" }, "Repeticiones debe tener formato '8' o '8-12'"],
    ["descanso 3601", { descansoSegundos: 3601 }, "Descanso debe estar entre 0 y 3600 segundos"],
    ["descanso 90.5", { descansoSegundos: 90.5 }, "Descanso debe ser un número entero de segundos"],
    ["intensidad de 51 chars", { intensidad: "a".repeat(51) }, "Intensidad debe tener entre 1 y 50 caracteres"],
  ];

  for (const [descripcion, ajustes, mensaje] of CASOS) {
    it(`${descripcion} -> 400 '${mensaje}'`, async () => {
      const payload = payloadConSerie(ajustes);
      expect(primerErrorCanonico(crearRutinaPersonalizadaSchema, payload)).toBe(mensaje);
      const res = await postPersonalizada(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(mensaje);
    });
  }

  it("observaciones de la serie presentes -> 201 y persistidas", async () => {
    const payload = payloadConSerie({ observaciones: "Subir peso si se siente ligero" });
    const res = await postPersonalizada(payload);
    expect(res.statusCode).toBe(201);
    const detalle = await getRutina(dueno.token, res.body.id);
    expect(
      detalle.body.macrociclos[0].mesociclos[0].microciclos[0].sesiones[0].ejercicios[0]
        .series[0].observaciones
    ).toBe("Subir peso si se siente ligero");
  });
});

// ─── RU-14 — evaluaciones tipadas (DEC-063) ──────────────────────────────────

describe("RU-14 tests, antropometría y análisis biomecánico (formato estructurado)", () => {
  it("medida fuera del enum -> 400 'Medida antropométrica contiene un valor no permitido'", async () => {
    const antropometria = [{ medida: "grasa_total", valor: 20, unidad: "kg", fecha: "2026-01-01" }];
    expect(primerErrorCanonico(antropometriaItemSchema, antropometria[0])).toBe(
      "Medida antropométrica contiene un valor no permitido"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU14 medida", antropometria })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Medida antropométrica contiene un valor no permitido");
  });

  it("unidad incoherente con la medida -> 400 \"Unidad debe ser 'kg' para la medida 'peso'\"", async () => {
    const antropometria = [{ medida: "peso", valor: 75.5, unidad: "cm", fecha: "2026-01-01" }];
    expect(primerErrorCanonico(antropometriaItemSchema, antropometria[0])).toBe(
      "Unidad debe ser 'kg' para la medida 'peso'"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU14 unidad", antropometria })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Unidad debe ser 'kg' para la medida 'peso'");
  });

  it("hallazgo fuera del enum -> 400 'Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO'", async () => {
    const analisisBiomecanico = [{ zona: "RODILLA", hallazgo: "GRAVE", fecha: "2026-01-01" }];
    expect(primerErrorCanonico(analisisBiomecanicoItemSchema, analisisBiomecanico[0])).toBe(
      "Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO"
    );
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU14 hallazgo", analisisBiomecanico })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO");
  });

  it("las 3 secciones de evaluación con registros tipados -> 201 y GET las devuelve completas", async () => {
    const payload = payloadRutinaPersonalizada({ nombre: "Rutina pers RU14 ok" });
    const res = await postPersonalizada(payload);
    expect(res.statusCode).toBe(201);
    const detalle = await getRutina(dueno.token, res.body.id);
    expect(detalle.body.tests).toHaveLength(1);
    expect(detalle.body.antropometria).toHaveLength(2);
    expect(detalle.body.analisisBiomecanico).toHaveLength(1);
    expect(detalle.body.antropometria[0]).toMatchObject({
      medida: "peso",
      valor: 75.5,
      unidad: "kg",
      fecha: "2026-01-01",
    });
    expect(detalle.body.analisisBiomecanico[0]).toMatchObject({
      zona: "RODILLA",
      hallazgo: "LEVE",
    });
  });
});

// ─── RU-15 — completitud mínima y ramas de error ─────────────────────────────

describe("RU-15 completitud mínima (sin 201 parcial)", () => {
  it("sin informacionGeneral -> 400; macrociclos vacíos -> 400 'Debe registrar al menos un macrociclo'", async () => {
    const base = payloadRutinaPersonalizada({ nombre: "Rutina pers RU15" });
    const sinInfo = { ...base, informacionGeneral: undefined };
    const resInfo = await postPersonalizada(sinInfo);
    expect(resInfo.statusCode).toBe(400);
    expect(resInfo.body.code).toBe("VALIDATION_ERROR");

    const sinMacros = { ...base, macrociclos: [] };
    const resMacros = await postPersonalizada(sinMacros);
    expect(resMacros.statusCode).toBe(400);
    expect(resMacros.body.error).toBe("Debe registrar al menos un macrociclo");
  });
});

// ─── RU-16 / RU-17 — trazabilidad y edición por secciones ────────────────────

describe("RU-16/17 trazabilidad y edición de la personalizada", () => {
  it("PATCH solo diagnostico -> macrociclos intactos y actualizadoPor = actor real", async () => {
    const creada = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU17 merge" })
    );
    const antes = await getRutina(dueno.token, creada.body.id);

    const patch = await patchRutina(dueno2.token, creada.body.id, {
      diagnostico: { diagnostico: "Diagnostico editado por el segundo dueno" },
    });
    expect(patch.statusCode).toBe(200);
    expect(rutinaPersonalizadaDatosSchema.safeParse(patch.body).success).toBe(true);
    expect(patch.body.diagnostico.diagnostico).toBe("Diagnostico editado por el segundo dueno");
    expect(patch.body.macrociclos, "ausente = conserva").toEqual(antes.body.macrociclos);
    expect(patch.body.nombre).toBe("Rutina pers RU17 merge");

    // RU-16: trazabilidad real (nunca un valor libre del request).
    expect(patch.body.actualizadoPor.id).toBe(dueno2.userId);
    expect(patch.body.actualizadoPor.id).not.toBe(dueno.userId);
    expect(patch.body.fechaActualizacion >= antes.body.fechaActualizacion).toBe(true);
  });

  // ENMIENDA INC10-FIX-05 (REV-05) — RU-17: el PATCH re-valida contencion sobre
  // el MERGE. El arbol ensamblado aqui NO esta contenido (meso 2026-01-01..
  // 2026-06-30 arranca antes del macro 2026-02-01..2026-12-31), por lo que ya
  // no puede persistirse: 400 VALIDATION_ERROR con el PRIMER error (R4,
  // INC05-CONF-01) y la rutina queda intacta. Antes este test ensamblaba 200
  // (RED de INC-10, hallazgo REV-05).
  it("PATCH con macrociclos nuevos no contenido -> 400 primer error (nada persiste)", async () => {
    const creada = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU17 seccion" })
    );
    const antes = await getRutina(dueno.token, creada.body.id);
    const nuevos = [
      macrocicloValido({ nombre: "Macro reemplazo", fechaInicio: "2026-02-01", fechaFin: "2026-12-31" }),
    ];
    const mensaje = validarContencionCiclos(nuevos as never)[0];
    expect(mensaje).toBe(
      "Mesociclo 'Meso 1' debe estar contenido en el rango del macrociclo 'Macro reemplazo'"
    );
    const patch = await patchRutina(dueno.token, creada.body.id, { macrociclos: nuevos });
    expect(patch.statusCode).toBe(400);
    expect(patch.body.code).toBe("VALIDATION_ERROR");
    expect(patch.body.error).toBe(mensaje);
    // Sin escritura: el arbol persistido y la trazabilidad no cambian.
    const despues = await getRutina(dueno.token, creada.body.id);
    expect(despues.body.macrociclos).toEqual(antes.body.macrociclos);
    expect(despues.body.fechaActualizacion).toBe(antes.body.fechaActualizacion);
    expect(despues.body.actualizadoPor.id).toBe(antes.body.actualizadoPor.id);
  });

  // ENMIENDA INC10-FIX-05 (REV-05) — rama nueva: merge no contenido a nivel
  // MICRO (la creacion ya lo cubria; el PATCH ahora comparte la misma guarda)
  // + el arreglo corregido demuestra que la seccion presente sigue
  // REEMPLAZANDO el arbol completo cuando esta contenida (RU-17 intacto).
  it("ENMIENDA INC10-FIX-05: merge no contenido (micro fuera del meso) -> 400; corregido -> 200 reemplaza", async () => {
    const creada = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina pers FIX05 micro" })
    );
    const microFuera = [
      macrocicloValido({
        nombre: "Macro FIX05",
        fechaInicio: "2026-01-01",
        fechaFin: "2026-06-30",
        mesociclos: [
          mesocicloValido({
            nombre: "Meso FIX05",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-03-31",
            microciclos: [
              microcicloValido({ nombre: "Micro FIX05", fechaInicio: "2026-01-01", fechaFin: "2026-04-30" }),
            ],
          }),
        ],
      }),
    ];
    const mensaje = validarContencionCiclos(microFuera as never)[0];
    expect(mensaje).toBe(
      "Microciclo 'Micro FIX05' debe estar contenido en el rango del mesociclo 'Meso FIX05'"
    );
    const rechazo = await patchRutina(dueno.token, creada.body.id, { macrociclos: microFuera });
    expect(rechazo.statusCode).toBe(400);
    expect(rechazo.body.code).toBe("VALIDATION_ERROR");
    expect(rechazo.body.error).toBe(mensaje);

    // Corregido (contenido) -> 200 y la seccion presente REEMPLAZA el arbol.
    const contenido = [
      macrocicloValido({
        nombre: "Macro FIX05",
        fechaInicio: "2026-01-01",
        fechaFin: "2026-06-30",
        mesociclos: [
          mesocicloValido({
            nombre: "Meso FIX05",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-03-31",
            microciclos: [
              microcicloValido({ nombre: "Micro FIX05", fechaInicio: "2026-01-01", fechaFin: "2026-03-15" }),
            ],
          }),
        ],
      }),
    ];
    const ok = await patchRutina(dueno.token, creada.body.id, { macrociclos: contenido });
    expect(ok.statusCode).toBe(200);
    expect(ok.body.macrociclos).toHaveLength(1);
    expect(ok.body.macrociclos[0].nombre).toBe("Macro FIX05");
    expect(ok.body.macrociclos[0].mesociclos[0].microciclos[0].fechaFin).toBe("2026-03-15");
  });

  // ENMIENDA INC10-FIX-05 (REV-05) — rama nueva: PATCH parcial valido (solo
  // renombre) -> 200; el arbol de ciclos y las demas secciones quedan intactos
  // (ausente = conserva; sin falsos positivos de la guarda nueva).
  it("ENMIENDA INC10-FIX-05: PATCH parcial valido (solo nombre) -> 200 y el arbol queda intacto", async () => {
    const creada = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina pers FIX05 renombre" })
    );
    const antes = await getRutina(dueno.token, creada.body.id);
    const patch = await patchRutina(dueno.token, creada.body.id, { nombre: "Rutina pers FIX05 renombrada" });
    expect(patch.statusCode).toBe(200);
    expect(patch.body.nombre).toBe("Rutina pers FIX05 renombrada");
    expect(patch.body.macrociclos).toEqual(antes.body.macrociclos);
    expect(patch.body.diagnostico).toEqual(antes.body.diagnostico);
    expect(patch.body.tests).toEqual(antes.body.tests);
    expect(patch.body.fechaActualizacion >= antes.body.fechaActualizacion).toBe(true);
    expect(patch.body.actualizadoPor.id).toBe(dueno.userId);
  });

  it("PATCH con tipoRutina -> 400 (inmutable, strict) sin efectos", async () => {
    const creada = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU17 inmutable" })
    );
    const patch = await patchRutina(dueno.token, creada.body.id, {
      tipoRutina: "GENERICA",
    });
    expect(patch.statusCode).toBe(400);
    expect(patch.body.code).toBe("VALIDATION_ERROR");
    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.body.tipoRutina).toBe("PERSONALIZADA");
  });

  it("DEC-067/RU-33: editar la rutina NO altera el snapshot de la asignación (solo afecta asignaciones futuras)", async () => {
    const payload = payloadRutinaPersonalizada({
      nombre: "Rutina pers RU33 snapshot",
      descripcion: "Version original del snapshot",
    });
    const creada = await crearRutinaPersonalizadaViaApi(app, dueno.token, payload);
    const cliente = await crearClienteUnico(PREFIJO, {
      nombres: "Snapshot",
      apellidos: "Cliente",
    });
    // ENMIENDA C4 (INC-10, 2026-11-05) — D4: la asignacion de una PERSONALIZADA
    // y su visibilidad en el portal exigen vigencia personalizada ACTIVA
    // (DEC-066, fijada por RU-23/RU-37); la fixture completa el escenario. La
    // intencion del test (RU-33: el snapshot NO muta con la edicion posterior)
    // queda intacta.
    await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const asignacion = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: creada.body.id,
    });
    expect(asignacion.statusCode).toBe(201);
    const snapshotOriginal = JSON.stringify(asignacion.body.contenidoSnapshot);

    // Edición posterior del contenido (RU-17).
    const patch = await patchRutina(dueno.token, creada.body.id, {
      descripcion: "Version editada despues de asignar",
    });
    expect(patch.statusCode).toBe(200);

    // El historial conserva el contenido del momento de asignar (RU-33).
    const historial = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/rutinas/historial`,
      headers: headers(dueno.token),
    });
    expect(historial.statusCode).toBe(200);
    const cuerpo = parseBody(historial);
    expect(historialRutinasSchema.safeParse(cuerpo).success).toBe(true);
    expect(cuerpo.asignaciones).toHaveLength(1);
    expect(JSON.stringify(cuerpo.asignaciones[0].contenidoSnapshot)).toBe(snapshotOriginal);
    expect(cuerpo.asignaciones[0].contenidoSnapshot.descripcion).toBe(
      "Version original del snapshot"
    );

    // El portal también lee desde snapshot (R6): no ve la edición posterior.
    const clienteToken = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await app.inject({
      method: "GET",
      url: "/portal/rutina",
      headers: headers(clienteToken),
    });
    expect(portal.statusCode).toBe(200);
    expect(parseBody(portal).descripcion).toBe("Version original del snapshot");

    // La rutina en sí SÍ quedó editada para el staff.
    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.body.descripcion).toBe("Version editada despues de asignar");
  });
});

// ─── RU-18 — permisos del endpoint de personalizadas ─────────────────────────

describe("RU-18 permisos de gestión (solo DUENO)", () => {
  it("POST /rutinas-personalizadas: DUENO 201; RECEPCIONISTA 403; CLIENTE 403; sin token 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);

    const conRecep = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU18 recep" }),
      recep.token
    );
    expect(conRecep.statusCode).toBe(403);

    const conCliente = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU18 cliente" }),
      tokenCliente
    );
    expect(conCliente.statusCode).toBe(403);

    const sinToken = await app.inject({
      method: "POST",
      url: "/rutinas-personalizadas",
      payload: payloadRutinaPersonalizada({ nombre: "Rutina pers RU18 anon" }),
    });
    expect(sinToken.statusCode).toBe(401);
  });
});

// ─── RU-19 — contrato cerrado y límites de arreglos (C4) ─────────────────────

describe("RU-19 límites exactos (C4: max+1 -> 400)", () => {
  const LIMITES: Array<[string, () => Record<string, unknown>, string]> = [
    [
      "21 macrociclos",
      () => ({
        macrociclos: Array.from({ length: 21 }, (_, i) => ({
          ...macrocicloValido(),
          nombre: `Macro ${i + 1}`,
        })),
      }),
      "Puede registrar máximo 20 macrociclos",
    ],
    [
      "21 mesociclos por macrociclo",
      () => ({
        macrociclos: [
          macrocicloValido({
            mesociclos: Array.from({ length: 21 }, (_, i) => ({
              ...mesocicloValido(),
              nombre: `Meso ${i + 1}`,
            })),
          }),
        ],
      }),
      "Cada macrociclo puede tener máximo 20 mesociclos",
    ],
    [
      "21 microciclos por mesociclo",
      () => ({
        macrociclos: [
          macrocicloValido({
            mesociclos: [
              mesocicloValido({
                microciclos: Array.from({ length: 21 }, (_, i) => ({
                  ...microcicloValido(),
                  nombre: `Micro ${i + 1}`,
                })),
              }),
            ],
          }),
        ],
      }),
      "Cada mesociclo puede tener máximo 20 microciclos",
    ],
    [
      "31 sesiones por microciclo",
      () => ({
        macrociclos: [
          macrocicloValido({
            mesociclos: [
              mesocicloValido({
                microciclos: [
                  microcicloValido({
                    sesiones: Array.from({ length: 31 }, (_, i) => ({
                      ...sesionValida(),
                      nombre: `Sesion ${i + 1}`,
                    })),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      "Cada microciclo puede tener máximo 30 sesiones",
    ],
    [
      "51 tests",
      () => ({
        tests: Array.from({ length: 51 }, (_, i) => ({
          nombre: `Test ${i + 1}`,
          resultado: "100",
          fecha: "2026-01-01",
        })),
      }),
      "Puede registrar máximo 50 tests",
    ],
    [
      "51 medidas antropométricas",
      () => ({
        antropometria: Array.from({ length: 51 }, () => ({
          medida: "peso",
          valor: 70,
          unidad: "kg",
          fecha: "2026-01-01",
        })),
      }),
      "Puede registrar máximo 50 medidas antropométricas",
    ],
    [
      "51 hallazgos biomecánicos",
      () => ({
        analisisBiomecanico: Array.from({ length: 51 }, () => ({
          zona: "LUMBAR",
          hallazgo: "LEVE",
          fecha: "2026-01-01",
        })),
      }),
      "Puede registrar máximo 50 hallazgos biomecánicos",
    ],
  ];

  for (const [descripcion, ajustes, mensaje] of LIMITES) {
    it(`${descripcion} -> 400 '${mensaje}'`, async () => {
      const payload = payloadRutinaPersonalizada({
        nombre: "Rutina pers RU19 limite",
        ...ajustes(),
      });
      expect(primerErrorCanonico(crearRutinaPersonalizadaSchema, payload)).toBe(mensaje);
      const res = await postPersonalizada(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(mensaje);
    });
  }

  it("campo desconocido -> 400 (.strict())", async () => {
    const res = await postPersonalizada(
      payloadRutinaPersonalizada({ nombre: "Rutina pers RU19 strict", extra: 1 })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(
      actualizarRutinaPersonalizadaSchema.safeParse({ extra: 1 }).success
    ).toBe(false);
    expect(crearRutinaBaseSchema.safeParse({ extra: 1 }).success).toBe(false);
  });
});
