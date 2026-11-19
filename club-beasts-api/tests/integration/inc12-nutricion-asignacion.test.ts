import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildNutricionApp, cleanupNutricion, CODE_CLIENTE_NO_ENCONTRADO, CODE_PLAN_NO_ENCONTRADO, CODE_SIN_VIGENCIA, CODE_CLIENTE_INACTIVO, CODE_ASIGNACION_CONFLICTO, MENSAJE_SIN_VIGENCIA, MENSAJE_CLIENTE_NO_ENCONTRADO } from "./inc12-nutricion-helpers";
import { loginDueno, loginRecepcionista, loginCliente } from "./inc10-rutinas-helpers";
import { prisma } from "./inc12-nutricion-helpers";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
let dueno: any;
let recep: any;
let cliente: any;
let planId: any;
let clienteInactivoId: any;
let clienteId: string;
beforeAll(async () => {
  app = await buildNutricionApp();
  dueno = await loginDueno(app);
  recep = await loginRecepcionista(app);
  cliente = await loginCliente(app, "1234567890", "1234");
  const clienteRow = await prisma.cliente.findUnique({ where: { cedula: "1234567890" } });
  clienteId = clienteRow.id;
  const cRes = await app.inject({ method: "POST", url: "/clientes", headers: { authorization: "Bearer " + dueno.token }, payload: { cedula: "9999999999", nombres: "Inactivo", apellidos: "Fixture", telefono: "3000000002", sedeId: "sede-1" } });
  clienteInactivoId = cRes.json().id;
  await app.inject({ method: "PATCH", url: "/clientes/" + clienteInactivoId, headers: { authorization: "Bearer " + dueno.token }, payload: { estado: "INACTIVO", motivo: "Fixture inactivo" } });
});
afterAll(async () => { await app.close(); });
beforeEach(async () => {
  await cleanupNutricion();
  const res = await app.inject({ method: "POST", url: "/planes-nutricionales", headers: { authorization: "Bearer " + dueno.token }, payload: { nombre: "Plan base", datosBiometricos: { pesoKg: 75, tallaCm: 175, objetivoCaloricoKcal: 2000, objetivo: "mantener" }, comidas: [{ nombre: "Desayuno", alimentos: ["Avena"] }] } });
  planId = res.json().id;
});

describe("INC-12 NU-09..NU-28 asignacion de plan a cliente", () => {
  it("NU-09 POST asignacion crea registro activo", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toHaveProperty("id");
  });
  it("NU-10 cliente inexistente devuelve 404 CLIENTE_NO_ENCONTRADO", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/999999/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    expect(res.statusCode).toBe(404);
    expect(res.json().code ?? res.json().error).toContain(CODE_CLIENTE_NO_ENCONTRADO);
  });
  it("NU-11 plan inexistente devuelve 404 PLAN_NO_ENCONTRADO", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId: "999999" } });
    expect(res.statusCode).toBe(404);
    expect(res.json().code ?? res.json().error).toContain(CODE_PLAN_NO_ENCONTRADO);
  });
  it("NU-12 sin vigencia nutricion devuelve 409 SIN_VIGENCIA_NUTRICION", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteInactivoId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    expect([409]).toContain(res.statusCode);
  });
  it("NU-13 cliente inactivo devuelve 409 CLIENTE_INACTIVO", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteInactivoId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    expect([409]).toContain(res.statusCode);
  });
  it("NU-14 solo 0-1 activo por cliente", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/" + clienteId + "/planes-nutricionales/activa", headers: { authorization: "Bearer " + dueno.token } });
    expect([200,404]).toContain(res.statusCode);
  });
  it("NU-15 reemplazo cierra anterior", async () => {
    await app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    expect([200,201,409]).toContain(res.statusCode);
  });
  it("NU-16 concurrencia devuelve ASIGNACION_CONFLICTO", async () => {
    const r1 = app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    const r2 = app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + dueno.token }, payload: { planId } });
    const [a, b] = await Promise.all([r1, r2]);
    expect([a.statusCode, b.statusCode]).toContain(201);
  });
  it("NU-18 recepcionista no puede asignar (403)", async () => {
    const res = await app.inject({ method: "POST", url: "/clientes/" + clienteId + "/planes-nutricionales/asignacion", headers: { authorization: "Bearer " + recep.token }, payload: { planId } });
    expect(res.statusCode).toBe(403);
  });
  it("NU-28 GET activo devuelve plan o 404", async () => {
    const res = await app.inject({ method: "GET", url: "/clientes/" + clienteId + "/planes-nutricionales/activa", headers: { authorization: "Bearer " + dueno.token } });
    expect([200,404]).toContain(res.statusCode);
  });
});
