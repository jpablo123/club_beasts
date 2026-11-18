/**
 * INC-10 (RED) — Asignación de rutina activa (una por cliente).
 * Criterios: RU-20..RU-28 (HU-20) + DEC-065 (solo DUENO), DEC-066 (vigencia
 * validada al cambio), DEC-067 (snapshot al asignar), DEC-069 (cliente
 * inactivo -> 409 CLIENTE_INACTIVO), DEC-070 (literales) e invariante 0-1
 * activas (RU-21/RU-35) del contrato API RATIFICADO (endpoint 5).
 *
 * Endpoint fijado por este RED (path DEC-070):
 *   POST /clientes/:clienteId/rutinas/asignacion (solo DUENO) -> 201
 *   `rutinaAsignacionSchema` (actor + contenidoSnapshot); cierra la activa
 *   anterior en la MISMA transacción (fechaFin = fechaInicio de la nueva,
 *   RU-21/RU-31 canónico) y captura el snapshot en esa transacción (DEC-067).
 *
 * ORDEN DE ERRORES EXACTO (ratificado):
 *   401 -> 403 -> 400 params -> 400 body -> 404 CLIENTE_NO_ENCONTRADO ->
 *   404 RUTINA_NO_ENCONTRADA -> 409 CLIENTE_INACTIVO (DEC-069) ->
 *   409 SIN_VIGENCIA_PERSONALIZADA (DEC-070) -> 409 RUTINA_YA_ACTIVA ->
 *   409 ASIGNACION_CONFLICTO (concurrencia) -> 201.
 *
 * Concurrencia (R7: transacción + arbitro `activaClave @unique`, INC00-MEM-03):
 *   C1 carrera `Promise.all`: exactamente una 201 y la otra 409
 *      ASIGNACION_CONFLICTO; exactamente 1 ACTIVA al final.
 *   C2 interleaving determinista (patrón INC00-MEM-03): un cambio competidor
 *      se compromete en la ventana entre la verificación y la escritura; el
 *      escritor cuya verificación quedó obsoleta recibe 409
 *      ASIGNACION_CONFLICTO y NO pisa al ganador.
 *
 * FASE RED (2026-11-05): los endpoints NO existen (GREEN T7).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 *
 * ENMIENDA C4 (INC-10, 2026-11-05) — D1 (prefijo numerico) y D2 (nombre de la
 * fixture RU-23 sin "_", canonico `nombreRutinaBase`); intencion y
 * expectativas intactas.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/lib/prisma";
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
  hoyBogota,
  sumarDias,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  PIN_CLIENTE_FIXTURE,
  CODE_CLIENTE_NO_ENCONTRADO,
  CODE_RUTINA_NO_ENCONTRADA,
  CODE_SIN_VIGENCIA,
  CODE_RUTINA_YA_ACTIVA,
  CODE_CLIENTE_INACTIVO,
  CODE_ASIGNACION_CONFLICTO,
  MENSAJE_CLIENTE_NO_ENCONTRADO,
  MENSAJE_RUTINA_NO_ENCONTRADA,
  MENSAJE_SIN_VIGENCIA,
  MENSAJE_RUTINA_YA_ACTIVA,
  MENSAJE_CLIENTE_INACTIVO,
  type SesionStaff,
} from "./inc10-rutinas-helpers";
import {
  asignarRutinaSchema,
  rutinaAsignacionSchema,
} from "../../features/acceptance-criteria/HU-20-schemas";
import { historialRutinasSchema } from "../../features/acceptance-criteria/HU-21-schemas";
import { crearRutinaBaseSchema } from "../../features/acceptance-criteria/HU-18-schemas";

// ENMIENDA C4 (INC-10, 2026-11-05) — D1: prefijo de fixtures NUMERICO (antes
// "inc10a"): cedulas de 10 digitos para `loginClientSchema` (`^\d{6,10}$`).
// Intencion intacta: unicidad por archivo + limpieza por `startsWith`.
const PREFIJO = "9953";

let app: any;
let dueno: SesionStaff;
let recep: SesionStaff;

/**
 * Interleaving programado (patrón INC00-MEM-03): se ejecuta exactamente una
 * vez, al inicio de la siguiente transacción de negocio, y se limpia. Fija el
 * orden "verificación -> cambio competidor -> escritura" sin sleeps ni carreras.
 */
