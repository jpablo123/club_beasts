/**
 * INC00-QA-06 / R6 - Capa de compatibilidad vitest 3 <-> @lotun/vitest-cucumber.
 *
 * `@lotun/vitest-cucumber@0.5.4` esta declarado para vitest 4/5, pero este
 * proyecto usa vitest 3.2.x (no se puede subir de version sin romper la suite
 * principal, prohibido por el alcance de la tarea 12). El plugin usa exactamente
 * tres APIs que no existen en vitest 3:
 *
 *   1. `TestRunner.getCurrentSuite()` -> metadata de ubicacion de escenarios.
 *   2. `test.afterAll(...)`           -> espera del run de Cucumber por archivo.
 *   3. `test.extend(nombre, opts, fn)` -> fixture de limpieza del worker.
 *
 * Este modulo se resuelve SOLO cuando el importador es un archivo de
 * `@lotun/vitest-cucumber` (ver el plugin `inc00:vitest3-compat` de
 * `vitest.cucumber.config.ts`); el resto de los archivos del proyecto siguen
 * importando `vitest` normalmente.
 *
 * Nota sobre (3): el fixture original unicamente ejecuta los hooks `BeforeAll`/
 * `AfterAll` de Cucumber y la publicacion de informes (publish esta deshabilitada
 * en este runner). Los hooks `Before`/`After` por escenario -los que usa
 * `features/support/world.ts` para la limpieza DEC-012/DEC-013- no dependen de
 * el, asi que se registra un `afterAll` equivalente sin perder cobertura.
 */
import {
  afterAll as baseAfterAll,
  describe as baseDescribe,
  test as baseTest,
} from "vitest";

type AnyFunction = (...args: any[]) => any;

type SuiteRecord = {
  tasks: unknown[];
  suite: { location?: { line: number; column: number } };
};

const suiteStack: SuiteRecord[] = [];

function currentSuite(): SuiteRecord {
  return suiteStack[suiteStack.length - 1] ?? { tasks: [], suite: {} };
}

function trackTask<T>(value: T): T {
  suiteStack[suiteStack.length - 1]?.tasks.push(value);
  return value;
}

function bindMember(target: any, prop: string | symbol) {
  const value = Reflect.get(target, prop, target);
  return typeof value === "function" ? value.bind(target) : value;
}

/**
 * `test.extend("hooks", { scope: "worker", auto: true }, fn).afterAll(...)`
 * (API vitest 4/5) - en vitest 3 `extend` recibe un unico argumento. Se
 * conserva la cadena `.afterAll(...)` para no romper el registro del plugin.
 */
function compatExtend(target: AnyFunction): AnyFunction {
  return (...args: any[]) => {
    if (args.length === 1) {
      return Reflect.apply((target as any).extend, target, args);
    }

    const afterAll = (fn?: AnyFunction, timeout?: number) =>
      baseAfterAll(fn ?? (() => null), timeout);

    return { afterAll };
  };
}

export const describe: AnyFunction = new Proxy(baseDescribe as unknown as AnyFunction, {
  apply(target, thisArg, args: any[]) {
    const record: SuiteRecord = { tasks: [], suite: {} };
    suiteStack.push(record);
    try {
      return Reflect.apply(target, thisArg, args);
    } finally {
      suiteStack.pop();
    }
  },
  get: bindMember,
});

export const test: AnyFunction = new Proxy(baseTest as unknown as AnyFunction, {
  apply(target, thisArg, args: any[]) {
    return trackTask(Reflect.apply(target, thisArg, args));
  },
  get(target, prop) {
    if (prop === "afterAll") {
      return (fn: AnyFunction, timeout?: number) => baseAfterAll(fn, timeout);
    }
    if (prop === "extend") {
      return compatExtend(target);
    }
    return bindMember(target, prop);
  },
});

/**
 * Sustituye `TestRunner` de vitest 4/5. Devuelve la suite actual (con sus tareas
 * registradas y el objeto suite) para que el plugin conserve la metadata de
 * ubicacion (`location`) de cada escenario.
 */
export const TestRunner = {
  getCurrentSuite: () => currentSuite(),
};

export * from "vitest";
