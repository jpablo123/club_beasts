import { Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import type { ApiWorld } from "../support/world";

/**
 * INC00-QA-06 / R4 - Definicion UNICA de "el sistema retorna estado {int}".
 *
 * Antes estaba duplicada en `auth.steps.ts` y `clientes.steps.ts`, lo que
 * convertia en ambiguo cualquier escenario de ambos features y rompia el
 * runner (los dos ficheros entran por el glob de steps del config cucumber).
 */
Then("el sistema retorna estado {int}", function (this: ApiWorld, statusCode: number) {
  expect(this.response.statusCode).toBe(statusCode);
});
