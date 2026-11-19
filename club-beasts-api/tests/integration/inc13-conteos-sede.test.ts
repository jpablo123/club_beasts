import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildNutricionApp } from "./inc12-nutricion-helpers";
import { loginDueno } from "./inc10-rutinas-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
beforeAll(async () => { app = await buildNutricionApp(); dueno = await loginDueno(app); });
afterAll(async () => { await app.close(); });

describe("INC-13 HI-02 conteos por sede", () => {
  it("GET /sedes/:id/conteos devuelve activos/vencidos/congelados + ingresos del dia", async () => {
    const res = await app.inject({ method: "GET", url: "/sedes/sede-1/conteos", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("activos");
    expect(body).toHaveProperty("vencidos");
    expect(body).toHaveProperty("congelados");
    expect(body).toHaveProperty("ingresosDelDia");
  });
  it("valida sedeId", async () => {
    const res = await app.inject({ method: "GET", url: "/sedes/999999/conteos", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(404);
  });
  it("fecha opcional (default hoy Bogota)", async () => {
    const res = await app.inject({ method: "GET", url: "/sedes/sede-1/conteos?fecha=2026-01-01", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(200);
  });
  it("solo DUENO", async () => {
    const res = await app.inject({ method: "GET", url: "/sedes/sede-1/conteos" });
    expect(res.statusCode).toBe(401);
  });
});

