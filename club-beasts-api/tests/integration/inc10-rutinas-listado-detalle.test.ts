/**
 * INC-10 (RED) — Listado con filtros y detalle de rutinas.
 * Criterios: RU-03 (estructura en listado/detalle), RU-07 (lectura staff),
 * RU-08 (404 RUTINA_NO_ENCONTRADA) y contrato API RATIFICADO (endpoints 2/3).
 *
 * Endpoints fijados por este RED:
 *  - GET /rutinas?tipo=&nombre= (DUENO/RECEPCIONISTA) -> 200
 *    `{ rutinas: rutinaResumenSchema[], total }` con filtros en searchParams:
 *    `tipo` = coincidencia EXACTA sobre TIPO_RUTINA (valor fuera del enum ->
 *    400 VALIDATION_ERROR con el mensaje canónico); `nombre` = subcadena
 *    insensible a mayúsculas. Ambos se combinan (AND).
 *  - GET /rutinas/:rutinaId (DUENO/RECEPCIONISTA) -> 200 detalle por TIPO
 *    PERSISTIDO (base -> `rutinaBaseDatosSchema`; personalizada ->
 *    `rutinaPersonalizadaDatosSchema`) + `actualizadoPor`;
 *    404 `RUTINA_NO_ENCONTRADA`.
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
  crearRutinaBaseViaApi,
  crearRutinaPersonalizadaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  primerErrorCanonico,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  PIN_CLIENTE_FIXTURE,
  MENSAJE_RUTINA_NO_ENCONTRADA,
  CODE_RUTINA_NO_ENCONTRADA,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  rutinaBaseDatosSchema,
} from "../../features/acceptance-criteria/HU-18-schemas";
import {
  rutinaPersonalizadaDatosSchema,
  rutinaResumenSchema,
} from "../../features/acceptance-criteria/HU-19-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10l"): cedulas de 10 digitos para `loginClientSchema` (`^\d{6,10}$`).
// Intencion intacta: unicidad por archivo + limpieza por `startsWith`.
const PREFIJO = "9955";

let app: any;
let dueno: SesionStaff;
let recep: SesionStaff;

/**
 * Fixtures de rutinas MEMOIZADOS y creados de forma perezosa dentro de cada
 * test (NO en beforeAll): en el RED la ausencia del endpoint debe fallar cada
 * test por comportamiento ausente, nunca dejar la suite en "skipped"
 * (INC00-QA-01/02).
 */
let fixtures: { idGenerica: string; idInduccion: string; idPersonalizada: string } | null =
  null;

async function asegurarFixtures() {
  if (fixtures) return fixtures;
  // Nombres únicos por corrida (DEC-012/013): prefijo "INC10L-".
  const idGenerica = (
    await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "INC10L Rutina generica listado" })
    )
  ).body.id;
  const idInduccion = (
    await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({
        tipoRutina: "INDUCCION",
        nombre: "INC10L Rutina induccion listado",
      })
    )
  ).body.id;
  const idPersonalizada = (
    await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "INC10L Rutina personalizada listado" })
    )
  ).body.id;
  fixtures = { idGenerica, idInduccion, idPersonalizada };
  return fixtures;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc10-rutinas-secret";
  await limpiarFixtures(PREFIJO);
  ({ app } = await crearAppRutinas());
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

async function listar(token: string, query = "") {
  const res = await app.inject({
    method: "GET",
    url: `/rutinas${query}`,
    headers: headers(token),
  });
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body };
}

// ─── Endpoint 2 — listado y filtros ──────────────────────────────────────────

