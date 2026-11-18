/**
 * INC-10 (RED) — Creación base de rutinas (GENERICA/INDUCCION) y su edición.
 * Criterios: RU-01..RU-08 (HU-18) + RU-16 (trazabilidad compartida) y
 * contrato API RATIFICADO del spec de INC-10 (endpoints 1a/3/4, DEC-070).
 *
 * Endpoints fijados por este RED (rutas SIN prefijo /api):
 *  - POST /rutinas (solo DUENO) -> 201 `rutinaBaseDatosSchema`;
 *    400 `{ error: <primer error zod>, code: "VALIDATION_ERROR" }` (.strict()).
 *  - GET /rutinas/:rutinaId (DUENO/RECEPCIONISTA) -> 200 detalle por tipo
 *    persistido + `actualizadoPor`; 404 `RUTINA_NO_ENCONTRADA`.
 *  - PATCH /rutinas/:rutinaId (solo DUENO) -> 200 merge por secciones
 *    (presente = reemplaza; ausente = conserva); `tipoRutina` inmutable
 *    (400 strict); solo afecta asignaciones futuras (DEC-067/RU-04).
 *
 * Mensajes derivados del schema CANONICO (INC09-R08):
 * `features/acceptance-criteria/HU-18|HU-19-schemas.ts`.
 *
 * FASE RED (2026-11-05): los endpoints NO existen (GREEN T7). Los tests fallan
 * por COMPORTAMIENTO AUSENTE (404 de rutas inexistentes o fixtures que lanzan
 * errores explícitos), nunca por error de sintaxis/fixtures.
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 *
 * ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures numerico (ver
 * `PREFIJO`); intencion y expectativas intactas.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  crearAppRutinas,
  loginDueno,
  loginRecepcionista,
  loginCliente,
  crearClienteUnico,
  crearSegundoDueno,
  crearRutinaBaseViaApi,
  asignarRutinaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  primerErrorCanonico,
  payloadRutinaBase,
  PIN_CLIENTE_FIXTURE,
  MENSAJE_RUTINA_NO_ENCONTRADA,
  CODE_RUTINA_NO_ENCONTRADA,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  crearRutinaBaseSchema,
  rutinaBaseDatosSchema,
  SECCIONES_RUTINA_BASE,
} from "../../features/acceptance-criteria/HU-18-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10b"): las cedulas `${prefijo}${seq}` deben ser digitos de 10 posiciones
// para el contrato ratificado `loginClientSchema` (`^\d{6,10}$`; convencion de
// las 19 suites existentes). Intencion intacta: unicidad por archivo
// (DEC-012/013) + limpieza por `startsWith`.
const PREFIJO = "9951";

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

// ─── RU-01 — creación con tipo explícito ─────────────────────────────────────

describe("RU-01 creación con tipo explícito (GENERICA | INDUCCION)", () => {
  it("POST /rutinas GENERICA -> 201 recuperable con el tipo exacto y su contenido", async () => {
    const payload = payloadRutinaBase({
      nombre: "Rutina generica RU01",
      sesiones: [
        {
          nombre: "Sesion generica A",
          dia: "lunes",
          ejercicios: [
            {
              nombre: "Sentadilla",
              series: [{ repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90 }],
            },
          ],
        },
      ],
    });
    const creada = await crearRutinaBaseViaApi(app, dueno.token, payload);
    expect(creada.statusCode).toBe(201);
    expect(rutinaBaseDatosSchema.safeParse(creada.body).success).toBe(true);
    expect(creada.body.tipoRutina).toBe("GENERICA");

    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.statusCode).toBe(200);
    expect(rutinaBaseDatosSchema.safeParse(detalle.body).success).toBe(true);
    expect(detalle.body.tipoRutina, "GENERICA ≠ INDUCCION").toBe("GENERICA");
    expect(detalle.body.nombre).toBe("Rutina generica RU01");
    expect(detalle.body.sesiones[0].nombre).toBe("Sesion generica A");
    expect(detalle.body.sesiones[0].ejercicios[0].series[0].repeticiones).toBe("8-12");
  });

  it("POST /rutinas INDUCCION -> 201 con tipoRutina exacto INDUCCION", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina induccion RU01" })
    );
    expect(creada.statusCode).toBe(201);
    expect(creada.body.tipoRutina).toBe("INDUCCION");

    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.body.tipoRutina, "INDUCCION ≠ GENERICA").toBe("INDUCCION");
  });
});

// ─── RU-02 — validación de campos (mensajes del canónico) ────────────────────

describe("RU-02 validación de la creación (400 con mensaje por campo)", () => {
  const CASOS: Array<[string, Record<string, unknown>, string]> = [
    [
      "nombre de 2 caracteres",
      { nombre: "ab" },
      "Nombre debe tener entre 3 y 100 caracteres",
    ],
    [
      "nombre de 101 caracteres",
      { nombre: "a".repeat(101) },
      "Nombre debe tener entre 3 y 100 caracteres",
    ],
    [
      "nombre con caracteres no permitidos",
      { nombre: "Rutina@1" },
      "Nombre contiene caracteres no permitidos",
    ],
    [
      "tipoRutina PERSONALIZADA",
      { tipoRutina: "PERSONALIZADA" },
      "Tipo de rutina debe ser GENERICA o INDUCCION",
    ],
    [
      "tipoRutina en minúsculas",
      { tipoRutina: "generica" },
      "Tipo de rutina debe ser GENERICA o INDUCCION",
    ],
    [
      "sesiones vacías",
      { sesiones: [] },
      "Debe registrar al menos 1 sesión",
    ],
    [
      "nivelExperiencia fuera de enum",
      { nivelExperiencia: "EXPERTO" },
      "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO",
    ],
    [
      "descripcion de 501 caracteres",
      { descripcion: "a".repeat(501) },
      "El texto debe tener entre 1 y 500 caracteres",
    ],
    [
      "serie con repeticiones '15-8'",
      {
        sesiones: [
          {
            nombre: "Sesion fuerza A",
            ejercicios: [
              {
                nombre: "Press banca",
                series: [{ repeticiones: "15-8", intensidad: "70% 1RM", descansoSegundos: 90 }],
              },
            ],
          },
        ],
      },
      "Repeticiones: el valor inicial no puede superar al final",
    ],
    [
      "sesión sin ejercicios",
      { sesiones: [{ nombre: "Sesion vacia", ejercicios: [] }] },
      "Cada sesión debe tener al menos 1 ejercicio",
    ],
  ];

  for (const [descripcion, ajustes, mensaje] of CASOS) {
    it(`${descripcion} -> 400 '${mensaje}'`, async () => {
      const payload = payloadRutinaBase(ajustes);
      expect(
        primerErrorCanonico(crearRutinaBaseSchema, payload),
        "premisa: el caso debe ser inválido en el canónico"
      ).toBe(mensaje);
      const res = await app.inject({
        method: "POST",
        url: "/rutinas",
        headers: headers(dueno.token),
        payload,
      });
      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(mensaje);
    });
  }

  it("campos requeridos ausentes -> 400 VALIDATION_ERROR (GAP INC10-R08-GAP-01: sin required_error en el canónico)", async () => {
    for (const incompleto of [
      { ...payloadRutinaBase(), nombre: undefined },
      { ...payloadRutinaBase(), tipoRutina: undefined },
      { ...payloadRutinaBase(), sesiones: undefined },
    ]) {
      const res = await app.inject({
        method: "POST",
        url: "/rutinas",
        headers: headers(dueno.token),
        payload: incompleto,
      });
      expect(res.statusCode, JSON.stringify(Object.keys(incompleto))).toBe(400);
      expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    }
  });

  it("campo desconocido -> 400 (.strict(), RU-08) y nada se persiste", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/rutinas",
      headers: headers(dueno.token),
      payload: payloadRutinaBase({ extra: 1 }),
    });
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
  });
});

// ─── RU-03 — estructura organizada para consulta ─────────────────────────────

describe("RU-03 estructura organizada (B1 + B2)", () => {
  it("GET entrega los campos B1 y B2 del contrato, con las sesiones después de la info general", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina estructura RU03" })
    );
    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.statusCode).toBe(200);

    const camposB1 = [...SECCIONES_RUTINA_BASE.B1.campos] as string[];
    for (const campo of camposB1) {
      expect(detalle.body, `campo B1 ${campo}`).toHaveProperty(campo);
    }
    expect(detalle.body).toHaveProperty("sesiones");
    const claves = Object.keys(detalle.body);
    const ultimaPosB1 = Math.max(...camposB1.map((c) => claves.indexOf(c)));
    expect(claves.indexOf("sesiones"), "B2 después de B1").toBeGreaterThan(ultimaPosB1);
  });
});

// ─── RU-04 — reutilización con varios clientes ───────────────────────────────

describe("RU-04 reutilización con varios clientes", () => {
  it("la MISMA rutina asignada a A, B y C deja 3 asignaciones ACTIVAS y la rutina no se duplica", async () => {
    const payload = payloadRutinaBase({ nombre: "Rutina compartida RU04" });
    const creada = await crearRutinaBaseViaApi(app, dueno.token, payload);
    const rutinaId = creada.body.id;

    const clientes = await Promise.all([
      crearClienteUnico(PREFIJO, { nombres: "Reutiliza", apellidos: "Cliente A" }),
      crearClienteUnico(PREFIJO, { nombres: "Reutiliza", apellidos: "Cliente B" }),
      crearClienteUnico(PREFIJO, { nombres: "Reutiliza", apellidos: "Cliente C" }),
    ]);

    for (const cliente of clientes) {
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId });
      expect(res.statusCode, `asignacion a ${cliente.id}`).toBe(201);
    }

    for (const cliente of clientes) {
      const activa = await app.inject({
        method: "GET",
        url: `/clientes/${cliente.id}/rutinas/activa`,
        headers: headers(dueno.token),
      });
      expect(activa.statusCode, `activa de ${cliente.id}`).toBe(200);
      const cuerpo = parseBody(activa);
      expect(cuerpo.estado).toBe("ACTIVA");
      expect(cuerpo.asignacion.rutina.id).toBe(rutinaId);
    }

    const listado = await app.inject({
      method: "GET",
      url: `/rutinas?nombre=${encodeURIComponent("Rutina compartida RU04")}`,
      headers: headers(dueno.token),
    });
    expect(listado.statusCode).toBe(200);
    expect(parseBody(listado).total, "la rutina no se duplica").toBe(1);

    // Editarla no rompe las asignaciones existentes.
    const patch = await patchRutina(dueno.token, rutinaId, {
      descripcion: "Descripcion editada tras asignar",
    });
    expect(patch.statusCode).toBe(200);
    for (const cliente of clientes) {
      const activa = await app.inject({
        method: "GET",
        url: `/clientes/${cliente.id}/rutinas/activa`,
        headers: headers(dueno.token),
      });
      expect(parseBody(activa).estado, `asignación de ${cliente.id} sigue ACTIVA`).toBe(
        "ACTIVA"
      );
    }
  });
});

// ─── RU-06 / RU-16 — edición base (merge por secciones, tipo inmutable) ──────

describe("RU-06 edición de genérica/inducción (PATCH por secciones)", () => {
  it("PATCH solo descripcion -> 200; el tipo y el resto se conservan; trazabilidad del actor", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina edicion RU06" })
    );
    const rutinaId = creada.body.id;

    const patch = await patchRutina(dueno2.token, rutinaId, {
      descripcion: "Descripcion nueva",
    });
    expect(patch.statusCode).toBe(200);
    expect(rutinaBaseDatosSchema.safeParse(patch.body).success).toBe(true);
    expect(patch.body.tipoRutina, "tipoRutina inmutable").toBe("GENERICA");
    expect(patch.body.nombre, "ausente = conserva").toBe("Rutina edicion RU06");
    expect(patch.body.descripcion, "presente = reemplaza").toBe("Descripcion nueva");

    // RU-16: trazabilidad del actor autenticado real.
    expect(patch.body.actualizadoPor.id).toBe(dueno2.userId);
    expect(patch.body.actualizadoPor.id).not.toBe(dueno.userId);
    expect(typeof patch.body.fechaActualizacion).toBe("string");

    const detalle = await getRutina(dueno.token, rutinaId);
    expect(detalle.body.descripcion).toBe("Descripcion nueva");
    expect(detalle.body.sesiones, "sección ausente = conserva").toHaveLength(1);
    expect(detalle.body.actualizadoPor.id).toBe(dueno2.userId);
  });

  it("PATCH con tipoRutina en el body -> 400 (inmutable, strict) sin efectos", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina inmutable RU06" })
    );
    const patch = await patchRutina(dueno.token, creada.body.id, {
      tipoRutina: "INDUCCION",
    });
    expect(patch.statusCode).toBe(400);
    expect(patch.body.code).toBe("VALIDATION_ERROR");

    const detalle = await getRutina(dueno.token, creada.body.id);
    expect(detalle.body.tipoRutina).toBe("GENERICA");
    expect(detalle.body.descripcion).toBe("Descripcion base original");
  });

  it("PATCH con sección sesiones completa -> reemplaza la sección entera", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina secciones RU06" })
    );
    const nuevasSesiones = [
      {
        nombre: "Sesion reemplazo B",
        dia: "martes",
        ejercicios: [
          {
            nombre: "Peso muerto",
            series: [{ repeticiones: "5", intensidad: "80% 1RM", descansoSegundos: 180 }],
          },
        ],
      },
    ];
    const patch = await patchRutina(dueno.token, creada.body.id, {
      sesiones: nuevasSesiones,
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.body.sesiones).toHaveLength(1);
    expect(patch.body.sesiones[0].nombre).toBe("Sesion reemplazo B");
    expect(patch.body.sesiones[0].ejercicios[0].series[0].repeticiones).toBe("5");
    expect(patch.body.nombre, "ausente = conserva").toBe("Rutina secciones RU06");
  });
});

// ─── RU-07 — permisos de gestión (solo DUENO) ────────────────────────────────

describe("RU-07 permisos de gestión (DEC-065: solo DUENO escribe)", () => {
  it("matriz rol × creación: DUENO 201; RECEPCIONISTA 403; CLIENTE 403; sin token 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);

    const conRecep = await app.inject({
      method: "POST",
      url: "/rutinas",
      headers: headers(recep.token),
      payload: payloadRutinaBase({ nombre: "Rutina permiso RU07 recep" }),
    });
    expect(conRecep.statusCode, "RECEPCIONISTA no crea rutinas").toBe(403);

    const conCliente = await app.inject({
      method: "POST",
      url: "/rutinas",
      headers: headers(tokenCliente),
      payload: payloadRutinaBase({ nombre: "Rutina permiso RU07 cliente" }),
    });
    expect(conCliente.statusCode, "CLIENTE no crea rutinas").toBe(403);

    const sinToken = await app.inject({
      method: "POST",
      url: "/rutinas",
      payload: payloadRutinaBase({ nombre: "Rutina permiso RU07 anon" }),
    });
    expect(sinToken.statusCode, "sin token -> 401").toBe(401);

    // Nada se persiste de los intentos rechazados.
    const listado = await app.inject({
      method: "GET",
      url: `/rutinas?nombre=${encodeURIComponent("Rutina permiso RU07")}`,
      headers: headers(dueno.token),
    });
    expect(parseBody(listado).total, "nada se persiste").toBe(0);
  });

  it("matriz rol × edición: DUENO 200; RECEPCIONISTA 403; CLIENTE 403; sin token 401", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina permiso RU07 edicion" })
    );
    const rutinaId = creada.body.id;
    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);

    for (const [rol, token] of [
      ["RECEPCIONISTA", recep.token],
      ["CLIENTE", tokenCliente],
    ] as const) {
      const res = await patchRutina(token, rutinaId, { descripcion: "Intento" });
      expect(res.statusCode, `PATCH con ${rol}`).toBe(403);
    }
    const anon = await patchRutina("", rutinaId, { descripcion: "Intento" });
    expect(anon.statusCode, "PATCH sin token").toBe(401);

    const conDueno = await patchRutina(dueno.token, rutinaId, {
      descripcion: "Editada por el dueño",
    });
    expect(conDueno.statusCode, "DUENO edita").toBe(200);
  });

  it("lectura staff: RECEPCIONISTA consulta detalle (200); CLIENTE 403", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina lectura RU07" })
    );
    const conRecep = await getRutina(recep.token, creada.body.id);
    expect(conRecep.statusCode, "RECEPCIONISTA lee").toBe(200);

    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const conCliente = await getRutina(tokenCliente, creada.body.id);
    expect(conCliente.statusCode, "CLIENTE no accede a la gestión").toBe(403);
  });
});

// ─── RU-08 — recurso inexistente y contrato cerrado ──────────────────────────

describe("RU-08 recurso inexistente y contrato cerrado", () => {
  it("GET de rutina inexistente -> 404 RUTINA_NO_ENCONTRADA", async () => {
    const res = await getRutina(dueno.token, "id-fantasma-inc10-a");
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_RUTINA_NO_ENCONTRADA);
    expect(res.body.error).toBe(MENSAJE_RUTINA_NO_ENCONTRADA);
  });

  it("PATCH de rutina inexistente -> 404 RUTINA_NO_ENCONTRADA y nada se persiste", async () => {
    const res = await patchRutina(dueno.token, "id-fantasma-inc10-b", {
      descripcion: "Intento",
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_RUTINA_NO_ENCONTRADA);
    expect(res.body.error).toBe(MENSAJE_RUTINA_NO_ENCONTRADA);
  });

  it("PATCH con campo desconocido -> 400 (.strict() del contrato de update)", async () => {
    const creada = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina estricta RU08" })
    );
    const res = await patchRutina(dueno.token, creada.body.id, { extra: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});
