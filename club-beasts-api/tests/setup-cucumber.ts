/**
 * INC00-QA-06 / DEC-012 / DEC-013 - Aislamiento del runner Gherkin.
 *
 * Reusa el setup de SQLite aislado (BD temporal por ejecucion, `prisma db push`
 * sobre un schema provisional y seed deterministico) que ya usa la suite
 * principal de vitest. No se modifica `tests/setup-isolated-sqlite.ts`.
 *
 * Vitest ejecuta `setupFiles` antes de importar el `.feature`, de modo que el
 * runner cucumber y los `Before`/`After` de `features/support/world.ts` operan
 * siempre sobre la base aislada y nunca sobre `prisma/dev.db`.
 */
import "./setup-isolated-sqlite";
