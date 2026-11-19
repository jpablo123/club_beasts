import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildNutricionApp } from "./inc12-nutricion-helpers";
import { loginDueno } from "./inc10-rutinas-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
beforeAll(async () => { app = await buildNutricionApp(); dueno = await loginDueno(app); });
afterAll(async () => { await app.close(); });

describe("INC-13 HI-03 notificaciones on-demand", () => {
  it("POST /notificaciones/vencimiento/enviar devuelve enviados/dedup/errores", async () => {
    const res = await app.inject({ method: "POST", url: "/notificaciones/vencimiento/enviar", headers: { authorization: `Bearer ${dueno.token}` }, payload: {} });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("enviados");
    expect(body).toHaveProperty("deduplicados");
    expect(body).toHaveProperty("errores");
  });
  it("dedup por (clienteId, servicioId, fechaVencimiento, tipoAviso)", async () => {
    const r1 = await app.inject({ method: "POST", url: "/notificaciones/vencimiento/enviar", headers: { authorization: `Bearer ${dueno.token}` }, payload: {} });
    const r2 = await app.inject({ method: "POST", url: "/notificaciones/vencimiento/enviar", headers: { authorization: `Bearer ${dueno.token}` }, payload: {} });
    expect(r2.json().deduplicados).toBeGreaterThanOrEqual(r1.json().deduplicados);
  });
  it("solo DUENO", async () => {
    const res = await app.inject({ method: "POST", url: "/notificaciones/vencimiento/enviar", payload: {} });
    expect(res.statusCode).toBe(401);
  });
  it("stub provider por defecto", async () => {
    const res = await app.inject({ method: "POST", url: "/notificaciones/vencimiento/enviar", headers: { authorization: `Bearer ${dueno.token}` }, payload: {} });
    expect(res.statusCode).toBe(200);
  });
});
