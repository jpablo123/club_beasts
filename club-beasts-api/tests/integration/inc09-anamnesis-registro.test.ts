/**
 * INC-09 (RED) — Registro de anamnesis deportiva (POST).
 * Criterios: AN-01, AN-02, AN-04, AN-06..AN-11, AN-21, AN-22, AN-26 + orden de
 * errores POST (R7) del contrato API RATIFICADO (spec INC-09, 2026-11-04).
 *
 * Contrato fijado por este RED (para el GREEN T9):
 *  - `POST /clientes/:clienteId/anamnesis` (solo DUENO, DEC-058): 201 con la
 *    vista DUENO (25 propiedades + `clienteId, estado, fechaActualizacion,
 *    actualizadoPorId`; lo no diligenciado viaja como `null`). Body parcial
 *    válido (>=1 campo diligenciado, AN-26) o completo; estado derivado
 *    PENDIENTE/COMPLETA (DEC-056/AN-22). 409 ANAMNESIS_EXISTENTE si ya existe
 *    (DEC-057: 1 anamnesis por cliente). Sin DELETE.
 *  - ENMIENDA C4 (R4): ausencias de obligatorios/condicionales NUNCA son 400
 *    en la API -> PENDIENTE (AN-21/AN-22); el 400 del envío completo vive en
 *    `registrarAnamnesisSchema` (unit, inc09-anamnesis-schemas.test.ts).
 *  - "Lo presente se valida siempre" (AN-24): enums/formato/límites/multi-
 *    selects/contradicciones SI/NO de las ramas de contradicción -> 400 con el
 *    mensaje del schema CANONICO (INC09-R08: derivado en cada test con
 *    `guardarParcialAnamnesisSchema.safeParse`, nunca hardcodeado).
 *  - Orden de errores POST (R7): 401/403 (preHandler DUENO) -> 400 params ->
 *    400 body (primer error, INC05-CONF-01) -> 404 cliente -> 409 -> 201.
 *
 * FASE RED (2026-11-04): `src/routes/anamnesis` y el modelo Prisma `Anamnesis`
 * NO existen (GREEN T8/T9). Todo test falla por COMPORTAMIENTO AUSENTE
 * (endpoints inexistentes -> 404 de Fastify), no por sintaxis ni fixtures:
 * los fixtures usan solo modelos existentes (Cliente/User) y HTTP.
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías;
 * las ausencias se asertan SIEMPRE tras una guarda positiva.
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import {
  MENSAJE_AN26,
  MENSAJE_404_CLIENTE,
  crearAnamnesisViaApi,
  crearAppAnamnesis,
  crearClienteUnico,
  headers,
  limpiarFixtures,
  loginCliente,
  loginDueno,
  loginRecepcionista,
  parseBody,
  payloadCompleto,
  primerErrorCanonico,
} from "./inc09-anamnesis-helpers";
import { anamnesisDuenoSchema } from "../../features/acceptance-criteria/HU-10-schemas";
import { guardarParcialAnamnesisSchema } from "../../features/acceptance-criteria/HU-11-schemas";

const PREFIJO = "9951"; // aislamiento DEC-012 del resto de archivos

let app: any;
let rutaAnamnesisRegistrada = false;
let tokenDueno = "";
let userIdDueno = "";
let tokenRecep = "";
let clienteSeq = 0;

async function nuevoCliente() {
  clienteSeq += 1;
  return crearClienteUnico(PREFIJO, { apellidos: `Registro ${clienteSeq}` });
}

function postAnamnesis(token: string, clienteId: string, payload: unknown) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/anamnesis`,
    headers: headers(token),
    payload: payload as Record<string, unknown>,
  });
}

/** Mensaje esperado: PRIMER error del schema canónico (INC09-R08). */
function mensajeEsperado(payload: Record<string, unknown>): string {
  return primerErrorCanonico(guardarParcialAnamnesisSchema, payload);
}

