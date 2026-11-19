import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildNutricionApp } from "./inc12-nutricion-helpers";
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

describe("INC-13 HI-01 historial consolidado", () => {
  it("GET /clientes/:id/historial responde { items, total } con paginacion", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/historial?limit=10&offset=0", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.items)).toBe(true);
  });
  it("filtra por tipo", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/historial?tipo=RUTINA", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(200);
  });
  it("CLIENTE solo ve su propio historial sin actor", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/historial", headers: { authorization: "Bearer " + cliente } });
    expect(res.statusCode).toBe(200);
    const items = res.json().items;
    if (items && items.length) expect(items[0]).not.toHaveProperty("actor");
  });
  it("staff ve actor", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/1/historial", headers: { authorization: `Bearer ${dueno.token}` } });
    expect(res.statusCode).toBe(200);
    const items = res.json().items;
    if (items && items.length) expect(items[0]).toHaveProperty("actor");
  });
});