let interleavingPendiente: (() => Promise<void>) | null = null;
let interleavingsInyectados = 0;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc10-rutinas-secret";
  await limpiarFixtures(PREFIJO);
  ({ app } = await crearAppRutinas());
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);

  // Punto de inyección único y determinista (INC00-MEM-03): se instala una vez
  // y NO se restaura (restaurar el spy deja prisma.$transaction inutilizable).
  const transaccionOriginal = (prisma as any).$transaction.bind(prisma);
  vi.spyOn(prisma as any, "$transaction").mockImplementation(
    async (fn: any, opts?: any) => {
      if (interleavingPendiente) {
        const ejecutar = interleavingPendiente;
        interleavingPendiente = null;
        interleavingsInyectados += 1;
        await ejecutar();
      }
      return transaccionOriginal(fn, opts);
    }
  );
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

// ─── RU-20 — asignación exitosa ──────────────────────────────────────────────

describe("RU-20 asignación exitosa (201 ACTIVA con actor + snapshot)", () => {
  it("GENERICA: 201 con fechaInicio hoy, fechaFin null, estado ACTIVA y actor del token", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina asigna RU20 generica" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
    expect(rutinaAsignacionSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.estado).toBe("ACTIVA");
    expect(res.body.fechaFin).toBeNull();
    expect(res.body.fechaInicio).toBe(hoyBogota());
    expect(res.body.actor.id).toBe(dueno.userId);
    expect(res.body.rutina.id).toBe(rutina.body.id);

    // DEC-067: snapshot del contenido en la misma transacción.
    expect(res.body.contenidoSnapshot).not.toBeNull();
    expect(crearRutinaBaseSchema.safeParse(res.body.contenidoSnapshot).success).toBe(true);
    expect(res.body.contenidoSnapshot.nombre).toBe("Rutina asigna RU20 generica");
    expect(res.body.contenidoSnapshot.tipoRutina).toBe("GENERICA");
  });

  it("INDUCCION: 201 ACTIVA", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina asigna RU20 induccion" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe("ACTIVA");
    expect(res.body.rutina.tipoRutina).toBe("INDUCCION");
  });

  it("PERSONALIZADA con vigencia ACTIVA: 201 ACTIVA (RU-23)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina asigna RU20 pers" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe("ACTIVA");
    expect(res.body.contenidoSnapshot.tipoRutina).toBe("PERSONALIZADA");
  });

  it("fechaInicio explícita pasada se respeta; futura -> 400 con el mensaje canónico", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina asigna RU20 fechas" })
    );
    const pasada = sumarDias(hoyBogota(), -3);
    const ok = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
      fechaInicio: pasada,
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.body.fechaInicio).toBe(pasada);

    const cliente2 = await crearClienteUnico(PREFIJO);
    const payload = { rutinaId: rutina.body.id, fechaInicio: "2099-01-01" };
    expect(asignarRutinaSchema.safeParse(payload).success, "premisa canónica").toBe(false);
    const futura = await asignarRutinaViaApi(app, dueno.token, cliente2.id, payload);
    expect(futura.statusCode).toBe(400);
    expect(futura.body.code).toBe("VALIDATION_ERROR");
    expect(futura.body.error).toBe("Fecha de inicio no puede ser futura");
  });
});

// ─── RU-21 / RU-31 — una sola activa + reemplazo ─────────────────────────────