beforeAll(async () => {
  const creado = await crearAppAnamnesis();
  app = creado.app;
  rutaAnamnesisRegistrada = creado.rutaAnamnesisRegistrada;
  const dueno = await loginDueno(app);
  tokenDueno = dueno.token;
  userIdDueno = dueno.userId;
  tokenRecep = (await loginRecepcionista(app)).token;
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

describe("AN-01 registro completo (23 campos / 4 secciones, 25 propiedades)", () => {
  it("POST completo -> 201 vista DUENO con estado COMPLETA y los 25 valores", async () => {
    const cliente = await nuevoCliente();
    const payload = payloadCompleto();
    const res = await postAnamnesis(tokenDueno, cliente.id, payload);

    expect(
      res.statusCode,
      `registro completo (ruta anamnesis registrada: ${rutaAnamnesisRegistrada})`
    ).toBe(201);
    const body = parseBody(res);
    expect(anamnesisDuenoSchema.safeParse(body).success, "vista DUENO valida").toBe(true);
    expect(body.estado).toBe("COMPLETA");
    expect(body.clienteId).toBe(cliente.id);

    // Contrato de serializacion por whitelist (AN-28: lo no diligenciado viaja
    // como null): 25 propiedades + 4 metadatos staff, sin claves extra.
    const esperadas = [
      ...Object.keys(payload),
      "clienteId",
      "estado",
      "fechaActualizacion",
      "actualizadoPorId",
    ].sort();
    expect(Object.keys(body).sort()).toEqual(esperadas);

    // Literales exactos del Anexo DEC-052 persistidos y recuperables.
    expect(body.sexo).toBe("FEMENINO");
    expect(body.rh).toBe("O+");
    expect(body.antecedentesMedicos).toEqual(["Alergias"]);
    expect(body.diasNoEntrenamiento).toEqual(["lunes", "viernes"]);
    expect(body.nivelActividad).toBe("estoy bastante activo durante mi dia");
    expect(body.horaAcostarse).toBe("22:30");
  });

  it("AN-01: el GET devuelve los mismos 25 valores con los literales exactos", async () => {
    const cliente = await nuevoCliente();
    const payload = payloadCompleto();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payload);

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenDueno),
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    for (const [clave, valor] of Object.entries(payload)) {
      expect(body[clave], `valor de ${clave} tras el roundtrip`).toEqual(valor);
    }
  });
});

describe("AN-02 asociacion al cliente correcto", () => {
  it("la anamnesis queda asociada al id de A y B queda sin registro", async () => {
    const clienteA = await nuevoCliente();
    const clienteB = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, clienteA.id, payloadCompleto());

    const resA = await app.inject({
      method: "GET",
      url: `/clientes/${clienteA.id}/anamnesis`,
      headers: headers(tokenDueno),
    });
    expect(resA.statusCode).toBe(200);
    expect(parseBody(resA).clienteId).toBe(clienteA.id);

    const resB = await app.inject({
      method: "GET",
      url: `/clientes/${clienteB.id}/anamnesis`,
      headers: headers(tokenDueno),
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = parseBody(resB);
    expect(bodyB.estado).toBe("SIN_REGISTRO");
    expect(bodyB).not.toHaveProperty("nombreCompleto");
  });

  it("clienteId inexistente -> 404 Cliente no encontrado y nada se persiste", async () => {
    const res = await postAnamnesis(tokenDueno, "id-fantasma-inc09", payloadCompleto());
    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_404_CLIENTE);
    expect(body.code).toBe("NOT_FOUND");
  });
});

describe("AN-04 trazabilidad (fechaActualizacion + actualizadoPorId)", () => {
  it("tras el registro, actualizadoPorId = DUENO autenticado y fecha ISO", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, payloadCompleto());
    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.actualizadoPorId).toBe(userIdDueno);
    expect(String(body.fechaActualizacion)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isNaN(Date.parse(body.fechaActualizacion))).toBe(false);
  });
});

