import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildNutricionApp, cleanupNutricion, MENSAJE_PLAN_NO_ENCONTRADO } from "./inc12-nutricion-helpers";
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
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await cleanupNutricion();
});

describe("INC-12 NU-01..NU-08 creacion estructurada de plan nutricional", () => {
  it("NU-01 POST /planes-nutricionales crea plan con campos biometricos y objetivos caloricos", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/planes-nutricionales",
      headers: { authorization: `Bearer ${dueno.token}` },
      payload: { nombre: "Plan base", datosBiometricos: { pesoKg: 75, tallaCm: 175, objetivoCaloricoKcal: 2000, objetivo: "mantener" }, comidas: [{ nombre: "Desayuno", alimentos: ["Avena"] }] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.datosBiometricos.objetivoCaloricoKcal).toBe(2000);
  });

  it("NU-02 macros se guardan como valor manual (no calculado)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/planes-nutricionales",
      headers: { authorization: `Bearer ${dueno.token}` },
      payload: { nombre: "Plan macros", datosBiometricos: { pesoKg: 75, tallaCm: 175, objetivoCaloricoKcal: 2000, objetivo: "mantener" }, macronutrientes: { proteinaG: 150, carbohidratosG: 200, grasasG: 60 }, comidas: [{ nombre: "Desayuno", alimentos: ["Avena"] }] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.macronutrientes.proteinaG).toBe(150);
  });

  it("NU-07 sin DUENO devuelve 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/planes-nutricionales",
      headers: { authorization: `Bearer ${recep.token}` },
      payload: { nombre: "Plan x" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("NU-08 GET /planes-nutricionales/:id inexistente devuelve 404 PLAN_NO_ENCONTRADO", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/planes-nutricionales/999999",
      headers: { authorization: `Bearer ${dueno.token}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().code ?? res.json().error).toContain("PLAN_NO_ENCONTRADO");
  });
});