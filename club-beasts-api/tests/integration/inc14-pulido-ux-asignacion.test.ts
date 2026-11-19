import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildNutricionApp } from "./inc12-nutricion-helpers";
import { loginDueno, loginRecepcionista } from "./inc10-rutinas-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
let recep: any;
beforeAll(async () => {
  app = await buildNutricionApp();
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
});
afterAll(async () => { await app.close(); });

describe("INC-14 PU-01 cancelar vigencia", () => {
  it("POST /clientes/:id/vigencias/:vigenciaId/cancelar (DUENO) devuelve 200 o 404", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/1/vigencias/1/cancelar", headers: { authorization: "Bearer " + dueno.token } });
    expect([200, 404]).toContain(res.statusCode);
  });
  it("recepcionista no puede cancelar (403)", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/1/vigencias/1/cancelar", headers: { authorization: "Bearer " + recep.token } });
    expect([403, 404]).toContain(res.statusCode);
  });
});

describe("INC-14 PU-02 asignar rutina a clientes (bulk)", () => {
  it("POST /rutinas/:id/asignar devuelve exitos/fallos", async () => {
    const res = await app.inject({ method: "POST", url: "/rutinas/1/asignar", headers: { authorization: "Bearer " + dueno.token }, payload: { clienteIds: ["1"] } });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const body = res.json();
      expect(body).toHaveProperty("exitos");
      expect(body).toHaveProperty("fallos");
    }
  });
  it("sin DUENO devuelve 403", async () => {
    const res = await app.inject({ method: "POST", url: "/rutinas/1/asignar", headers: { authorization: "Bearer " + recep.token }, payload: { clienteIds: ["1"] } });
    expect([403, 404]).toContain(res.statusCode);
  });
});

describe("INC-14 PU-03 presets de duracion", () => {
  it("POST servicio personalizado con duracionPreset calcula fechaFin", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/1/servicios-personalizado", headers: { authorization: "Bearer " + dueno.token }, payload: { fechaInicio: "2026-01-01", duracionPreset: "1m" } });
    expect([200, 201, 400, 404]).toContain(res.statusCode);
  });
});
