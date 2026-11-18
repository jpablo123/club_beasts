/**
 * INC-10 (RED) — Historial de asignaciones y estado de la rutina activa (ficha).
 * Criterios: RU-29..RU-35 (HU-21) + DEC-067 (snapshot inmutable), DEC-068
 * (staff ve actor + snapshot) y contrato API RATIFICADO (endpoints 6/7).
 *
 * Endpoints fijados por este RED:
 *  - GET /clientes/:clienteId/rutinas/historial (DUENO/RECEPCIONISTA) -> 200
 *    `historialRutinasSchema` `{ clienteId, asignaciones[] (actor +
 *    contenidoSnapshot), total }` ordenado por `fechaInicio` DESC; el
 *    historial es INMUTABLE (sin rutas de escritura: PUT/DELETE -> 404/405).
 *  - GET /clientes/:clienteId/rutinas/activa (DUENO/RECEPCIONISTA) -> 200
 *    `{ clienteId, asignacion: rutinaAsignacionSchema|null, estado }` con
 *    `estado` ∈ { ACTIVA, SIN_RUTINA, OCULTA_POR_VIGENCIA } (DEC-066/DEC-070:
 *    la ocultación NO borra la asignación).
 *
 * FASE RED (2026-11-05): los endpoints NO existen (GREEN T7).
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
  crearRutinaPersonalizadaViaApi,
  fixtureVigenciaPersonalizada,
  congelarVigencia,
  asignarRutinaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  hoyBogota,
  sumarDias,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  PIN_CLIENTE_FIXTURE,
  ESTADO_SIN_RUTINA,
  ESTADO_OCULTA,
  ESTADO_ACTIVA,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  historialRutinasSchema,
  maxUnaActivaPorCliente,
} from "../../features/acceptance-criteria/HU-21-schemas";
import {
  rutinaAsignacionSchema,
} from "../../features/acceptance-criteria/HU-20-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10h"): cedulas de 10 digitos para `loginClientSchema` (`^\d{6,10}$`).
// Intencion intacta: unicidad por archivo + limpieza por `startsWith`.
const PREFIJO = "9954";

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

async function getHistorial(token: string, clienteId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/rutinas/historial`,
    headers: headers(token),
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

async function getActiva(token: string, clienteId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/rutinas/activa`,
    headers: headers(token),
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

// ─── RU-29 / RU-31 — fechas por asignación y cierre al reemplazar ────────────

describe("RU-29/31 fechas de inicio/fin y cierre al reemplazar", () => {
  it("tras 2 asignaciones sucesivas: nueva con fechaFin null y previa con fechaFin = inicio de la nueva", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaX = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina historial X RU29" })
    );
    const rutinaY = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina historial Y RU29" })
    );

    const inicioX = sumarDias(hoyBogota(), -5);
    const primera = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaX.body.id,
      fechaInicio: inicioX,
    });
    expect(primera.statusCode).toBe(201);

    const inicioY = sumarDias(hoyBogota(), -1);
    const segunda = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaY.body.id,
      fechaInicio: inicioY,
    });
    expect(segunda.statusCode).toBe(201);

    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.statusCode).toBe(200);
    expect(historialRutinasSchema.safeParse(historial.body).success).toBe(true);
    expect(historial.body.asignaciones).toHaveLength(2);

    const [nueva, previa] = historial.body.asignaciones;
    expect(nueva.fechaInicio).toBe(inicioY);
    expect(nueva.fechaFin).toBeNull();
    expect(nueva.estado).toBe("ACTIVA");
    expect(previa.fechaInicio).toBe(inicioX);
    expect(previa.fechaFin).toBe(inicioY);
    expect(previa.estado).toBe("CERRADA");

    // Ningún registro queda sin fechaInicio; ninguna cerrada con fechaFin null.
    for (const registro of historial.body.asignaciones) {
      expect(typeof registro.fechaInicio, "siempre con fechaInicio").toBe("string");
      if (registro.estado === "CERRADA") {
        expect(registro.fechaFin, "cerrada nunca con fechaFin null").not.toBeNull();
      }
    }
  });

  it("cliente sin asignaciones -> 200 lista vacía con total 0", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.statusCode).toBe(200);
    expect(historialRutinasSchema.safeParse(historial.body).success).toBe(true);
    expect(historial.body.clienteId).toBe(cliente.id);
    expect(historial.body.asignaciones).toEqual([]);
    expect(historial.body.total).toBe(0);
  });
});

// ─── RU-30 — actor del cambio (trazabilidad real) ────────────────────────────

describe("RU-30 actor del cambio", () => {
  it("el actor del registro = usuario autenticado real del token (nunca un valor libre)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina historial actor RU30" })
    );
    const creada = await asignarRutinaViaApi(app, dueno2.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(creada.statusCode).toBe(201);
    expect(creada.body.actor.id).toBe(dueno2.userId);

    const historial = await getHistorial(recep.token, cliente.id);
    expect(historial.body.asignaciones[0].actor.id).toBe(dueno2.userId);
    expect(historial.body.asignaciones[0].actor).toHaveProperty("nombre");
  });

  it("body con actor -> 400 (strict: el actor es del sistema)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina historial actor estricto RU30" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
      actor: { id: "u-falso", nombre: "Actor falso" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

// ─── RU-32 — historial completo en la ficha (orden e inmutabilidad) ──────────

describe("RU-32 historial en la ficha del cliente", () => {
  it("ordena por fechaInicio DESC y entrega actor + contenidoSnapshot por registro", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinas = [] as string[];
    for (const [i, fecha] of [-10, -6, -2].entries()) {
      const rutina = await crearRutinaBaseViaApi(
        app,
        dueno.token,
        payloadRutinaBase({ nombre: `Rutina historial orden ${i} RU32` })
      );
      rutinas.push(rutina.body.id);
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutina.body.id,
        fechaInicio: sumarDias(hoyBogota(), fecha),
      });
      expect(res.statusCode).toBe(201);
    }

    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.statusCode).toBe(200);
    expect(historialRutinasSchema.safeParse(historial.body).success).toBe(true);
    expect(historial.body.total).toBe(3);

    const fechas = historial.body.asignaciones.map((a: any) => a.fechaInicio);
    const ordenadas = [...fechas].sort().reverse();
    expect(fechas, "fechaInicio DESC (la activa arriba)").toEqual(ordenadas);
    expect(historial.body.asignaciones[0].rutina.id).toBe(rutinas[2]);

    for (const registro of historial.body.asignaciones) {
      expect(rutinaAsignacionSchema.safeParse(registro).success).toBe(true);
      expect(registro.actor).toHaveProperty("id");
      expect(registro.contenidoSnapshot).not.toBeNull();
      expect(registro.contenidoSnapshot.nombre).toBe(
        registro.rutina.nombre
      );
    }
  });

  it("el historial es inmutable: PUT/DELETE sobre la ruta -> 404/405 (sin ruta de escritura)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    for (const [metodo, url] of [
      ["PUT", `/clientes/${cliente.id}/rutinas/historial`],
      ["DELETE", `/clientes/${cliente.id}/rutinas/historial`],
      ["PATCH", `/clientes/${cliente.id}/rutinas/historial`],
    ] as const) {
      const res = await app.inject({ method: metodo, url, headers: headers(dueno.token) });
      expect([404, 405], `${metodo} ${url}`).toContain(res.statusCode);
    }
  });
});

// ─── RU-33 — el snapshot no muta con la edición posterior ────────────────────

describe("RU-33 contenido del historial (snapshot inmutable)", () => {
  it("editar la rutina después de asignarla no altera lo que muestra el historial", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({
        nombre: "Rutina snapshot RU33",
        descripcion: "Contenido original",
      })
    );
    const asignacion = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(asignacion.statusCode).toBe(201);
    const snapshot = JSON.stringify(asignacion.body.contenidoSnapshot);

    const patch = await app.inject({
      method: "PATCH",
      url: `/rutinas/${rutina.body.id}`,
      headers: headers(dueno.token),
      payload: { descripcion: "Contenido editado" },
    });
    expect(patch.statusCode).toBe(200);

    const historial = await getHistorial(dueno.token, cliente.id);
    const registro = historial.body.asignaciones[0];
    expect(JSON.stringify(registro.contenidoSnapshot)).toBe(snapshot);
    expect(registro.contenidoSnapshot.descripcion).toBe("Contenido original");
  });
});

// ─── RU-34 — acceso al historial (staff only) ────────────────────────────────

describe("RU-34 acceso al historial", () => {
  it("DUENO/RECEPCIONISTA consultan 200; CLIENTE obtiene 403/404 sin datos", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina historial acceso RU34" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });

    const conDueno = await getHistorial(dueno.token, cliente.id);
    expect(conDueno.statusCode).toBe(200);
    const conRecep = await getHistorial(recep.token, cliente.id);
    expect(conRecep.statusCode).toBe(200);

    const clienteB = await crearClienteUnico(PREFIJO);
    const tokenB = await loginCliente(app, clienteB.cedula, PIN_CLIENTE_FIXTURE);

    // Cliente consultando SU historial: jamás datos de staff ni de otros.
    const propio = await getHistorial(tokenB, clienteB.id);
    expect([403, 404], "CLIENTE no consume el DTO staff").toContain(propio.statusCode);
    expect(propio.raw, "sin actor en la respuesta").not.toContain("actor");

    // Cliente consultando el historial de OTRO: 403/404 sin datos de A.
    const ajeno = await getHistorial(tokenB, cliente.id);
    expect([403, 404]).toContain(ajeno.statusCode);
    expect(ajeno.raw, "sin datos del cliente A").not.toContain("Rutina historial acceso RU34");
    expect(ajeno.raw).not.toContain(cliente.id);
  });

  it("sin token -> 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/rutinas/historial`,
    });
    expect(res.statusCode).toBe(401);
  });
});

// ─── RU-35 — invariante: nunca dos activas ───────────────────────────────────

describe("RU-35 invariante 0-1 activas", () => {
  it("tras cualquier secuencia de asignaciones: exactamente 0 o 1 con fechaFin null (maxUnaActivaPorCliente)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    for (let i = 0; i < 3; i++) {
      const rutina = await crearRutinaBaseViaApi(
        app,
        dueno.token,
        payloadRutinaBase({ nombre: `Rutina invariante ${i} RU35` })
      );
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutina.body.id,
        fechaInicio: sumarDias(hoyBogota(), -(10 - i * 3)),
      });
      expect(res.statusCode, `asignación ${i}`).toBe(201);

      const historial = await getHistorial(dueno.token, cliente.id);
      expect(maxUnaActivaPorCliente(historial.body.asignaciones)).toBe(true);
      const activas = historial.body.asignaciones.filter((a: any) => a.fechaFin === null);
      expect(activas, `tras la asignación ${i}`).toHaveLength(1);
    }
  });
});

// ─── Endpoint 7 — estado de la rutina activa en la ficha (DEC-066/DEC-070) ──

describe("GET /clientes/:clienteId/rutinas/activa (marcadores DEC-070)", () => {
  it("con asignación visible -> estado ACTIVA y el DTO completo (actor + snapshot)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina activa ACTIVA RU36" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });

    const activa = await getActiva(dueno.token, cliente.id);
    expect(activa.statusCode).toBe(200);
    expect(activa.body.clienteId).toBe(cliente.id);
    expect(activa.body.estado).toBe(ESTADO_ACTIVA);
    expect(rutinaAsignacionSchema.safeParse(activa.body.asignacion).success).toBe(true);
    expect(activa.body.asignacion.rutina.id).toBe(rutina.body.id);
  });

  it("sin asignaciones -> estado SIN_RUTINA y asignacion null", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const activa = await getActiva(dueno.token, cliente.id);
    expect(activa.statusCode).toBe(200);
    expect(activa.body.estado).toBe(ESTADO_SIN_RUTINA);
    expect(activa.body.asignacion).toBeNull();
  });

  it("personalizada con vigencia caída -> OCULTA_POR_VIGENCIA SIN borrar la asignación", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const vigencia = await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina activa OCULTA RU36" })
    );
    const asignacion = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(asignacion.statusCode).toBe(201);

    await congelarVigencia(app, dueno.token, cliente.id, vigencia!.id);

    const activa = await getActiva(dueno.token, cliente.id);
    expect(activa.statusCode).toBe(200);
    expect(activa.body.estado).toBe(ESTADO_OCULTA);
    expect(activa.body.asignacion, "ocultación sin borrar (DEC-066)").not.toBeNull();

    // El historial también conserva el registro.
    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.body.total).toBe(1);
  });

  it("genérica sin vigencia personalizada -> estado ACTIVA (RU-24)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina activa GENERICA RU36" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutina.body.id });
    const activa = await getActiva(dueno.token, cliente.id);
    expect(activa.body.estado).toBe(ESTADO_ACTIVA);
  });

  it("lectura staff: DUENO/RECEPCIONISTA 200; CLIENTE 403/404; sin token 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const conRecep = await getActiva(recep.token, cliente.id);
    expect(conRecep.statusCode).toBe(200);

    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const conCliente = await getActiva(tokenCliente, cliente.id);
    expect([403, 404]).toContain(conCliente.statusCode);

    const sinToken = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}/rutinas/activa`,
    });
    expect(sinToken.statusCode).toBe(401);
  });
});