describe("RU-21 reemplazo: una sola rutina activa por cliente", () => {
  it("asignar X y luego Y: X queda CERRADA con fechaFin = fechaInicio de Y y solo Y es ACTIVA", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaX = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina reemplazo X RU21" })
    );
    const rutinaY = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina reemplazo Y RU21" })
    );

    const primera = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaX.body.id,
    });
    expect(primera.statusCode).toBe(201);

    const segunda = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaY.body.id,
    });
    expect(segunda.statusCode).toBe(201);
    expect(segunda.body.estado).toBe("ACTIVA");

    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.statusCode).toBe(200);
    expect(historialRutinasSchema.safeParse(historial.body).success).toBe(true);
    expect(historial.body.asignaciones).toHaveLength(2);

    const porRutina = Object.fromEntries(
      historial.body.asignaciones.map((a: any) => [a.rutina.id, a])
    );
    const cerrada = porRutina[rutinaX.body.id];
    const activa = porRutina[rutinaY.body.id];
    expect(cerrada.estado).toBe("CERRADA");
    expect(cerrada.fechaFin, "RU-31: fechaFin = fechaInicio de la nueva").toBe(
      segunda.body.fechaInicio
    );
    expect(activa.estado).toBe("ACTIVA");
    expect(activa.fechaFin).toBeNull();

    const conActivas = historial.body.asignaciones.filter(
      (a: any) => a.fechaFin === null
    );
    expect(conActivas, "exactamente 1 ACTIVA (RU-35)").toHaveLength(1);
  });

  it("fechaInicio backfilleada: la anterior se cierra con la fechaInicio de la nueva (RU-21/RU-31 canónico)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaX = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina backfill X RU21" })
    );
    const rutinaY = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina backfill Y RU21" })
    );
    await asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutinaX.body.id });

    const inicioBackfill = sumarDias(hoyBogota(), -2);
    const segunda = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaY.body.id,
      fechaInicio: inicioBackfill,
    });
    expect(segunda.statusCode).toBe(201);

    const historial = await getHistorial(dueno.token, cliente.id);
    const porRutina = Object.fromEntries(
      historial.body.asignaciones.map((a: any) => [a.rutina.id, a])
    );
    expect(porRutina[rutinaX.body.id].fechaFin).toBe(inicioBackfill);
    expect(porRutina[rutinaY.body.id].fechaInicio).toBe(inicioBackfill);
    expect(
      historial.body.asignaciones.filter((a: any) => a.fechaFin === null)
    ).toHaveLength(1);
  });
});

// ─── RU-22 — tipos asignables y recursos inexistentes ────────────────────────

describe("RU-22 tipos asignables y recursos inexistentes", () => {
  it("cliente inexistente -> 404 CLIENTE_NO_ENCONTRADO (nada se persiste)", async () => {
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina RU22 cliente fantasma" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, "id-fantasma-inc10-cliente", {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_CLIENTE_NO_ENCONTRADO);
    expect(res.body.error).toBe(MENSAJE_CLIENTE_NO_ENCONTRADO);
  });

  it("rutina inexistente -> 404 RUTINA_NO_ENCONTRADA (nada se persiste)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: "id-fantasma-inc10-rutina",
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_RUTINA_NO_ENCONTRADA);
    expect(res.body.error).toBe(MENSAJE_RUTINA_NO_ENCONTRADA);

    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.body.asignaciones).toEqual([]);
  });
});

// ─── RU-23 / RU-24 — regla de vigencia (DEC-066) ─────────────────────────────

