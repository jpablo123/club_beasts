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
 * El runner cucumber comparte la base aislada entre los 126 escenarios de la
 * ejecucion, asi que se garantiza el baseline antes (`Before`) y se elimina lo
 * que el escenario dejo despues (`After`): ningun cliente creado por un
 * escenario sobrevive al siguiente.
 *
 * GAP-RED-02 (INC-03): los hijos de `Cliente` tienen FK `ON DELETE RESTRICT`
 * (`Ingreso.clienteId`, `MembresiaGym.clienteId`) y los hijos de `MembresiaGym`
 * (`MembresiaGymCambio.membresiaId`) tambien, por lo que el `deleteMany` de
 * clientes reventaba con `Foreign key constraint violated` cuando el orden de
 * los hooks `Before`/`After` de `features/steps/inc03-fixtures.steps.ts` no
 * garantizaba que las tablas hijas estuvieran vacias primero (el orden entre
 * archivos de hooks no es configurable). La limpieza de hijos vive AQUI, en la
 * misma funcion que restaura el baseline, con el orden de dependencias
 * obligatorio: nietos -> hijos -> padres.
 *
 * Ningun escenario crea `User` (el staff viene del seed), asi que no hay
 * limpieza de usuarios; `User.sedeId` solo se actualiza (DEC-031) y no bloquea
 * el borrado de clientes.
 */
async function restoreClientesBaseline() {
  // 1) nietos e hijos de Cliente (dependencias antes que padres).
  await prisma.ingreso.deleteMany({});
  await prisma.membresiaGymCambio.deleteMany({});
  await prisma.membresiaGym.deleteMany({});
  // 2) padres: clientes fuera del seed deterministico.
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
