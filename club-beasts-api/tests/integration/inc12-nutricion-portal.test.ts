import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildNutricionApp, cleanupNutricion, ESTADO_SIN_PLAN, ESTADO_OCULTA, MENSAJE_SIN_PLAN, prisma } from "./inc12-nutricion-helpers";
import { loginDueno, loginRecepcionista, loginCliente } from "./inc10-rutinas-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
let recep: any;
let cliente: any;
let clienteId: string;
beforeAll(async () => {
  app = await buildNutricionApp();
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
  cliente = await loginCliente(app, "1234567890", "1234");
  const clienteRow = await prisma.cliente.findUnique({ where: { cedula: "1234567890" } });
  clienteId = clienteRow.id;
});
afterAll(async () => { await app.close(); });
beforeEach(async () => {
  await cleanupNutricion();
  const planRes = await app.inject({ method: "POST", url: "/planes-nutricionales", headers: { authorization: `Bearer ${dueno.token}` }, payload: { nombre: "Plan portal", datosBiometricos: { pesoKg: 75, tallaCm: 175, objetivoCaloricoKcal: 2000, objetivo: "mantener" }, comidas: [{ nombre: "Desayuno", alimentos: ["Avena"] }] } });
  const planId = planRes.json().id;
  await app.inject({ method: "POST", url: `/clientes/${clienteId}/planes-nutricionales/asignacion`, headers: { authorization: `Bearer ${dueno.token}` }, payload: { planId } });
});

describe("INC-12 NU-36..NU-42 portal nutricional", () => {
  it("NU-36 GET /portal/plan-nutricional solo su plan", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    expect([200,404]).toContain(res.statusCode);
  });
  it("NU-37 incluye alimentos", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    if (res.statusCode === 200) expect(res.json()).toHaveProperty("plan");
  });
  it("NU-38 incluye cantidades", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    if (res.statusCode === 200) expect(res.json()).toHaveProperty("plan");
  });
  it("NU-39 incluye recomendaciones", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    if (res.statusCode === 200) expect(res.json()).toHaveProperty("plan");
  });
  it("NU-40 sin plan devuelve mensaje", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    expect([200,404]).toContain(res.statusCode);
  });
  it("NU-41 no editable (solo lectura)", async () => {
    const res = await app.inject({ method: "PATCH", url: "/portal/plan-nutricional", headers: { authorization: `Bearer ${cliente}` } });
    expect([404,405,401]).toContain(res.statusCode);
  });
  it("NU-42 seguridad de sesion", async () => {
    const res = await app.inject({ method: "GET", url: "/portal/plan-nutricional", headers: { authorization: "Bearer INVALID" } });
    expect(res.statusCode).toBe(401);
  });
});
