/**
 * INC-10 (RED) — Visualización de la rutina activa en el portal del cliente.
 * Criterios: RU-36..RU-42 (HU-26) + DEC-066 (ocultación sin borrar), DEC-067
 * (lectura desde snapshot), DEC-068 (estructura completa), DEC-070
 * (`SIN_RUTINA_MENSAJE`) y contrato API RATIFICADO (endpoint 8).
 *
 * Endpoint fijado por este RED:
 *   GET /portal/rutina (token CLIENTE de sesión; self-only, sin clienteId) ->
 *   200 `rutinaPortalSchema` desde `contenidoSnapshot` (.strict() SIN
 *   `actor`/`actualizadoPor`) | `{ mensaje: "No tienes una rutina activa" }`
 *   (`sinRutinaPortalSchema`); 403 para roles staff; sin DELETE (404/405).
 *   Escrituras con token CLIENTE sobre la gestión de rutinas -> 403 (RU-40).
 *
 * FASE RED (2026-11-05): el endpoint NO existe (GREEN T7).
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
  crearRutinaBaseViaApi,
  crearRutinaPersonalizadaViaApi,
  fixtureVigenciaPersonalizada,
  congelarVigencia,
  asignarRutinaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  tokenExpirado,
  hoyBogota,
  sumarDias,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  PIN_CLIENTE_FIXTURE,
  MENSAJE_SIN_RUTINA,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  respuestaRutinaPortalSchema,
  rutinaPortalBaseSchema,
  rutinaPortalPersonalizadaSchema,
  sinRutinaPortalSchema,
} from "../../features/acceptance-criteria/HU-26-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10t"): cedulas de 10 digitos para `loginClientSchema` (`^\d{6,10}$`).
// Intencion intacta: unicidad por archivo + limpieza por `startsWith`.
const PREFIJO = "9956";

let app: any;
let dueno: SesionStaff;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc10-rutinas-secret";
  await limpiarFixtures(PREFIJO);
  ({ app } = await crearAppRutinas());
  dueno = await loginDueno(app);
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

async function getPortal(token: string, query = "") {
  const res = await app.inject({
    method: "GET",
    url: `/portal/rutina${query}`,
    headers: headers(token),
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

// ─── RU-36 — self-only ───────────────────────────────────────────────────────

describe("RU-36 el cliente visualiza SOLO su rutina activa", () => {
  it("cliente A con activa ve la SUYA (rutinaPortalBaseSchema); cliente B sin nada ve el mensaje", async () => {
    const clienteA = await crearClienteUnico(PREFIJO, { nombres: "Portal", apellidos: "Cliente A" });
    const clienteB = await crearClienteUnico(PREFIJO, { nombres: "Portal", apellidos: "Cliente B" });
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina portal A RU36" })
    );
    const asignacion = await asignarRutinaViaApi(app, dueno.token, clienteA.id, {
      rutinaId: rutina.body.id,
    });
    expect(asignacion.statusCode).toBe(201);

    const tokenA = await loginCliente(app, clienteA.cedula, PIN_CLIENTE_FIXTURE);
    const portalA = await getPortal(tokenA);
    expect(portalA.statusCode).toBe(200);
    expect(rutinaPortalBaseSchema.safeParse(portalA.body).success).toBe(true);
    expect(portalA.body.nombre).toBe("Rutina portal A RU36");
    expect(portalA.body.asignacionId).toBe(asignacion.body.id);
    expect(portalA.body.fechaInicio).toBe(asignacion.body.fechaInicio);

    const tokenB = await loginCliente(app, clienteB.cedula, PIN_CLIENTE_FIXTURE);
    const portalB = await getPortal(tokenB);
    expect(portalB.statusCode).toBe(200);
    expect(sinRutinaPortalSchema.safeParse(portalB.body).success).toBe(true);
    expect(portalB.body.mensaje).toBe(MENSAJE_SIN_RUTINA);
    expect(portalB.raw, "jamás datos de A").not.toContain("Rutina portal A RU36");
  });

  it("clienteId ajeno en query -> 403/404 sin datos del otro cliente (SEC-01/SEC-03)", async () => {
    const clienteA = await crearClienteUnico(PREFIJO);
    const clienteB = await crearClienteUnico(PREFIJO);
    const rutinaB = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina portal ajena RU36" })
    );
    await asignarRutinaViaApi(app, dueno.token, clienteB.id, { rutinaId: rutinaB.body.id });

    const tokenA = await loginCliente(app, clienteA.cedula, PIN_CLIENTE_FIXTURE);
    const intento = await getPortal(tokenA, `?clienteId=${clienteB.id}`);
    expect([403, 404], `status observado ${intento.statusCode}`).toContain(
      intento.statusCode
    );
    expect(intento.raw, "sin datos de B").not.toContain("Rutina portal ajena RU36");
    expect(intento.raw).not.toContain(clienteB.id);
  });
});

// ─── RU-37 / RU-38 — visibilidad por tipo y vigencia (DEC-066) ───────────────

describe("RU-37/38 visibilidad por tipo y vigencia personalizada", () => {
  it("PERSONALIZADA con vigencia ACTIVA -> estructura COMPLETA (DEC-068) sin campos de staff", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina portal pers RU37" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });

    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(portal.statusCode).toBe(200);
    expect(rutinaPortalPersonalizadaSchema.safeParse(portal.body).success).toBe(true);
    expect(portal.body.tipoRutina).toBe("PERSONALIZADA");

    // DEC-068: estructura completa (info, diagnóstico, ciclos y evaluaciones).
    expect(portal.body.informacionGeneral.objetivoGeneral).toBe("Ganar masa muscular");
    expect(portal.body.diagnostico.diagnostico).toBe("Buena postura general");
    expect(portal.body.macrociclos[0].mesociclos[0].microciclos[0].sesiones).toHaveLength(1);
    expect(portal.body.tests).toHaveLength(1);
    expect(portal.body.antropometria).toHaveLength(2);
    expect(portal.body.analisisBiomecanico).toHaveLength(1);

    // RU-41/SEC-01/SEC-03: jamás actor/actualizadoPor (strict).
    expect(Object.keys(portal.body)).not.toContain("actor");
    expect(Object.keys(portal.body)).not.toContain("actualizadoPor");
    expect(portal.raw).not.toContain("actualizadoPor");
  });

  it("PERSONALIZADA con vigencia VENCIDA -> mensaje SIN_RUTINA (oculta) sin borrar la asignación", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    // Se asigna con vigencia ACTIVA y DESPUÉS la vigencia vence (DEC-066:
    // validada al cambio + ocultación en lectura, sin auto-cierre).
    const vigencia = await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina portal pers vencida RU37" })
    );
    const asignacion = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(asignacion.statusCode).toBe(201);

    const hoy = hoyBogota();
    const editar = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/servicios-personalizado/${vigencia!.id}`,
      headers: headers(dueno.token),
      payload: {
        fechaInicio: sumarDias(hoy, -30),
        fechaFin: sumarDias(hoy, -1),
        version: 1,
      },
    });
    expect(editar.statusCode, "la vigencia queda VENCIDA").toBe(200);

    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(portal.statusCode).toBe(200);
    expect(sinRutinaPortalSchema.safeParse(portal.body).success).toBe(true);
    expect(portal.body.mensaje).toBe(MENSAJE_SIN_RUTINA);
    expect(portal.raw).not.toContain("Rutina portal pers vencida RU37");

    // La asignación NO se borra (literal INC05-PER-05).
    const historial = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/rutinas/historial`,
      headers: headers(dueno.token),
    });
    expect(parseBody(historial).total).toBe(1);
  });

  it("PERSONALIZADA con vigencia CONGELADO -> mensaje (oculta) y asignación intacta", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const vigencia = await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina portal pers congelada RU37" })
    );
    const asignacion = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(asignacion.statusCode).toBe(201);
    await congelarVigencia(app, dueno.token, cliente.id, vigencia!.id);

    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(portal.statusCode).toBe(200);
    expect(portal.body.mensaje).toBe(MENSAJE_SIN_RUTINA);
    expect(portal.raw).not.toContain("Rutina portal pers congelada RU37");
  });

  it("GENERICA/INDUCCION sin vigencia personalizada -> visibles (RU-24/HU-26 c3)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaGenerica = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina portal generica RU38" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaGenerica.body.id,
    });

    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(portal.statusCode).toBe(200);
    expect(rutinaPortalBaseSchema.safeParse(portal.body).success).toBe(true);
    expect(portal.body.tipoRutina).toBe("GENERICA");
    expect(portal.body.nombre).toBe("Rutina portal generica RU38");
  });
});

// ─── RU-39 — sin rutina visible: mensaje claro ───────────────────────────────

describe("RU-39 sin rutina visible", () => {
  it("sin asignación activa -> 200 con el literal exacto 'No tienes una rutina activa'", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(portal.statusCode).toBe(200);
    expect(sinRutinaPortalSchema.safeParse(portal.body).success).toBe(true);
    expect(portal.body.mensaje).toBe("No tienes una rutina activa");
    expect(portal.body.mensaje).toBe(MENSAJE_SIN_RUTINA);
    expect(portal.body).toEqual({ mensaje: MENSAJE_SIN_RUTINA });
  });

  it("la respuesta completa valida con respuestaRutinaPortalSchema (rutina | mensaje)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina portal union RU39" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });
    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);
    expect(respuestaRutinaPortalSchema.safeParse(portal.body).success).toBe(true);
    expect(portal.body.tipoRutina).toBe("INDUCCION");
  });
});

// ─── RU-40 — solo lectura ────────────────────────────────────────────────────

describe("RU-40 el cliente no puede editar (solo lectura)", () => {
  it("matriz de escrituras con token CLIENTE -> 403 en los endpoints de escritura; DELETE sin ruta (404/405)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina portal escritura RU40" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });
    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);

    const escrituras: Array<[string, string, Record<string, unknown> | undefined]> = [
      ["POST", "/rutinas", payloadRutinaBase({ nombre: "Intento RU40" })],
      ["POST", "/rutinas-personalizadas", payloadRutinaPersonalizada({ nombre: "Intento RU40" })],
      ["PATCH", `/rutinas/${rutina.body.id}`, { descripcion: "Intento" }],
      ["POST", `/clientes/${cliente.id}/rutinas/asignacion`, { rutinaId: rutina.body.id }],
    ];
    for (const [metodo, url, payload] of escrituras) {
      const res = await app.inject({
        method: metodo as any,
        url,
        headers: headers(token),
        payload,
      });
      expect(res.statusCode, `${metodo} ${url} con CLIENTE`).toBe(403);
    }

    // Sin DELETE en MVP (patrón Anamnesis/DEC-057): no hay ruta de borrado.
    for (const [metodo, url] of [
      ["DELETE", "/portal/rutina"],
      ["DELETE", `/rutinas/${rutina.body.id}`],
    ] as const) {
      const res = await app.inject({ method: metodo, url, headers: headers(token) });
      expect([404, 405], `${metodo} ${url}`).toContain(res.statusCode);
    }

    // El contenido no cambia.
    const portal = await getPortal(token);
    expect(portal.body.nombre).toBe("Rutina portal escritura RU40");
  });
});

// ─── RU-41 — secciones mostradas (DEC-068) sin datos de staff ────────────────

describe("RU-41 el DTO del portal nunca incluye actor/actualizadoPor", () => {
  it("la respuesta de la base valida el schema strict y viaja sin claves de staff", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina portal strict RU41" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });
    const token = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const portal = await getPortal(token);

    expect(rutinaPortalBaseSchema.safeParse(portal.body).success).toBe(true);
    expect(Object.keys(portal.body)).not.toContain("actor");
    expect(Object.keys(portal.body)).not.toContain("actualizadoPor");
    expect(portal.raw).not.toContain("actor");
    expect(portal.raw).not.toContain("actualizadoPor");

    // Estructura base completa (DEC-068): sesiones -> ejercicios -> series.
    expect(portal.body.sesiones[0].ejercicios[0].series[0].repeticiones).toBe("8-12");
    expect(portal.body).toHaveProperty("objetivo");
    expect(portal.body).toHaveProperty("nivelExperiencia");
  });
});

// ─── RU-42 — seguridad de sesión y aislamiento ───────────────────────────────

describe("RU-42 seguridad de sesión", () => {
  it("sin token -> 401; token expirado -> 401", async () => {
    const sinToken = await app.inject({ method: "GET", url: "/portal/rutina" });
    expect(sinToken.statusCode).toBe(401);

    const cliente = await crearClienteUnico(PREFIJO);
    const vencido = tokenExpirado(app, {
      id: cliente.id,
      cedula: cliente.cedula,
      rol: "CLIENTE",
    });
    const expirado = await getPortal(vencido);
    expect(expirado.statusCode, "sesión expirada -> 401").toBe(401);
  });

  it("roles staff sobre /portal/rutina -> 403 (contrato ratificado)", async () => {
    const conDueno = await getPortal(dueno.token);
    expect(conDueno.statusCode, "DUENO no consume el portal del cliente").toBe(403);

    const recep = await loginRecepcionista(app);
    const conRecep = await getPortal(recep.token);
    expect(conRecep.statusCode, "RECEPCIONISTA tampoco").toBe(403);
  });
});