describe("RU-23 personalizada solo con vigencia ACTIVA", () => {
  const ESTADOS_BLOQUEADOS = [
    "NO_CONTRATADO",
    "PROGRAMADA",
    "CONGELADO",
    "VENCIDA",
  ] as const;

  for (const estado of ESTADOS_BLOQUEADOS) {
    it(`PERSONALIZADA con vigencia ${estado} -> 409 SIN_VIGENCIA_PERSONALIZADA`, async () => {
      const cliente = await crearClienteUnico(PREFIJO);
      await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, estado);
      // ENMIENDA C4 (INC-10, 2026-11-05) — D2: el canonico `nombreRutinaBase`
      // no permite "_" (regex cerrado); el literal del estado se normaliza a
      // espacio en el nombre de la fixture. Intencion intacta: nombre unico
      // por estado del caso.
      const rutina = await crearRutinaPersonalizadaViaApi(
        app,
        dueno.token,
        payloadRutinaPersonalizada({ nombre: `Rutina RU23 ${estado.replace("_", " ")}` })
      );
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutina.body.id,
      });
      expect(res.statusCode, `vigencia ${estado}`).toBe(409);
      expect(res.body.code).toBe(CODE_SIN_VIGENCIA);
      expect(res.body.error).toBe(MENSAJE_SIN_VIGENCIA);

      const historial = await getHistorial(dueno.token, cliente.id);
      expect(historial.body.asignaciones, "nada se persiste").toEqual([]);
    });
  }
});

describe("RU-24 genéricas/inducción sin requisito de vigencia", () => {
  it("cliente con vigencia VENCIDA + rutina GENERICA -> 201 ACTIVA", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "VENCIDA");
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina RU24 generica" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe("ACTIVA");
  });

  it("cliente NO_CONTRATADO + rutina INDUCCION -> 201 ACTIVA", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina RU24 induccion" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ─── RU-26 — cliente sin estado activo (DEC-069) ─────────────────────────────

describe("RU-26 asignación a cliente sin estado activo", () => {
  for (const estado of ["SUSPENDIDO", "RETIRADO", "INACTIVO"] as const) {
    it(`cliente ${estado} -> 409 CLIENTE_INACTIVO`, async () => {
      const cliente = await crearClienteUnico(PREFIJO, { estado });
      const rutina = await crearRutinaBaseViaApi(
        app,
        dueno.token,
        payloadRutinaBase({ nombre: `Rutina RU26 ${estado}` })
      );
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutina.body.id,
      });
      expect(res.statusCode, estado).toBe(409);
      expect(res.body.code).toBe(CODE_CLIENTE_INACTIVO);
      expect(res.body.error).toBe(MENSAJE_CLIENTE_INACTIVO);

      const historial = await getHistorial(dueno.token, cliente.id);
      expect(historial.body.asignaciones, "nada se persiste").toEqual([]);
    });
  }

  it("cliente NUEVO y ACTIVO sí reciben rutina (partición válida)", async () => {
    for (const estado of ["NUEVO", "ACTIVO"] as const) {
      const cliente = await crearClienteUnico(PREFIJO, { estado });
      const rutina = await crearRutinaBaseViaApi(
        app,
        dueno.token,
        payloadRutinaBase({ nombre: `Rutina RU26 ${estado} ok` })
      );
      const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutina.body.id,
      });
      expect(res.statusCode, estado).toBe(201);
    }
  });
});

// ─── RU-27 — permisos de asignación (DEC-065) ────────────────────────────────

