import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * INC00-QA-06 - Config del runner Gherkin (tarea 12, R1/R2/R3/R5/R6/R8).
 *
 * El paquete no es `"type": "module"`, por lo que un `import` estatico del
 * plugin ESM-only `@lotun/vitest-cucumber` hace fallar la carga del config en
 * formato CJS. Se usa un default export async + `import()` dinamico para que
 * el filename documentado (`vitest.cucumber.config.ts`) siga siendo utilizable
 * con `npx vitest run -c vitest.cucumber.config.ts`.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compatShimPath = path.resolve(rootDir, "features/support/vitest-compat.ts");
const vitestCucumberId = /@lotun[\\/]vitest-cucumber/;

/**
 * DEC-014: 28 escenarios expandidos (auth) + 35 (clientes) = 63.
 *
 * GAP-RED-02 (INC-03): el alcance suma los 63 escenarios nuevos de INC-03
 * (vencimiento, portal, recepcion consulta/ingresos/rapida), asi que el guard
 * exige 63 + 63 = **126** escenarios ejecutados. Se SUBE la constante (nunca
 * se baja): con 63 el guard marcaba exit 1 en toda corrida completa aunque
 * los 126 escenarios pasaran, porque `executed` era 126.
 */
const INC00_SCENARIO_COUNT = 126;

/**
 * `@lotun/vitest-cucumber@0.5.x` apunta a vitest 4/5 y el proyecto usa vitest
 * 3.2.x (no se puede subir sin romper la suite principal, fuera del alcance de
 * la tarea 12). Sin este plugin el runner revienta con
 * `SyntaxError: The requested module 'vitest' does not provide an export named
 * 'TestRunner'` (R6 del inventario de `gherkin-alcance.md`).
 *
 * - `server.deps.inline` fuerza a vite a transformar los `.mjs` del plugin
 *   (estan en node_modules y por defecto se importan de forma nativa).
 * - `resolveId` redirige los 3 imports de `vitest` que hace el plugin hacia
 *   `features/support/vitest-compat.ts`, que implementa las APIs que faltan.
 */
function vitest3CompatForCucumber() {
  return {
    name: "inc00:vitest3-compat-for-vitest-cucumber",
    enforce: "pre" as const,
    resolveId(source: string, importer?: string) {
      if (source !== "vitest" || !importer) return null;
      const normalized = importer.replace(/\\/g, "/");
      if (!normalized.includes("@lotun/vitest-cucumber")) return null;
      return compatShimPath;
    },
  };
}

/**
 * DoD 6 / R8 - el runner no puede quedar "verde" con skips ocultos o con menos
 * escenarios que el alcance de DEC-014.
 *
 * Cucumber convierte un `.feature` sin escenarios que matcheen en un unico
 * test con `skip()`; sin este guard un `--tags` mal escrito terminaria con
 * exit code 0 ejecutando 0 escenarios.
 */
function inc00ScopeGuard() {
  const argv = process.argv.slice(2);
  const isNarrowedRun =
    Boolean(process.env.CUCUMBER_OPTIONS) ||
    argv.some(
      (arg) =>
        arg.includes(".feature") ||
        arg === "-t" ||
        arg.startsWith("--testNamePattern") ||
        arg.startsWith("--shard")
    );

  let total = 0;
  let skipped = 0;

  const walk = (tasks: any[] = []) => {
    for (const task of tasks ?? []) {
      if (task.type === "test") {
        total += 1;
        // vitest 3 marca los tests no ejecutados en `task.mode`;
        // `result.state === "skipped"` no siempre esta seteado.
        if (
          task.mode === "skip" ||
          task.mode === "todo" ||
          task.result?.state === "skipped"
        ) {
          skipped += 1;
        }
      } else if (task.tasks) {
        walk(task.tasks);
      }
    }
  };

  return {
    name: "inc00-gherkin-scope-guard",
    onFinished(files: any[] = []) {
      for (const file of files) walk(file.tasks);

      const problems: string[] = [];
      if (skipped > 0) {
        problems.push(
          `${skipped} escenario(s) omitidos (un .feature no produjo escenarios ejecutables)`
        );
      }
      const executed = total - skipped;
      if (!isNarrowedRun && executed !== INC00_SCENARIO_COUNT) {
        problems.push(
          `se esperaban ${INC00_SCENARIO_COUNT} escenarios ejecutados y se obtuvieron ${executed}`
        );
      }
      if (problems.length === 0) return;

      process.exitCode = 1;
      console.error(
        `\n[INC00-QA-06] Alcance Gherkin incompleto: ${problems.join("; ")}.\n`
      );
    },
  };
}

export default (async () => {
  const { cucumber } = await import("@lotun/vitest-cucumber");

  return defineConfig({
    plugins: [vitest3CompatForCucumber(), cucumber({
      import: ["features/support/**/*.ts", "features/steps/**/*.ts"],
    })],
    test: {
      include: ["features/**/*.feature"],
      // DEC-012/DEC-013: SQLite aislado por ejecucion + seed deterministico.
      setupFiles: ["./tests/setup-cucumber.ts"],
      server: {
        deps: {
          inline: [vitestCucumberId],
        },
      },
      // DoD 6: sin skips ocultos ni corridas vacias en silencio.
      passWithNoTests: false,
      reporters: ["default", inc00ScopeGuard()],
    },
  });
})();