describe("AN-21/AN-22 guardado parcial -> PENDIENTE (ENMIENDA C4 R4)", () => {
  it("POST con 1 campo diligenciado -> 201 PENDIENTE (nunca 400 por ausencias)", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.estado).toBe("PENDIENTE");
    expect(body.objetivosEntrenamiento).toBe("Ganar masa muscular");
  });

  it("POST parcial sin varios obligatorios -> 201 PENDIENTE con los faltantes en null", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {
      nombreCompleto: "Ana Maria Perez",
      sexo: "FEMENINO",
    });
    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.estado).toBe("PENDIENTE");
    expect(body.nombreCompleto).toBe("Ana Maria Perez");
    expect(body.eps).toBeNull();
    expect(body.edad).toBeNull();
  });

  it("AN-07 rama ausente (R4): 11=SI sin 12 -> 201 PENDIENTE", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {
      practicaDeporte: "SI",
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    expect(res.statusCode).toBe(201);
    expect(parseBody(res).estado).toBe("PENDIENTE");
  });

  it("AN-07 rama ausente (R4): 18a=SI sin 18b -> 201 PENDIENTE", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {
      enfermedadRelevante: "SI",
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    expect(res.statusCode).toBe(201);
    expect(parseBody(res).estado).toBe("PENDIENTE");
  });

  it("AN-22: con los 14 obligatorios + condicionales aplicables -> COMPLETA", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, payloadCompleto());
    expect(res.statusCode).toBe(201);
    expect(parseBody(res).estado).toBe("COMPLETA");
  });
});

describe("AN-26 guarda de body: al menos un campo diligenciado", () => {
  it("body {} -> 400 con el mensaje literal AN-26", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {});
    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_AN26);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("body solo con claves vacias (null / \"\") -> 400 AN-26", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, {
      estadoCivil: "",
      eps: null,
    });
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(MENSAJE_AN26);
  });

  it("body con 1 campo diligenciado -> 201 PENDIENTE", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenDueno, cliente.id, { estadoCivil: "Soltero" });
    expect(res.statusCode).toBe(201);
    expect(parseBody(res).estado).toBe("PENDIENTE");
  });
});

describe("DEC-057 registro unico: 409 ANAMNESIS_EXISTENTE", () => {
  it("el segundo POST para el mismo cliente -> 409 y el registro no se duplica", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await postAnamnesis(tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Segunda version",
    });
    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("ANAMNESIS_EXISTENTE");

    // El registro previo sigue siendo el unico y conserva sus valores.
    const get = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenDueno),
    });
    expect(parseBody(get).objetivosEntrenamiento).toBe("Ganar masa muscular");
  });
});

describe("AN-06 enums exactos del Anexo (lo presente se valida, AN-24)", () => {
  const casos: Array<[string, Record<string, unknown>]> = [
    ["sexo 'M'", { sexo: "M" }],
    ["sexo minusculas", { sexo: "femenino" }],
    ["practicaDeporte 'Si'", { practicaDeporte: "Si" }],
    ["nivelActividad parrafasis", { nivelActividad: "muy activo" }],
    ["enfermedadRelevante 'no se'", { enfermedadRelevante: "no se" }],
    ["antecedente fuera del set", { antecedentesMedicos: ["asma"] }],
    ["dia fuera del set", { diasNoEntrenamiento: ["sabado"] }],
    ["dia con capitalizacion distinta", { diasNoEntrenamiento: ["Miercoles"] }],
  ];

  for (const [nombre, campo] of casos) {
    it(`${nombre} -> 400 con el mensaje del schema canonico`, async () => {
      const cliente = await nuevoCliente();
      const payload = { ...campo };
      const res = await postAnamnesis(tokenDueno, cliente.id, payload);
      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(mensajeEsperado(payload));
    });
  }
});

