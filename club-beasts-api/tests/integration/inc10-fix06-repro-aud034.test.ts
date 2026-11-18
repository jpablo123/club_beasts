/**
 * INC10-FIX-06 (diagnostico TEMPORAL) — repro a nivel API del escenario
 * AUD-03-4 de la bateria E2E: cliente con DOS asignaciones, la previa con
 * `fechaInicio` en el pasado (2026-10-01) y la nueva activa.
 *
 * Veredicto INC10-FIX-06 (2026-11-15): la fixture resuelve 200 en 2-4 ms
 * bajo el codigo post INC10-FIX-05/REV-05 -> el fallo E2E AUD-03-4 NO es
 * regresion de REV-05 (ver %TEMP%\opencode\inc10-fix06-repro-api.log).
 * Queda como guarda de regresion de los endpoints de ficha con la misma
 * fixture que el escenario E2E (2 asignaciones, previa con fechaInicio
 * pasado) y de latencia (< 5 s, ventana de la expectativa Playwright).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  crearAppRutinas,
  loginDueno,
  loginRecepcionista,
  crearClienteUnico,
  crearRutinaBaseViaApi,
  asignarRutinaViaApi,
  limpiarFixtures,
  parseBody,
  headers,
  hoyBogota,
  payloadRutinaBase,
  type SesionStaff,
} from "./inc10-rutinas-helpers";

const PREFIJO = "9966";

let app: any;
let dueno: SesionStaff;
let recep: SesionStaff;

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

async function medirGet(url: string, token: string) {
  const inicio = performance.now();
  const res = await app.inject({ method: "GET", url, headers: headers(token) });
  const ms = Math.round(performance.now() - inicio);
  return { statusCode: res.statusCode, body: parseBody(res), raw: res.body, ms };
}

describe("INC10-FIX-06 repro AUD-03-4 (2 asignaciones, previa con fechaInicio pasado)", () => {
  let clienteId: string;

  beforeAll(async () => {
    const cliente = await crearClienteUnico(PREFIJO, { estado: "ACTIVO" });
    clienteId = cliente.id;

    const antigua = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Cobertura AUD03 historial antigua" })
    );
    const nueva = await crearRutinaBaseViaApi(
      app,
      dueno.token,
      payloadRutinaBase({ nombre: "Cobertura AUD03 historial nueva" })
    );

    const asig1 = await asignarRutinaViaApi(app, dueno.token, clienteId, {
      rutinaId: antigua.body.id,
      fechaInicio: "2026-10-01",
    });
    expect(asig1.statusCode, `asignacion previa: ${asig1.raw.slice(0, 200)}`).toBe(201);

    const asig2 = await asignarRutinaViaApi(app, dueno.token, clienteId, {
      rutinaId: nueva.body.id,
    });
    expect(asig2.statusCode, `asignacion nueva: ${asig2.raw.slice(0, 200)}`).toBe(201);
  });

  it("GET .../rutinas/activa resuelve 200 ACTIVA rapido (3 corridas)", async () => {
    const duraciones: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await medirGet(`/clientes/${clienteId}/rutinas/activa`, recep.token);
      duraciones.push(r.ms);
      expect(r.statusCode, r.raw.slice(0, 300)).toBe(200);
      expect(r.body.estado).toBe("ACTIVA");
      expect(r.body.asignacion?.rutina?.nombre).toBe("Cobertura AUD03 historial nueva");
      expect(r.body.asignacion?.estado).toBe("ACTIVA");
    }
    // Ventana de la expectativa E2E (Playwright toHaveCount = 5000ms).
    expect(Math.max(...duraciones)).toBeLessThan(5000);
    console.log(`[FIX-06] activa duraciones(ms): ${duraciones.join(", ")}`);
  });

  it("GET .../rutinas/historial resuelve 200 con orden fechaInicio DESC rapido (3 corridas)", async () => {
    const duraciones: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await medirGet(`/clientes/${clienteId}/rutinas/historial`, recep.token);
      duraciones.push(r.ms);
      expect(r.statusCode, r.raw.slice(0, 300)).toBe(200);
      expect(r.body.total).toBe(2);
      const nombres = r.body.asignaciones.map((a: any) => a.rutina?.nombre);
      expect(nombres).toEqual([
        "Cobertura AUD03 historial nueva",
        "Cobertura AUD03 historial antigua",
      ]);
      expect(r.body.asignaciones[0].estado).toBe("ACTIVA");
      expect(r.body.asignaciones[1].estado).toBe("CERRADA");
      expect(r.body.asignaciones[1].fechaInicio).toBe("2026-10-01");
      // Snapshot legible (JSON.parse del contenidoSnapshot, REV-09).
      expect(r.body.asignaciones[1].contenidoSnapshot?.nombre).toBe(
        "Cobertura AUD03 historial antigua"
      );
      expect(r.body.asignaciones[1].actor?.id).toBeTruthy();
    }
    expect(Math.max(...duraciones)).toBeLessThan(5000);
    console.log(`[FIX-06] historial duraciones(ms): ${duraciones.join(", ")}`);
  });

  it("GET .../rutinas/activa resuelve tambien con token RECEPCIONISTA tras hoyBogota()", async () => {
    // Paridad de calendario con la fixture (America/Bogota) + estado calculado.
    expect(hoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const r = await medirGet(`/clientes/${clienteId}/rutinas/activa`, recep.token);
    expect(r.statusCode).toBe(200);
    expect(r.body.estado).toBe("ACTIVA");
    expect(r.ms).toBeLessThan(5000);
    console.log(`[FIX-06] activa (corrida extra) duracion(ms): ${r.ms}`);
  });
});
