/**
 * INC-09 (RED) — Portal del cliente: lectura de anamnesis (HU-28).
 * Criterios: AN-28..AN-33 + endpoint 1b `GET /portal/anamnesis` del contrato
 * API RATIFICADO (spec INC-09, 2026-11-04; R2/C9).
 *
 * Contrato fijado por este RED (para el GREEN T9):
 *  - `GET /portal/anamnesis` (CLIENTE por token, SIN id en URL — R2/C9):
 *    200 con `anamnesisClienteSeccionesSchema` (agrupada S1-S4) o SIN_REGISTRO.
 *  - `GET /clientes/:clienteId/anamnesis` con CLIENTE propio devuelve la MISMA
 *    vista agrupada S1-S4 (25 valores propios; lo no diligenciado viaja como
 *    `null`), `estado` (PENDIENTE/COMPLETA) y `fechaActualizacion`; **sin
 *    `actualizadoPorId`** (DEC-041: metadatos internos del staff no se exponen
 *    al rol CLIENTE).
 *  - Solo lectura (AN-29): las escrituras con token CLIENTE responden 403
 *    (verificadas en inc09-anamnesis-permisos.test.ts).
 *  - SIN_REGISTRO = 200 + marcador (verificado para los 3 roles en
 *    inc09-anamnesis-permisos.test.ts; aquí el del portal).
 *
 * FASE RED (2026-11-04): los endpoints de anamnesis NO existen (GREEN T9).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`; ausencias siempre tras
 * guarda positiva.
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import {
  MENSAJE_SIN_REGISTRO,
  crearAnamnesisViaApi,
  crearAppAnamnesis,
  crearClienteUnico,
  headers,
  limpiarFixtures,
  loginCliente,
  loginDueno,
  parseBody,
  payloadCompleto,
} from "./inc09-anamnesis-helpers";
import { SECCIONES_ANAMNESIS } from "../../features/acceptance-criteria/HU-09-schemas";
import {
  anamnesisClienteSeccionesSchema,
  anamnesisSinRegistroSchema,
} from "../../features/acceptance-criteria/HU-28-schemas";

const PREFIJO = "9954";

let app: any;
let tokenDueno = "";

async function nuevoCliente() {
  return crearClienteUnico(PREFIJO);
}

function getPortalAnamnesis(token: string) {
  return app.inject({
    method: "GET",
    url: "/portal/anamnesis",
    headers: headers(token),
  });
}

beforeAll(async () => {
  const creado = await crearAppAnamnesis();
  app = creado.app;
  tokenDueno = (await loginDueno(app)).token;
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

describe("AN-28/AN-30 consulta del portal: vista agrupada S1-S4", () => {
  it("GET /portal/anamnesis -> 200 con secciones.S1..S4 y los 25 valores propios", async () => {
    const cliente = await nuevoCliente();
    const payload = payloadCompleto();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payload);
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await getPortalAnamnesis(tokenCliente);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(
      anamnesisClienteSeccionesSchema.safeParse(body).success,
      "vista por secciones valida"
    ).toBe(true);

    // AN-30: las 4 secciones exactas del Anexo, cada campo en su seccion.
    expect(Object.keys(body.secciones).sort()).toEqual(["S1", "S2", "S3", "S4"]);
    for (const [clave, seccion] of Object.entries(SECCIONES_ANAMNESIS)) {
      const campos = (seccion as { campos: readonly string[] }).campos;
      expect(
        Object.keys((body.secciones as any)[clave]).sort(),
        `reparto de la seccion ${clave}`
      ).toEqual([...campos].sort());
    }

    // Valores propios con los literales exactos (el cliente ve sus sensibles).
    expect(body.secciones.S1.nombreCompleto).toBe("Ana Maria Perez");
    expect(body.secciones.S1.rh).toBe("O+");
    expect(body.secciones.S3.antecedentesMedicos).toEqual(["Alergias"]);
    expect(body.secciones.S3.cualEnfermedad).toBe("Hipertension");
    expect(body.secciones.S4.diasNoEntrenamiento).toEqual(["lunes", "viernes"]);
  });

  it("lo no diligenciado viaja como null dentro de su seccion", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await getPortalAnamnesis(tokenCliente);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    // Guarda positiva: la seccion con datos llega completa.
    expect(body.secciones.S4.objetivosEntrenamiento).toBe("Ganar masa muscular");
    expect(body.secciones.S1.nombreCompleto).toBeNull();
    expect(body.secciones.S2.practicaDeporte).toBeNull();
  });
});

describe("AN-33 estado y última actualización sin datos de staff (DEC-041)", () => {
  it("la respuesta trae estado + fechaActualizacion y NUNCA actualizadoPorId", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await getPortalAnamnesis(tokenCliente);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    // Guarda positiva: metadatos observables presentes.
    expect(body.estado).toBe("COMPLETA");
    expect(Number.isNaN(Date.parse(body.fechaActualizacion))).toBe(false);
    expect(body).not.toHaveProperty("actualizadoPorId");
  });

  it("la marca PENDIENTE es observable sin acciones de edicion", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
    });
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await getPortalAnamnesis(tokenCliente);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estado).toBe("PENDIENTE");
  });
});

describe("AN-31 jamás la anamnesis de otro cliente (portal sin id en URL)", () => {
  it("el portal responde siempre la del token (clienteId propio)", async () => {
    const clienteA = await nuevoCliente();
    const clienteB = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, clienteA.id, {
      objetivosEntrenamiento: "Objetivos del cliente A",
    });
    await crearAnamnesisViaApi(app, tokenDueno, clienteB.id, {
      objetivosEntrenamiento: "Objetivos del cliente B",
    });
    const tokenA = await loginCliente(app, clienteA.cedula, "1234");

    const res = await getPortalAnamnesis(tokenA);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.clienteId).toBe(clienteA.id);
    expect(body.secciones.S4.objetivosEntrenamiento).toBe("Objetivos del cliente A");
    expect(res.body).not.toContain("Objetivos del cliente B");
  });

  it("la vista propia via GET /clientes/:id/anamnesis tambien es agrupada S1-S4", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenCliente),
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(
      anamnesisClienteSeccionesSchema.safeParse(body).success,
      "vista por secciones valida"
    ).toBe(true);
    expect(Object.keys(body.secciones).sort()).toEqual(["S1", "S2", "S3", "S4"]);
    expect(body).not.toHaveProperty("actualizadoPorId");
  });
});

describe("AN-32 sin anamnesis registrada: mensaje claro", () => {
  it("GET /portal/anamnesis sin registro -> 200 SIN_REGISTRO con el mensaje literal", async () => {
    const cliente = await nuevoCliente();
    const tokenCliente = await loginCliente(app, cliente.cedula, "1234");

    const res = await getPortalAnamnesis(tokenCliente);
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(anamnesisSinRegistroSchema.safeParse(body).success).toBe(true);
    expect(body.estado).toBe("SIN_REGISTRO");
    expect(body.mensaje).toBe(MENSAJE_SIN_REGISTRO);
    // Nunca pantalla vacia ni formulario editable desde la API.
    expect(body).not.toHaveProperty("secciones");
    expect(body).not.toHaveProperty("nombreCompleto");
  });

  it("el portal exige sesion CLIENTE (sin token -> 401)", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/anamnesis" });
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });
});
