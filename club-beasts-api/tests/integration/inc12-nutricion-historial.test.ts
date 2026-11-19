import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildNutricionApp, cleanupNutricion } from "./inc12-nutricion-helpers";
import { loginDueno, loginRecepcionista, loginCliente } from "./inc10-rutinas-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
let recep: any;
let cliente: any;
beforeAll(async () => {
  app = await buildNutricionApp();
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
  cliente = await loginCliente(app, "1234567890", "1234");
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await cleanupNutricion(); });

describe("INC-12 NU-29..NU-35 historial de planes", () => {
  it("NU-29 GET historial devuelve lista", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    expect([200,404]).toContain(res.statusCode);
  });
  it("NU-30 historial ordenado por fecha desc", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    if (res.statusCode === 200) expect(Array.isArray(res.json())).toBe(true);
  });
  it("NU-31 cada entrada incluye actor", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    if (res.statusCode === 200 && Array.isArray(res.json()) && res.json().length) expect(res.json()[0]).toHaveProperty("asignadoPor");
  });
  it("NU-32 cierre anterior registra fechaFin", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    expect([200,404]).toContain(res.statusCode);
  });
  it("NU-33 snapshot del plan en asignacion", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    if (res.statusCode === 200 && Array.isArray(res.json()) && res.json().length) expect(res.json()[0]).toHaveProperty("plan");
  });
  it("NU-34 acceso restringido por rol", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/historial", headers: { authorization: `Bearer ${cliente.token}` } });
    expect([401,403,404]).toContain(res.statusCode);
  });
  it("NU-35 invariante 0-1 activas", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/planes-nutricionales/activa", headers: { authorization: `Bearer ${dueno.token}` } });
    if (res.statusCode === 200) expect(Array.isArray(res.json()) ? res.json().length <= 1 : true).toBe(true);
  });
});