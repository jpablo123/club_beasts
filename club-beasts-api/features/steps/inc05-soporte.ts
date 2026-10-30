import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Inc03World } from "./inc03-soporte";

/**
 * INC-05 (tareas 11-12, RED) - soporte compartido por los tests de
 * integracion (`tests/integration/hu13-*.test.ts` / `hu14-*.test.ts`) y por
 * los steps de los `.feature` nuevos de servicio personalizado y nutricion.
 *
 * Mundo: se reutiliza `Inc03World` (token, actorId, clienteId, portalToken,
 * vigenciaId, etc.) para poder encadenar los steps reutilizables de
 * `inc03-fixtures.steps.ts` / `inc04-estados.steps.ts` sin duplicar estado.
 *
 * INC-05 agrega el id de la ultima vigencia por tipo creado como fixture:
 * los escenarios mixtos (GYM + PERSONALIZADO + NUTRICION, fixture F8) necesitan
 * referenciar cada fila por separado (p. ej. congelar la GYM sin tocar la
 * PERSONALIZADO en la prueba de regresion C1).
 */
export type Inc05World = Inc03World & {
  /** id de la ultima vigencia PERSONALIZADO creada como fixture. */
  vigenciaPersonalizadoId?: string | null;
  /** id de la ultima vigencia NUTRICION creada como fixture. */
  vigenciaNutricionId?: string | null;
};

/**
 * Helpers de fecha/fixture reutilizados tal cual (no se duplican): tokens
 * "hoy"/"hoy+N" (DEC-013), creacion directa de filas con `tipoServicio`
 * explicito (DEC-004) y headers/body de `fastify.inject`.
 */
export {
  hoyBogota,
  sumarDias,
  resolverFecha,
  authHeaders,
  body,
  crearVigenciaGymFixture,
  congelarVigenciaFixture,
  adminToken,
  recepToken,
  loginClientePortal,
  SEDE_PRINCIPAL,
} from "./inc03-soporte";

/** Rutas que existen hoy en `src/routes/` (base que debe registrarse siempre). */
const RUTAS_BASE = ["auth.ts", "clientes.ts", "membresia.ts", "portal.ts", "recepcion.ts"];

let app: any = null;

/**
 * Fastify con TODAS las rutas del backend.
 *
 * En RED (INC-05) los endpoints `servicios-personalizado` / `servicios-nutricion`
 * aun no existen en `src/`; las peticiones a esas rutas responden 404 de
 * Fastify y las pruebas nuevas quedan rojas por diseño. Para que el mismo
 * soporte sirva en GREEN sin editar este archivo (el backend puede agregar
 * rutas en un archivo nuevo o extender `membresia.ts`), el registrador
 * recorre `src/routes/` en tiempo de ejecucion e importa cada modulo con
 * `import()` dinamico de ruta resoluble (variable): si el archivo aun no
 * existe se omite a proposito; si falta una ruta BASE se relanza el error.
 *
 * Precedente: `getInc03App()` de `inc03-soporte.ts` (app con todas las rutas);
 * aqui se generaliza el registro para que el RED no dependa del nombre del
 * archivo que elija `backend-developer` en el GREEN.
 */
export async function getInc05App() {
  if (app) return app;

  const Fastify = (await import("fastify")).default;
  const { default: prismaPlugin } = await import("../../src/plugins/prisma");
  const { default: authPlugin } = await import("../../src/plugins/auth");

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  const dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../src/routes"
  );

  let archivos: string[] = [];
  try {
    archivos = fs
      .readdirSync(dir)
      .filter((archivo) => archivo.endsWith(".ts") && !archivo.endsWith(".d.ts"))
      .sort();
  } catch {
    archivos = [...RUTAS_BASE].sort();
  }

  let registradas = 0;
  for (const archivo of archivos) {
    const esBase = RUTAS_BASE.includes(archivo);
    try {
      const modulo = await import(pathToFileURL(path.join(dir, archivo)).href);
      if (typeof modulo?.default === "function") {
        await app.register(modulo.default);
        registradas += 1;
      }
    } catch (error) {
      if (esBase) throw error;
      // Ruta nueva todavia inexistente (RED de INC-05): omision deliberada.
    }
  }

  if (registradas < RUTAS_BASE.length) {
    throw new Error(
      `inc05-soporte: solo se registraron ${registradas} rutas base (esperadas ${RUTAS_BASE.length})`
    );
  }

  await app.ready();
  return app;
}