describe("AN-07 contradicciones SI/NO (siempre 400, incluso en parcial)", () => {
  const casos: Array<[string, Record<string, unknown>]> = [
    [
      "11=NO con 12 diligenciado",
      { practicaDeporte: "NO", cualDeporte: "Futbol" },
    ],
    [
      "11 ausente con 12 diligenciado",
      { cualDeporte: "Futbol" },
    ],
    [
      "18a=NO con 18b diligenciado",
      { enfermedadRelevante: "NO", cualEnfermedad: "Hipertension" },
    ],
    [
      "18a ausente con 18b diligenciado",
      { cualEnfermedad: "Hipertension" },
    ],
  ];

  for (const [nombre, payload] of casos) {
    it(`${nombre} -> 400 con el mensaje del schema canonico`, async () => {
      const cliente = await nuevoCliente();
      const res = await postAnamnesis(tokenDueno, cliente.id, payload);
      expect(res.statusCode).toBe(400);
      expect(parseBody(res).error).toBe(mensajeEsperado(payload));
    });
  }
});

describe("AN-08 formato por campo", () => {
  const casos: Array<[string, Record<string, unknown>]> = [
    ["documento no numerico", { numeroDocumento: "CC1020" }],
    ["documento corto", { numeroDocumento: "12345" }],
    ["RH libre", { rh: "cero positivo" }],
    ["RH fuera de los 8 tipos", { rh: "X" }],
    ["fecha nacimiento formato", { fechaNacimiento: "12/04/1998" }],
    ["fecha nacimiento futura", { fechaNacimiento: "2030-01-01" }],
    ["contacto con letras", { numeroContacto: "30012a4567" }],
    ["correo sin dominio", { correoElectronico: "ana@mail" }],
    ["hora formato 12h", { horaAcostarse: "10:30 pm" }],
  ];

  for (const [nombre, payload] of casos) {
    it(`${nombre} -> 400 con el mensaje del campo`, async () => {
      const cliente = await nuevoCliente();
      const res = await postAnamnesis(tokenDueno, cliente.id, payload);
      expect(res.statusCode).toBe(400);
      expect(parseBody(res).error).toBe(mensajeEsperado(payload));
    });
  }

  it("DEC-059: los 8 tipos de sangre del regex RH pasan", async () => {
    for (const rh of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
      const cliente = await nuevoCliente();
      const res = await postAnamnesis(tokenDueno, cliente.id, { rh });
      expect(res.statusCode, `RH ${rh} debe ser valido`).toBe(201);
    }
  });
});

describe("AN-09 valores limite (DEC-059: edad 13..100, comidas 1..12)", () => {
  it("edad 13 y 100 aceptan; 12 y 101 -> 400", async () => {
    for (const edad of [13, 100]) {
      const cliente = await nuevoCliente();
      const res = await postAnamnesis(tokenDueno, cliente.id, { edad });
      expect(res.statusCode, `edad ${edad}`).toBe(201);
    }
    for (const edad of [12, 101]) {
      const cliente = await nuevoCliente();
      const payload = { edad };
      const res = await postAnamnesis(tokenDueno, cliente.id, payload);
      expect(res.statusCode, `edad ${edad}`).toBe(400);
      expect(parseBody(res).error).toBe(mensajeEsperado(payload));
    }
  });

  it("comidasPorDia 1 y 12 aceptan; 0 y 13 -> 400", async () => {
    for (const comidasPorDia of [1, 12]) {
      const cliente = await nuevoCliente();
      const res = await postAnamnesis(tokenDueno, cliente.id, { comidasPorDia });
      expect(res.statusCode, `comidas ${comidasPorDia}`).toBe(201);
    }
    for (const comidasPorDia of [0, 13]) {
      const cliente = await nuevoCliente();
      const payload = { comidasPorDia };
      const res = await postAnamnesis(tokenDueno, cliente.id, payload);
      expect(res.statusCode, `comidas ${comidasPorDia}`).toBe(400);
      expect(parseBody(res).error).toBe(mensajeEsperado(payload));
    }
  });

  it("nombreCompleto de 2 caracteres -> 400; de 3 -> 201", async () => {
    const payloadCorto = { nombreCompleto: "An" };
    const resCorto = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, payloadCorto);
    expect(resCorto.statusCode).toBe(400);
    expect(parseBody(resCorto).error).toBe(mensajeEsperado(payloadCorto));

    const resOk = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, {
      nombreCompleto: "Ana",
    });
    expect(resOk.statusCode).toBe(201);
  });
});

