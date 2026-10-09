import { After, Before, setWorldConstructor } from "@cucumber/cucumber";
import prisma from "../../src/lib/prisma";

/**
 * INC00-QA-06 - Mundo compartido por `auth.feature` y `clientes.feature`.
 * R6: todos los campos que los steps asignan estan declarados y tipados.
 */
export class ApiWorld {
  /** Respuesta HTTP actual (`fastify.inject`). */
  response: any = null;
  /** Token JWT emitido en el escenario (login DUENO o login cliente). */
  token: string | null = null;
  /** Credenciales y datos de fixture usados por los steps. */
  email: string | null = null;
  password: string | null = null;
  pin: string | null = null;
  cedula: string | null = null;
  clienteId: string | null = null;
}

setWorldConstructor(ApiWorld);

/**
 * Cedula del unico cliente que crea el seed deterministico
 * (`tests/setup-isolated-sqlite.ts`). Todo lo demas se considera basura de
 * escenario.
 */
const SEEDED_CLIENTE_CEDULA = "1234567890";

/**
 * DEC-012/DEC-013 - limpieza automatica y deterministica.
 *
 * El runner cucumber comparte la base aislada entre los 63 escenarios de la
 * ejecucion, asi que se garantiza el baseline antes (`Before`) y se elimina lo
 * que el escenario dejo despues (`After`): ningun cliente creado por un
 * escenario sobrevive al siguiente.
 */
async function restoreClientesBaseline() {
  await prisma.cliente.deleteMany({
    where: { cedula: { not: SEEDED_CLIENTE_CEDULA } },
  });
}

Before(async () => {
  await restoreClientesBaseline();
});

After(async () => {
  await restoreClientesBaseline();
});