describe("GET /rutinas (listado)", () => {
  it("devuelve { rutinas, total } con resúmenes válidos para DUENO", async () => {
    await asegurarFixtures();
    const listado = await listar(dueno.token, "?nombre=INC10L");
    expect(listado.statusCode).toBe(200);
    expect(Array.isArray(listado.body.rutinas)).toBe(true);
    expect(listado.body.total).toBe(listado.body.rutinas.length);
    expect(listado.body.total).toBe(3);
    for (const resumen of listado.body.rutinas) {
      expect(rutinaResumenSchema.safeParse(resumen).success).toBe(true);
    }
  });

  it("filtro tipo= exacto por TIPO_RUTINA (GENERICA | INDUCCION | PERSONALIZADA)", async () => {
    const ids = await asegurarFixtures();
    const porTipo: Record<string, string> = {
      GENERICA: ids.idGenerica,
      INDUCCION: ids.idInduccion,
      PERSONALIZADA: ids.idPersonalizada,
    };
    for (const [tipo, esperado] of Object.entries(porTipo)) {
      const listado = await listar(dueno.token, `?nombre=INC10L&tipo=${tipo}`);
      expect(listado.statusCode, tipo).toBe(200);
      expect(listado.body.total, `solo ${tipo}`).toBe(1);
      expect(listado.body.rutinas[0].id).toBe(esperado);
      expect(listado.body.rutinas[0].tipoRutina).toBe(tipo);
    }
  });

  it("filtro nombre= subcadena insensible a mayúsculas", async () => {
    const ids = await asegurarFixtures();
    const listado = await listar(dueno.token, "?nombre=inc10l rutina generica");
    expect(listado.statusCode).toBe(200);
    expect(listado.body.total).toBe(1);
    expect(listado.body.rutinas[0].id).toBe(ids.idGenerica);
  });

  it("sin coincidencias -> { rutinas: [], total: 0 }", async () => {
    await asegurarFixtures();
    const listado = await listar(dueno.token, "?nombre=INC10L-inexistente-zzz");
    expect(listado.statusCode).toBe(200);
    expect(listado.body.rutinas).toEqual([]);
    expect(listado.body.total).toBe(0);
  });

  it("tipo fuera del enum -> 400 con el mensaje canónico de TIPO_RUTINA", async () => {
    const mensaje = primerErrorCanonico(rutinaResumenSchema.shape.tipoRutina, "BASE");
    expect(mensaje).toBe("Tipo de rutina debe ser GENERICA, INDUCCION o PERSONALIZADA");
    const listado = await listar(dueno.token, "?tipo=BASE");
    expect(listado.statusCode).toBe(400);
    expect(listado.body.code).toBe("VALIDATION_ERROR");
    expect(listado.body.error).toBe(mensaje);
  });

  it("roles de lectura: DUENO 200; RECEPCIONISTA 200; CLIENTE 403; sin token 401", async () => {
    await asegurarFixtures();
    const conRecep = await listar(recep.token, "?nombre=INC10L");
    expect(conRecep.statusCode).toBe(200);
    expect(conRecep.body.total).toBe(3);

    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const conCliente = await listar(tokenCliente);
    expect(conCliente.statusCode, "CLIENTE no accede a la gestión").toBe(403);

    const sinToken = await listar("");
    expect(sinToken.statusCode).toBe(401);
  });
});

// ─── Endpoint 3 — detalle por tipo persistido ────────────────────────────────

describe("GET /rutinas/:rutinaId (detalle por tipo)", () => {
  it("detalle de base -> rutinaBaseDatosSchema con sesiones y actualizadoPor", async () => {
    const ids = await asegurarFixtures();
    const res = await app.inject({
      method: "GET",
      url: `/rutinas/${ids.idGenerica}`,
      headers: headers(dueno.token),
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(rutinaBaseDatosSchema.safeParse(body).success).toBe(true);
    expect(body.tipoRutina).toBe("GENERICA");
    expect(body.sesiones).toHaveLength(1);
    expect(body.actualizadoPor).toHaveProperty("id");
    expect(body.actualizadoPor).toHaveProperty("nombre");
  });

  it("detalle de personalizada -> rutinaPersonalizadaDatosSchema con el árbol completo", async () => {
    const ids = await asegurarFixtures();
    const res = await app.inject({
      method: "GET",
      url: `/rutinas/${ids.idPersonalizada}`,
      headers: headers(dueno.token),
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(rutinaPersonalizadaDatosSchema.safeParse(body).success).toBe(true);
    expect(body.macrociclos[0].mesociclos[0].microciclos).toHaveLength(1);
    expect(body.tests).toHaveLength(1);
    expect(body.antropometria).toHaveLength(2);
    expect(body.analisisBiomecanico).toHaveLength(1);
  });

  it("rutina inexistente -> 404 RUTINA_NO_ENCONTRADA", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/rutinas/id-fantasma-inc10-listado",
      headers: headers(dueno.token),
    });
    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe(CODE_RUTINA_NO_ENCONTRADA);
    expect(body.error).toBe(MENSAJE_RUTINA_NO_ENCONTRADA);
  });

  it("lectura staff: DUENO 200; RECEPCIONISTA 200; CLIENTE 403; sin token 401", async () => {
    const ids = await asegurarFixtures();
    const conRecep = await app.inject({
      method: "GET",
      url: `/rutinas/${ids.idInduccion}`,
      headers: headers(recep.token),
    });
    expect(conRecep.statusCode).toBe(200);

    const cliente = await crearClienteUnico(PREFIJO);
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);
    const conCliente = await app.inject({
      method: "GET",
      url: `/rutinas/${ids.idInduccion}`,
      headers: headers(tokenCliente),
    });
    expect(conCliente.statusCode).toBe(403);

    const sinToken = await app.inject({
      method: "GET",
      url: `/rutinas/${ids.idInduccion}`,
    });
    expect(sinToken.statusCode).toBe(401);
  });
});