describe("AN-10 multi-selects (16 y 21)", () => {
  it("'Ninguno' combinado con otros -> 400", async () => {
    const payload = { antecedentesMedicos: ["Ninguno", "fuma"] };
    const res = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, payload);
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(mensajeEsperado(payload));
  });

  it("valores repetidos en antecedentes -> 400", async () => {
    const payload = { antecedentesMedicos: ["fuma", "fuma"] };
    const res = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, payload);
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(mensajeEsperado(payload));
  });

  it("['Ninguno'] solo es valido", async () => {
    const res = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, {
      antecedentesMedicos: ["Ninguno"],
    });
    expect(res.statusCode).toBe(201);
  });

  it("dias repetidos -> 400; subconjunto valido -> 201", async () => {
    const payloadRepetido = { diasNoEntrenamiento: ["lunes", "lunes"] };
    const res = await postAnamnesis(
      tokenDueno,
      (await nuevoCliente()).id,
      payloadRepetido
    );
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(mensajeEsperado(payloadRepetido));

    const resOk = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, {
      diasNoEntrenamiento: ["martes", "jueves"],
    });
    expect(resOk.statusCode).toBe(201);
  });
});

describe("AN-11 contrato cerrado (sin campos inventados)", () => {
  it("clave desconocida -> 400 que identifica la clave prohibida", async () => {
    const res = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, {
      peso: 80,
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain("Campos no permitidos en el formulario");
    expect(body.error).toContain("peso");
  });

  it("el estado nunca viaja como entrada del usuario", async () => {
    const res = await postAnamnesis(tokenDueno, (await nuevoCliente()).id, {
      estado: "COMPLETA",
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("R7 — orden de errores del POST (primer paso que aplica responde)", () => {
  it("sin token -> 401 antes que cualquier otra validacion", async () => {
    const cliente = await nuevoCliente();
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/anamnesis`,
      payload: payloadCompleto(),
    });
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("RECEPCIONISTA -> 403 (preHandler) incluso con body invalido", async () => {
    const cliente = await nuevoCliente();
    const res = await postAnamnesis(tokenRecep, cliente.id, {});
    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
  });

  it("CLIENTE -> 403 (preHandler) con datos validos, sin persistir nada", async () => {
    const cliente = await nuevoCliente();
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");
    const res = await postAnamnesis(tokenCliente, cliente.id, payloadCompleto());
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
  });

  it("400 params ANTES de 400 body: id invalido + body {} -> 400 sin el mensaje AN-26", async () => {
    const idInvalido = "x".repeat(40); // supera max(36) del patron de params
    const res = await postAnamnesis(tokenDueno, idInvalido, {});
    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).not.toBe(MENSAJE_AN26);
  });

  it("400 params ANTES de 404 cliente: id invalido + body valido -> 400 (no 404)", async () => {
    const idInvalido = "y".repeat(40);
    const res = await postAnamnesis(tokenDueno, idInvalido, payloadCompleto());
    expect(res.statusCode).toBe(400);
  });

  it("400 body ANTES de 404 cliente: body {} + cliente inexistente -> 400 AN-26", async () => {
    const res = await postAnamnesis(tokenDueno, "id-fantasma-inc09-b", {});
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(MENSAJE_AN26);
  });

  it("404 cliente ANTES de 409/201: cliente inexistente + body valido -> 404", async () => {
    const res = await postAnamnesis(tokenDueno, "id-fantasma-inc09-c", payloadCompleto());
    expect(res.statusCode).toBe(404);
    expect(parseBody(res).error).toBe(MENSAJE_404_CLIENTE);
  });

  it("201 al final de la escalera y 409 solo con registro existente", async () => {
    const cliente = await nuevoCliente();
    const primero = await postAnamnesis(tokenDueno, cliente.id, payloadCompleto());
    expect(primero.statusCode).toBe(201);
    const segundo = await postAnamnesis(tokenDueno, cliente.id, payloadCompleto());
    expect(segundo.statusCode).toBe(409);
    expect(parseBody(segundo).code).toBe("ANAMNESIS_EXISTENTE");
  });
});
