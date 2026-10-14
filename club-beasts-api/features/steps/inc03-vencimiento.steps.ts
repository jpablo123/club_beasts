import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import {
  Inc03World,
  authHeaders,
  body,
  getInc03App,
} from "./inc03-soporte";

/** Steps de vencimiento (INC03-VEN-01..05). Textos unicos. */

When(
  "consulto las membresías gym del cliente de prueba",
  async function (this: Inc03World) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const server = await getInc03App();
    const token = this.token ?? "";
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${this.clienteId}/membresias-gym`,
      headers: authHeaders(token),
    });
  }
);

When("consulto la ficha del cliente de prueba", async function (this: Inc03World) {
  if (!this.clienteId) throw new Error("falta el cliente de prueba");
  const server = await getInc03App();
  const token = this.token ?? "";
  this.response = await server.inject({
    method: "GET",
    url: `/clientes/${this.clienteId}`,
    headers: authHeaders(token),
  });
});

Then(
  "la vigencia gym del cliente de prueba tiene estado {string}",
  function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(Array.isArray(data.membresias)).toBe(true);
    expect(data.membresias.length).toBeGreaterThan(0);
    const gym = data.membresias.find(
      (m: any) => (m.tipoServicio ?? "GYM") === "GYM"
    );
    expect(gym).toBeDefined();
    expect(gym.estado).toBe(estado);
  }
);

Then(
  "la ficha del cliente de prueba muestra la vigencia con estado {string}",
  function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(Array.isArray(data.membresias)).toBe(true);
    expect(data.membresias.length).toBeGreaterThan(0);
    expect(data.membresias[0].estado).toBe(estado);
  }
);
