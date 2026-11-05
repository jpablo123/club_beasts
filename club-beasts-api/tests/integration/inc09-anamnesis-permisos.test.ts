/**
 * INC-09 (RED) — Permisos y vistas por rol de la anamnesis (HU-10).
 * Criterios: AN-13..AN-20 + filtro DEC-055 (5 sensibles) + SIN_REGISTRO
 * idéntico para los 3 roles + orden de errores GET (R7) del contrato API
 * RATIFICADO (spec INC-09, 2026-11-04).
 *
 * Contrato fijado por este RED (para el GREEN T9):
 *  - `GET /clientes/:clienteId/anamnesis` con payload FILTRADO por rol:
 *      * DUENO: plana `anamnesisDuenoSchema` (25 propiedades + `clienteId,
 *        estado, fechaActualizacion, actualizadoPorId`).
 *      * RECEPCIONISTA: plana `anamnesisRecepcionSchema` — **20/25 propiedades
 *        (19/23 campos)**: las 5 claves de DEC-055 (`rh, antecedentesMedicos,
 *        antecedentesFamiliares, enfermedadRelevante, cualEnfermedad`) están
 *        AUSENTES (ni valores ni claves) + metadatos staff (INC09-R05: filtro
 *        en API, serialización por whitelist).
 *      * CLIENTE: solo la propia (403 self-only antes que 404, SEC-01/SEC-03).
 *    `SIN_REGISTRO` = **200** + `{ estado: "SIN_REGISTRO", mensaje }` con el
 *    mensaje literal fijado en el RED, idéntico para los 3 roles (R2).
 *  - Orden de errores GET (R7): 401 -> 403 rol -> 400 params -> 403 self-only
 *    (CLIENTE ajeno, mensaje propio, ANTES de 404) -> 404 cliente (solo staff)
 *    -> 200. El paso "403 rol" no es observable con tokens del dominio (los 3
 *    roles están permitidos en GET; el guard lo ejercitan los 401/403
 *    self-only) — ver reporte RED.
 *
 * FASE RED (2026-11-04): los endpoints de anamnesis NO existen (GREEN T9).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin ramas opcionales;
 * toda ausencia se asierta tras una guarda positiva.
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import {
  MENSAJE_404_CLIENTE,
  MENSAJE_SIN_REGISTRO,
  crearAnamnesisViaApi,
  crearAppAnamnesis,
  crearClienteUnico,
  headers,
  limpiarFixtures,
  loginCliente,
  loginDueno,
  loginRecepcionista,
  parseBody,
  payloadConSensiblesRastreables,
  tokenExpirado,
  VALORES_SENSIBLES,
} from "./inc09-anamnesis-helpers";
import {
  CAMPOS_SENSIBLES,
  anamnesisDuenoSchema,
  anamnesisRecepcionSchema,
} from "../../features/acceptance-criteria/HU-10-schemas";
import { anamnesisSinRegistroSchema } from "../../features/acceptance-criteria/HU-28-schemas";

const PREFIJO = "9953";

let app: any;
let tokenDueno = "";
let tokenRecep = "";

async function nuevoCliente() {
  return crearClienteUnico(PREFIJO);
}

function getAnamnesis(token: string, clienteId: string) {
  return app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/anamnesis`,
    headers: headers(token),
  });
}

beforeAll(async () => {
  const creado = await crearAppAnamnesis();
  app = creado.app;
  tokenDueno = (await loginDueno(app)).token;
  tokenRecep = (await loginRecepcionista(app)).token;
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

describe("AN-13 DUENO ve la anamnesis completa (25 propiedades + metadatos)", () => {
  it("GET con token DUENO contiene los 5 sensibles con sus valores", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadConSensiblesRastreables()
    );

    const res = await getAnamnesis(tokenDueno, cliente.id);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(anamnesisDuenoSchema.safeParse(body).success, "vista DUENO valida").toBe(true);

    // Guarda positiva: la vista realmente trae datos.
    expect(body.nombreCompleto).toBe("Ana Maria Perez");

    for (const clave of CAMPOS_SENSIBLES) {
      expect(body, `DUENO debe ver ${clave}`).toHaveProperty(clave);
    }
    expect(body.rh).toBe(VALORES_SENSIBLES.rh);
    expect(body.antecedentesMedicos).toEqual([...VALORES_SENSIBLES.antecedentesMedicos]);
    expect(body.cualEnfermedad).toBe(VALORES_SENSIBLES.cualEnfermedad);
    expect(body.actualizadoPorId).toBeTruthy();
  });
});

describe("AN-15 + DEC-055 + INC09-R05: RECEPCIONISTA sin los 5 sensibles", () => {
  it("GET RECEP: 20/25 props (24 claves) sin las 5 de DEC-055, ni valores ni claves", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadConSensiblesRastreables()
    );

    const res = await getAnamnesis(tokenRecep, cliente.id);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(
      anamnesisRecepcionSchema.safeParse(body).success,
      "vista RECEP valida"
    ).toBe(true);

    // Guarda positiva: la vista operativa realmente llega con datos.
    expect(body.nombreCompleto).toBe("Ana Maria Perez");
    expect(body.eps).toBe("Nueva EPS");
    expect(body.contactoEmergencia).toBe("Maria Perez 3001112233");

    // INC09-R05: las 5 claves no viajan en absoluto.
    for (const clave of CAMPOS_SENSIBLES) {
      expect(body, `RECEP no debe recibir la clave ${clave}`).not.toHaveProperty(clave);
    }

    // Serializacion por whitelist: 20 propiedades + 4 metadatos staff.
    const esperadas = [
      "nombreCompleto",
      "numeroDocumento",
      "sexo",
      "edad",
      "fechaNacimiento",
      "lugarNacimiento",
      "estadoCivil",
      "direccionResidencia",
      "numeroContacto",
      "correoElectronico",
      "practicaDeporte",
      "cualDeporte",
      "tiempoQuePractica",
      "contactoEmergencia",
      "eps",
      "objetivosEntrenamiento",
      "nivelActividad",
      "diasNoEntrenamiento",
      "horaAcostarse",
      "comidasPorDia",
      "clienteId",
      "estado",
      "fechaActualizacion",
      "actualizadoPorId",
    ].sort();
    expect(Object.keys(body).sort()).toEqual(esperadas);
  });

  it("el crudo de la respuesta no contiene los valores sensibles", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadConSensiblesRastreables()
    );

    const res = await getAnamnesis(tokenRecep, cliente.id);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Ana Maria Perez"); // guarda positiva
    expect(res.body).not.toContain(VALORES_SENSIBLES.rh);
    expect(res.body).not.toContain(VALORES_SENSIBLES.antecedentesFamiliares);
    expect(res.body).not.toContain(VALORES_SENSIBLES.cualEnfermedad);
    for (const valor of VALORES_SENSIBLES.antecedentesMedicos) {
      expect(res.body).not.toContain(valor);
    }
  });
});

describe("AN-17/AN-19 escritura solo DUENO (DEC-058)", () => {
  it("CLIENTE POST -> 403 y la BD no cambia", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenCliente),
      payload: { objetivosEntrenamiento: "Intento del cliente" },
    });
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");

    const despues = await getAnamnesis(tokenDueno, cliente.id);
    expect(parseBody(despues).objetivosEntrenamiento).toBe("Ganar masa muscular");
  });

  it("CLIENTE PATCH -> 403 y la BD no cambia", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenCliente),
      payload: { objetivosEntrenamiento: "Intento del cliente" },
    });
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");

    const despues = await getAnamnesis(tokenDueno, cliente.id);
    expect(parseBody(despues).objetivosEntrenamiento).toBe("Ganar masa muscular");
  });

  it("AN-19 RECEPCIONISTA POST/PATCH -> 403 y sin registro creado", async () => {
    const cliente = await nuevoCliente();

    const post = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenRecep),
      payload: { objetivosEntrenamiento: "Intento de recepcion" },
    });
    expect(post.statusCode).toBe(403);
    expect(parseBody(post).code).toBe("AUTH_FORBIDDEN");

    const get = await getAnamnesis(tokenDueno, cliente.id);
    expect(get.statusCode).toBe(200);
    expect(parseBody(get).estado).toBe("SIN_REGISTRO");
  });
});

describe("AN-18 privacidad: jamás la anamnesis de otro cliente", () => {
  it("CLIENTE A consulta la de B -> 403 con mensaje propio (antes que 404) y sin datos", async () => {
    const clienteA = await nuevoCliente();
    const clienteB = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      clienteB.id,
      payloadConSensiblesRastreables()
    );
    const tokenA = await loginCliente(app, clienteA.cedula, "1234");

    const res = await getAnamnesis(tokenA, clienteB.id);
    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    // "mensaje propio": no revela existencia (nunca el literal del 404).
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.error).not.toBe(MENSAJE_404_CLIENTE);
    // Sin ningún dato de B.
    expect(res.body).not.toContain("Ana Maria Perez");
    expect(body).not.toHaveProperty("nombreCompleto");
  });

  it("CLIENTE A consulta un id inexistente -> 403 (no 404: no revela existencia)", async () => {
    const clienteA = await nuevoCliente();
    const tokenA = await loginCliente(app, clienteA.cedula, "1234");

    const res = await getAnamnesis(tokenA, "id-fantasma-inc09-priv");
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
  });
});

describe("AN-20 sin sesión válida", () => {
  it("sin token -> 401 sin datos de anamnesis", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadConSensiblesRastreables()
    );

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/anamnesis`,
    });
    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_MISSING");
    expect(body).not.toHaveProperty("nombreCompleto");
    expect(res.body).not.toContain("Ana Maria Perez");
  });

  it("token expirado -> 401 AUTH_TOKEN_EXPIRED sin datos", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadConSensiblesRastreables()
    );
    const vencido = tokenExpirado(app, { id: "user-inc09-vencido", rol: "DUENO" });

    const res = await getAnamnesis(vencido, cliente.id);
    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_EXPIRED");
    expect(res.body).not.toContain("Ana Maria Perez");
  });
});

describe("R2 SIN_REGISTRO: 200 + marcador idéntico para los 3 roles", () => {
  it("DUENO, RECEPCIONISTA y CLIENTE reciben el mismo { estado, mensaje }", async () => {
    const cliente = await nuevoCliente();
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const respuestas: any[] = [];
    for (const [rol, token] of [
      ["DUENO", tokenDueno],
      ["RECEPCIONISTA", tokenRecep],
      ["CLIENTE", tokenCliente],
    ] as const) {
      const res = await getAnamnesis(token, cliente.id);
      expect(res.statusCode, `SIN_REGISTRO con rol ${rol}`).toBe(200);
      const body = parseBody(res);
      expect(anamnesisSinRegistroSchema.safeParse(body).success, rol).toBe(true);
      expect(body.estado).toBe("SIN_REGISTRO");
      expect(body.mensaje).toBe(MENSAJE_SIN_REGISTRO);
      // Sin restos de datos del formulario.
      expect(body).not.toHaveProperty("nombreCompleto");
      respuestas.push(body);
    }
    expect(respuestas[1]).toEqual(respuestas[0]);
    expect(respuestas[2]).toEqual(respuestas[0]);
  });
});

describe("R7 — orden de errores del GET", () => {
  it("sin token -> 401 antes que params/404", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/id-fantasma-inc09-g/anamnesis`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("400 params ANTES de 404 cliente: id invalido con DUENO -> 400", async () => {
    const res = await getAnamnesis(tokenDueno, "w".repeat(40));
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
  });

  it("403 self-only ANTES de 404 cliente: CLIENTE ajeno + id inexistente -> 403", async () => {
    const clienteA = await nuevoCliente();
    const tokenA = await loginCliente(app, clienteA.cedula, "1234");
    const res = await getAnamnesis(tokenA, "id-fantasma-inc09-h");
    expect(res.statusCode).toBe(403);
  });

  it("404 cliente (solo staff): DUENO + id inexistente -> Cliente no encontrado", async () => {
    const res = await getAnamnesis(tokenDueno, "id-fantasma-inc09-i");
    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_404_CLIENTE);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("200 al final de la escalera (vista por rol)", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    const res = await getAnamnesis(tokenDueno, cliente.id);
    expect(res.statusCode).toBe(200);
  });
});