describe("RU-27 permisos de asignación", () => {
  it("DUENO 201; RECEPCIONISTA 403; CLIENTE 403; sin token 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina RU27 permisos" })
    );
    const tokenCliente = await loginCliente(app, cliente.cedula, PIN_CLIENTE_FIXTURE);

    const conRecep = await asignarRutinaViaApi(app, recep.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(conRecep.statusCode, "RECEPCIONISTA no asigna").toBe(403);

    const conCliente = await asignarRutinaViaApi(app, tokenCliente, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(conCliente.statusCode, "CLIENTE no asigna").toBe(403);

    const sinToken = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/rutinas/asignacion`,
      payload: { rutinaId: rutina.body.id },
    });
    expect(sinToken.statusCode, "sin token -> 401").toBe(401);

    const conDueno = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(conDueno.statusCode, "DUENO sí asigna").toBe(201);
  });
});

// ─── RU-28 — reasignación de la misma rutina ya activa ───────────────────────

describe("RU-28 reasignación de la MISMA rutina ya activa", () => {
  it("segundo intento -> 409 RUTINA_YA_ACTIVA y solo 1 registro", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina RU28 ya activa" })
    );
    const primera = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(primera.statusCode).toBe(201);

    const segunda = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(segunda.statusCode).toBe(409);
    expect(segunda.body.code).toBe(CODE_RUTINA_YA_ACTIVA);
    expect(segunda.body.error).toBe(MENSAJE_RUTINA_YA_ACTIVA);

    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historial.body.total, "sin segundo registro").toBe(1);
    expect(historial.body.asignaciones[0].estado).toBe("ACTIVA");
  });

  it("EDGE fijado: personalizada ya activa + vigencia caída -> SIN_VIGENCIA_PERSONALIZADA (no RUTINA_YA_ACTIVA)", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const vigencia = await fixtureVigenciaPersonalizada(app, dueno.token, cliente.id, "ACTIVA");
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina RU28 edge vigencia" })
    );
    const primera = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(primera.statusCode).toBe(201);

    // La vigencia "cae" después de asignar (DEC-066: validada al cambio).
    await congelarVigencia(app, dueno.token, cliente.id, vigencia!.id);

    const segunda = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(segunda.statusCode).toBe(409);
    expect(segunda.body.code, "el chequeo de vigencia precede a RUTINA_YA_ACTIVA").toBe(
      CODE_SIN_VIGENCIA
    );
    expect(segunda.body.error).toBe(MENSAJE_SIN_VIGENCIA);
  });
});

// ─── Orden de errores EXACTO (ratificado) ────────────────────────────────────

describe("orden de errores EXACTO de la asignación", () => {
  it("401 antes que todo: sin token con todo lo demás válido -> 401", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina orden 401" })
    );
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/rutinas/asignacion`,
      payload: { rutinaId: rutina.body.id },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 antes que params/body/404: rol no DUENO con params inválidos -> 403", async () => {
    const resRecep = await asignarRutinaViaApi(app, recep.token, "w".repeat(40), {
      rutinaId: "id-fantasma",
      fechaInicio: "2099-01-01",
    });
    expect(resRecep.statusCode, "RECEPCIONISTA antes que 400/404").toBe(403);
  });

  it("400 params antes que body/404: DUENO con clienteId mal formado -> 400", async () => {
    const res = await asignarRutinaViaApi(app, dueno.token, "w".repeat(40), {
      rutinaId: "id-fantasma",
      fechaInicio: "2099-01-01",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("400 body antes que 404: body inválido con cliente inexistente -> 400", async () => {
    const payload = { rutinaId: "id-fantasma", fechaInicio: "2099-01-01" };
    expect(asignarRutinaSchema.safeParse(payload).success, "premisa canónica").toBe(false);
    const res = await asignarRutinaViaApi(
      app,
      dueno.token,
      "id-fantasma-inc10-orden",
      payload
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Fecha de inicio no puede ser futura");
  });

  it("404 CLIENTE_NO_ENCONTRADO antes que 404 rutina: cliente fantasma + rutina fantasma -> CLIENTE", async () => {
    const res = await asignarRutinaViaApi(app, dueno.token, "id-fantasma-inc10-orden2", {
      rutinaId: "id-fantasma-inc10-rutina2",
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_CLIENTE_NO_ENCONTRADO);
  });

  it("404 RUTINA_NO_ENCONTRADA antes que los 409: cliente INACTIVO + rutina fantasma -> RUTINA", async () => {
    const cliente = await crearClienteUnico(PREFIJO, { estado: "SUSPENDIDO" });
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: "id-fantasma-inc10-rutina3",
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe(CODE_RUTINA_NO_ENCONTRADA);
  });

  it("409 CLIENTE_INACTIVO antes que SIN_VIGENCIA: cliente SUSPENDIDO + personalizada sin vigencia -> CLIENTE_INACTIVO", async () => {
    const cliente = await crearClienteUnico(PREFIJO, { estado: "INACTIVO" });
    const rutina = await crearRutinaPersonalizadaViaApi(
      app,
      dueno.token,
      payloadRutinaPersonalizada({ nombre: "Rutina orden inactivo" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe(CODE_CLIENTE_INACTIVO);
  });

  it("201 al final de la escalera con todo válido", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutina = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina orden final" })
    );
    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutina.body.id,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ─── Invariante 0-1 activas bajo concurrencia (R7: transacción + arbitro) ────

describe("concurrencia: doble asignación simultánea -> ASIGNACION_CONFLICTO", () => {
  it("C1 Promise.all: exactamente una 201 y la otra 409 ASIGNACION_CONFLICTO; 1 ACTIVA al final", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaA = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina carrera A INC10" })
    );
    const rutinaB = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina carrera B INC10" })
    );

    const [resA, resB] = await Promise.all([
      asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutinaA.body.id }),
      asignarRutinaViaApi(app, dueno.token, cliente.id, { rutinaId: rutinaB.body.id }),
    ]);

    const codigos = [resA.statusCode, resB.statusCode].sort();
    expect(codigos, `estados observados: ${JSON.stringify(codigos)}`).toEqual([201, 409]);

    const perdedor = resA.statusCode === 409 ? resA : resB;
    expect(perdedor.body.code).toBe(CODE_ASIGNACION_CONFLICTO);

    // Invariante RU-21/RU-35: exactamente 1 ACTIVA tras la carrera.
    const historial = await getHistorial(dueno.token, cliente.id);
    expect(historialRutinasSchema.safeParse(historial.body).success).toBe(true);
    const activas = historial.body.asignaciones.filter((a: any) => a.fechaFin === null);
    expect(activas, "exactamente 1 ACTIVA").toHaveLength(1);

    const ganador = resA.statusCode === 201 ? resA : resB;
    expect(activas[0].rutina.id).toBe(ganador.body.rutina.id);
  });

  it("C2 interleaving determinista: el escritor con verificación obsoleta recibe 409 ASIGNACION_CONFLICTO y no pisa al ganador", async () => {
    const cliente = await crearClienteUnico(PREFIJO);
    const rutinaBajoPrueba = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Rutina interleaving B INC10" })
    );
    const rutinaCompetidora = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ tipoRutina: "INDUCCION", nombre: "Rutina interleaving A INC10" })
    );

    // El competidor se compromete en la ventana entre la verificación del
    // escritor bajo prueba y su escritura (patrón INC00-MEM-03, sin sleeps).
    interleavingPendiente = async () => {
      const competidor = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
        rutinaId: rutinaCompetidora.body.id,
      });
      expect(competidor.statusCode, "el competidor se compromete primero").toBe(201);
    };

    const res = await asignarRutinaViaApi(app, dueno.token, cliente.id, {
      rutinaId: rutinaBajoPrueba.body.id,
    });

    expect(interleavingsInyectados, "el interleaving se ejecutó exactamente una vez").toBeGreaterThan(0);
    expect(res.statusCode, "el escritor con verificación obsoleta").toBe(409);
    expect(res.body.code).toBe(CODE_ASIGNACION_CONFLICTO);

    // No pisa al ganador: la ACTIVA es la del competidor.
    const activa = await getActiva(dueno.token, cliente.id);
    expect(activa.statusCode).toBe(200);
    expect(activa.body.estado).toBe("ACTIVA");
    expect(activa.body.asignacion.rutina.id).toBe(rutinaCompetidora.body.id);

    const historial = await getHistorial(dueno.token, cliente.id);
    const activas = historial.body.asignaciones.filter((a: any) => a.fechaFin === null);
    expect(activas, "exactamente 1 ACTIVA").toHaveLength(1);
    expect(historial.body.total, "sin registro del perdedor").toBe(1);
  });
});
