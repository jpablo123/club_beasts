import { Then } from "@cucumber/cucumber";
import { expect } from "vitest";

import { body, type Inc03World } from "./inc03-soporte";

/**
 * INC-06 (RED Gherkin, DEC-051 copy fijo) — steps nuevos del aviso de
 * activar membresia.
 *
 * Criterios: `INC06-ACC-01` (deteccion), `INC06-ACC-02/03` (sin bloqueo con
 * servicio vigente/congelado) y el caso sustantivo de la ratificacion **R1**
 * (el estado general del cliente no entra en `sinMembresiaActiva`).
 *
 * El contrato (R3) expone el flag como campo top-level unico
 * `sinMembresiaActiva: boolean` en `GET /portal/resumen`. En RED ese campo
 * todavia no existe (`undefined`), por lo que los escenarios nuevos fallan
 * hasta el GREEN de backend-developer. Ningun step existente se modifica.
 */

Then(
  "el portal responde con sinMembresiaActiva {string}",
  function (this: Inc03World, esperado: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    // Comparacion estricta contra el literal del escenario ("true"/"false"):
    // `undefined` (campo ausente en RED) nunca coincide -> fallo RED honesto.
    expect(String(data.sinMembresiaActiva)).toBe(esperado);
  }
);
