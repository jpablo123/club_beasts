import type { Rutina as RutinaModelo, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { mapPrismaError } from "../lib/errors.js";
import {
  MENSAJE_ASIGNACION_CONFLICTO,
  MENSAJES_ASIGNACION,
  validarContencionCiclos,
  type CrearRutinaBase,
  type CrearRutinaPersonalizada,
  type EstadoVigenciaPersonalizado,
  type Macrociclo,
  type RutinaBaseDatos,
  type RutinaPersonalizadaDatos,
  type RutinaResumen,
} from "../schemas/rutina.schema.js";
import {
  calcularEstado,
  getTodayBogota,
  pausasActivas,
  type FilaCambio,
} from "./membresia.service.js";

/**
 * INC-10 (HU-18/19 + R4/R5/R6) — CRUD de rutinas (GENERICA/INDUCCION/
 * PERSONALIZADA).
 *
 * Reglas del servicio (contrato API RATIFICADO del spec INC-10):
 *  - R4: la validacion Zod vive en la ruta (copia `src/schemas/rutina.schema.ts`
 *    1:1 del canonico, INC09-R08); `validarContencionCiclos` (pura, RU-12) se
 *    ejecuta AQUI y devuelve el PRIMER error (INC05-CONF-01) -> 400
 *    `VALIDATION_ERROR`.
 *  - DEC-012/Anamnesis: las secciones se persisten como JSON en columnas
 *    `String` (nunca `Json`); la (de)serializacion ocurre SOLO aqui.
 *  - R3/C3a (merge del PATCH por secciones): clave AUSENTE = conserva; clave
 *    presente = REEMPLAZA la columna completa de esa seccion. `tipoRutina` es
 *    inmutable (el contrato de update ni lo recibe).
 *  - RU-16 trazabilidad: `actualizadoPorId` = actor del token (nunca un valor
 *    libre del request) + `fechaActualizacion` (`@updatedAt`, ISO-8601).
 *  - DEC-067/R6: el snapshot de la asignacion se construye desde el contenido
 *    vigente en forma de "payload create completo" (asignacion.service.ts).
 *  - Sin DELETE en MVP (patron Anamnesis/DEC-057).
 *  - DEC-066 (R5): `estadoVigenciaPersonalizada(clienteId)` es la UNICA fuente
 *    del estado de la vigencia del servicio personalizado (reutiliza
 *    `calcularEstado`/`getTodayBogota`/`pausasActivas` de INC-05; `CONGELADO`
 *    que cubre hoy NO permite activar personalizada, precedente fixture F7).
 *    Consumidores: asignacion (409), endpoints 7 y 8 (ocultacion sin borrar).
 *
 * Errores: `ErrorValidacion` (400, mensaje = primer error) y `ErrorNegocio`
 * (codigo DEC-070; la ruta mapea codigo -> status/cuerpo).
 */

// ─── Errores del dominio ────────────────────────────────────────────────────

/** 400 `VALIDATION_ERROR` con el mensaje del primer error (INC05-CONF-01). */
export class ErrorValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorValidacion";
  }
}

/** Error de negocio con codigo contractual (DEC-070); la ruta lo mapea. */
export class ErrorNegocio extends Error {
  constructor(public readonly codigo: string) {
    super(codigo);
    this.name = "ErrorNegocio";
  }
}

// ─── (De)serializacion JSON por columna (DEC-012, patron INC-09) ────────────

function serializarSeccion(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  return JSON.stringify(valor);
}

function deserializarSeccion<T>(crudo: string | null, fallback: T): T {
  if (!crudo) return fallback;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return fallback;
  }
}

// ─── Tipos de fila y DTOs ───────────────────────────────────────────────────

export type FilaRutina = RutinaModelo & {
  actualizadoPor: { id: string; nombre: string };
};

const includeActualizadoPor = {
  actualizadoPor: { select: { id: true, nombre: true } },
} satisfies Prisma.RutinaInclude;

// ─── Mappers fila -> DTO (orden de claves = orden del schema canonico) ──────

function aDatosBase(fila: FilaRutina): RutinaBaseDatos {
  return {
    id: fila.id,
    tipoRutina: fila.tipoRutina as RutinaBaseDatos["tipoRutina"],
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? null,
    objetivo: fila.objetivo ?? null,
    nivelExperiencia: fila.nivelExperiencia ?? null,
    sesiones: deserializarSeccion(fila.sesiones, []),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
    actualizadoPor: { id: fila.actualizadoPor.id, nombre: fila.actualizadoPor.nombre },
  };
}

function aDatosPersonalizada(fila: FilaRutina): RutinaPersonalizadaDatos {
  return {
    id: fila.id,
    tipoRutina: "PERSONALIZADA",
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? null,
    informacionGeneral: deserializarSeccion<unknown>(
      fila.informacionGeneral,
      null
    ) as RutinaPersonalizadaDatos["informacionGeneral"],
    diagnostico: deserializarSeccion<unknown>(
      fila.diagnostico,
      null
    ) as RutinaPersonalizadaDatos["diagnostico"],
    macrociclos: deserializarSeccion(fila.macrociclos, []),
    tests: deserializarSeccion(fila.tests, []),
    antropometria: deserializarSeccion(fila.antropometria, []),
    analisisBiomecanico: deserializarSeccion(fila.analisisBiomecanico, []),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
    actualizadoPor: { id: fila.actualizadoPor.id, nombre: fila.actualizadoPor.nombre },
  };
}

/** Detalle por TIPO PERSISTIDO (endpoint 3; R1#3). */
export function aDatosRutina(fila: FilaRutina): RutinaBaseDatos | RutinaPersonalizadaDatos {
  return fila.tipoRutina === "PERSONALIZADA" ? aDatosPersonalizada(fila) : aDatosBase(fila);
}

export function aResumen(fila: RutinaModelo): RutinaResumen {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipoRutina: fila.tipoRutina as RutinaResumen["tipoRutina"],
    descripcion: fila.descripcion ?? null,
  };
}

/**
 * Snapshot DEC-067/R6 = "payload create completo" del contenido VIGENTE de la
 * rutina (misma forma que los schemas de creacion; se captura en la misma
 * transaccion de la asignacion). Las columnas vacias viajan `null`.
 */
export function contenidoCreateCompleto(fila: RutinaModelo): Record<string, unknown> {
  if (fila.tipoRutina === "PERSONALIZADA") {
    return {
      tipoRutina: "PERSONALIZADA",
      nombre: fila.nombre,
      descripcion: fila.descripcion ?? null,
      informacionGeneral: deserializarSeccion<unknown>(fila.informacionGeneral, {}),
      diagnostico: deserializarSeccion<unknown>(fila.diagnostico, {}),
      macrociclos: deserializarSeccion<unknown>(fila.macrociclos, []),
      tests: deserializarSeccion<unknown>(fila.tests, []),
      antropometria: deserializarSeccion<unknown>(fila.antropometria, []),
      analisisBiomecanico: deserializarSeccion<unknown>(fila.analisisBiomecanico, []),
    };
  }
  return {
    tipoRutina: fila.tipoRutina,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? null,
    objetivo: fila.objetivo ?? null,
    nivelExperiencia: fila.nivelExperiencia ?? null,
    sesiones: deserializarSeccion<unknown>(fila.sesiones, []),
  };
}

// ─── DEC-066 (R5): fuente unica del estado de la vigencia personalizada ─────

/**
 * Estado de la vigencia del servicio personalizado (`tipoServicio` =
 * "PERSONALIZADO", DEC-004) del cliente, calculado con la MISMA fuente unica
 * que INC-05 (`calcularEstado` + `pausasActivas`, America/Bogota inclusivo).
 * `CONGELADO` que cubre hoy NO permite activar personalizada (fixture F7).
 * Sin vigencias -> `NO_CONTRATADO`. Con varias: gana `ACTIVA`; si no, la mas
 * reciente por `fechaInicio`.
 */
export async function estadoVigenciaPersonalizada(
  clienteId: string
): Promise<EstadoVigenciaPersonalizado> {
  const hoy = getTodayBogota();
  const vigencias = await prisma.membresiaGym.findMany({
    where: { clienteId, tipoServicio: "PERSONALIZADO" },
    select: {
      fechaInicio: true,
      fechaFin: true,
      cambios: {
        select: {
          accion: true,
          version: true,
          congelacionInicio: true,
          congelacionFin: true,
        },
        orderBy: { version: "asc" },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });
  if (vigencias.length === 0) return "NO_CONTRATADO";
  const estados = vigencias.map((vigencia) =>
    calcularEstado(
      vigencia.fechaInicio,
      vigencia.fechaFin,
      hoy,
      pausasActivas(vigencia.cambios as FilaCambio[])
    )
  );
  return estados.find((estado) => estado === "ACTIVA") ?? estados[0];
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

/** Fila completa (+ actualizadoPor) o null (paso 404 del orden de errores). */
export async function obtenerFilaRutina(rutinaId: string): Promise<FilaRutina | null> {
  const fila = await prisma.rutina.findUnique({
    where: { id: rutinaId },
    include: includeActualizadoPor,
  });
  return fila ?? null;
}

/**
 * POST /rutinas (RU-01, GENERICA/INDUCCION, DEC-064). El body ya viene
 * validado con `crearRutinaBaseSchema` (la ruta responde el 400 con el primer
 * error zod). Sin contencion de ciclos aqui (DEC-018: la base no tiene ciclos).
 */
export async function crearRutinaBase(
  datos: CrearRutinaBase,
  actorId: string
): Promise<RutinaBaseDatos> {
  const fila = await prisma.rutina.create({
    data: {
      tipoRutina: datos.tipoRutina,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      objetivo: datos.objetivo ?? null,
      nivelExperiencia: datos.nivelExperiencia ?? null,
      sesiones: serializarSeccion(datos.sesiones)!,
      actualizadoPorId: actorId,
    },
    include: includeActualizadoPor,
  });
  return aDatosBase(fila);
}

/**
 * POST /rutinas-personalizadas (RU-09, DEC-018/062/063). `validarContencionCiclos`
 * (RU-12) corre AQUI (servicio) y devuelve el PRIMER error -> `ErrorValidacion`.
 */
export async function crearRutinaPersonalizada(
  datos: CrearRutinaPersonalizada,
  actorId: string
): Promise<RutinaPersonalizadaDatos> {
  assertContencionCiclos(datos.macrociclos);
  const fila = await prisma.rutina.create({
    data: {
      tipoRutina: "PERSONALIZADA",
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      informacionGeneral: serializarSeccion(datos.informacionGeneral)!,
      diagnostico: serializarSeccion(datos.diagnostico)!,
      macrociclos: serializarSeccion(datos.macrociclos)!,
      tests: serializarSeccion(datos.tests ?? []),
      antropometria: serializarSeccion(datos.antropometria ?? []),
      analisisBiomecanico: serializarSeccion(datos.analisisBiomecanico ?? []),
      actualizadoPorId: actorId,
    },
    include: includeActualizadoPor,
  });
  return aDatosPersonalizada(fila);
}

/** RU-12: contencion hijo ⊆ padre; primer error (INC05-CONF-01). */
function assertContencionCiclos(macrociclos: Macrociclo[]): void {
  const errores = validarContencionCiclos(macrociclos);
  if (errores.length > 0) {
    throw new ErrorValidacion(errores[0]);
  }
}

/**
 * GET /rutinas?tipo=&nombre= (endpoint 2). `tipo` = coincidencia EXACTA sobre
 * TIPO_RUTINA (validado en la ruta con el campo canonico); `nombre` =
 * subcadena insensible a mayusculas (SQLite no soporta `mode: insensitive`;
 * se filtra en memoria — listados pequenos, patron documentado). Ambos AND.
 */
export async function listarRutinas(filtros: {
  tipo?: string;
  nombre?: string;
}): Promise<{ rutinas: RutinaResumen[]; total: number }> {
  const filas = await prisma.rutina.findMany({
    where: filtros.tipo ? { tipoRutina: filtros.tipo } : {},
    orderBy: { createdAt: "desc" },
  });
  const nombreBuscado = filtros.nombre?.toLowerCase();
  const rutinas = filas
    .filter(
      (fila) =>
        nombreBuscado === undefined || fila.nombre.toLowerCase().includes(nombreBuscado)
    )
    .map(aResumen);
  return { rutinas, total: rutinas.length };
}

// ─── PATCH por secciones (R3/C3a; tipoRutina inmutable) ─────────────────────

/** Secciones editables por tipo (columna = seccion, DEC-012). */
const SECCIONES_BASE = [
  "nombre",
  "descripcion",
  "objetivo",
  "nivelExperiencia",
  "sesiones",
] as const;

const SECCIONES_PERSONALIZADA = [
  "nombre",
  "descripcion",
  "informacionGeneral",
  "diagnostico",
  "macrociclos",
  "tests",
  "antropometria",
  "analisisBiomecanico",
] as const;

/**
 * PATCH /rutinas/:rutinaId (RU-06/RU-17): merge por secciones — la seccion
 * PRESENTE reemplaza la columna completa; la ausente se conserva. El 404 y la
 * validacion del body (por tipo persistido) los resuelve la ruta ANTES de
 * llamar aqui.
 *
 * ENMIENDA INC10-FIX-05 (REV-05, 2026-11-15): la contencion de ciclos (RU-12,
 * R4) se ejecuta AQUI tambien, sobre el ARBOL RESULTANTE DEL MERGE (no sobre
 * el body parcial) y ANTES de escribir, con el MISMO orden y literal del
 * primer error que la creacion (INC05-CONF-01) -> 400 `VALIDATION_ERROR`.
 * Cierra la asimetria que permitia a un DUENO persistir (y luego asignar) un
 * arbol no contenido via PATCH directo. RU-17 queda enmendado: "presente =
 * reemplaza" solo aplica a arboles CONTENIDOS; la creacion (rama 1b) no cambia.
 */
export async function actualizarRutina(
  fila: FilaRutina,
  cambios: Record<string, unknown>,
  clavesPresentes: ReadonlySet<string>,
  actorId: string
): Promise<RutinaBaseDatos | RutinaPersonalizadaDatos> {
  const secciones =
    fila.tipoRutina === "PERSONALIZADA" ? SECCIONES_PERSONALIZADA : SECCIONES_BASE;

  const data: Record<string, unknown> = { actualizadoPorId: actorId };
  for (const seccion of secciones) {
    if (!clavesPresentes.has(seccion)) continue;
    const valor = cambios[seccion];
    if (seccion === "nombre") {
      data.nombre = valor;
      continue;
    }
    if (seccion === "descripcion" || seccion === "objetivo" || seccion === "nivelExperiencia") {
      data[seccion] = valor ?? null;
      continue;
    }
    if (seccion === "tests" || seccion === "antropometria" || seccion === "analisisBiomecanico") {
      data[seccion] = serializarSeccion(valor ?? []);
      continue;
    }
    data[seccion] = serializarSeccion(valor);
  }

  // ENMIENDA INC10-FIX-05 (REV-05): contencion (RU-12) sobre el MERGE — la
  // seccion presente aporta su arbol completo; la ausente conserva el
  // persistido. Solo PERSONALIZADA tiene ciclos (DEC-018). Sin escritura si
  // falla: `ErrorValidacion` -> 400 con el PRIMER error (R4, INC05-CONF-01).
  if (fila.tipoRutina === "PERSONALIZADA") {
    const macrociclosMerge: Macrociclo[] = clavesPresentes.has("macrociclos")
      ? (cambios.macrociclos as Macrociclo[])
      : deserializarSeccion<Macrociclo[]>(fila.macrociclos, []);
    assertContencionCiclos(macrociclosMerge);
  }

  const actualizada = await prisma.rutina.update({
    where: { id: fila.id },
    data: data as Prisma.RutinaUpdateInput,
    include: includeActualizadoPor,
  });
  return aDatosRutina(actualizada);
}

// ─── Mapeo de errores del dominio a HTTP (patron `mapPrismaError`) ──────────

/**
 * Cuerpo/status por codigo de negocio (DEC-070; mensajes derivados del
 * canonico `MENSAJES_ASIGNACION`). Compartido por los tres modulos de rutas
 * de INC-10.
 */
export function respuestaErrorNegocio(codigo: string): {
  status: number;
  body: { error: string; code: string };
} {
  switch (codigo) {
    case "CLIENTE_NO_ENCONTRADO":
      return {
        status: 404,
        body: {
          error: MENSAJES_ASIGNACION.CLIENTE_NO_ENCONTRADO,
          code: "CLIENTE_NO_ENCONTRADO",
        },
      };
    case "PLAN_NO_ENCONTRADO":
      return {
        status: 404,
        body: {
          error: "PLAN_NO_ENCONTRADO",
          code: "PLAN_NO_ENCONTRADO",
        },
      };
    case "RUTINA_NO_ENCONTRADA":
      return {
        status: 404,
        body: {
          error: MENSAJES_ASIGNACION.RUTINA_NO_ENCONTRADA,
          code: "RUTINA_NO_ENCONTRADA",
        },
      };
    case "CLIENTE_INACTIVO":
      return {
        status: 409,
        body: {
          error: MENSAJES_ASIGNACION.CLIENTE_INACTIVO,
          code: "CLIENTE_INACTIVO",
        },
      };
    case "SIN_VIGENCIA_PERSONALIZADA":
      return {
        status: 409,
        body: {
          error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
          code: "SIN_VIGENCIA_PERSONALIZADA",
        },
      };
    case "RUTINA_YA_ACTIVA":
      return {
        status: 409,
        body: {
          error: MENSAJES_ASIGNACION.RUTINA_YA_ACTIVA,
          code: "RUTINA_YA_ACTIVA",
        },
      };
    case "PLAN_YA_ACTIVO":
      return {
        status: 409,
        body: { error: "PLAN_YA_ACTIVO", code: "PLAN_YA_ACTIVO" },
      };
    case "SIN_VIGENCIA_NUTRICION":
      return {
        status: 409,
        body: { error: "SIN_VIGENCIA_NUTRICION", code: "SIN_VIGENCIA_NUTRICION" },
      };
    // ENMIENDA C4 (INC-10, 2026-11-05) — INC10-R08-GAP-02 / DEC-070: 409 de
    // concurrencia (arbitro `activaClave` -> P2002).
    case "ASIGNACION_CONFLICTO":
      return {
        status: 409,
        body: {
          error: MENSAJE_ASIGNACION_CONFLICTO,
          code: "ASIGNACION_CONFLICTO",
        },
      };
    default:
      return {
        status: 500,
        body: { error: "Error interno al procesar la solicitud", code: "INTERNAL_ERROR" },
      };
  }
}

/** Reply minima que necesita el mapeo (compatible estructuralmente con Fastify). */
export type ReplyMinima = {
  status: (code: number) => { send: (body: unknown) => unknown };
};

/**
 * Responde el error de dominio/validacion desde la ruta (patron
 * `mapPrismaError`). Errores fuera del dominio: mapeo Prisma o propagacion
 * (500 del framework).
 */
export function responderError(error: unknown, reply: ReplyMinima): unknown {
  if (error instanceof ErrorValidacion) {
    return reply.status(400).send({ error: error.message, code: "VALIDATION_ERROR" });
  }
  if (error instanceof ErrorNegocio) {
    const respuesta = respuestaErrorNegocio(error.codigo);
    return reply.status(respuesta.status).send(respuesta.body);
  }
  const mapped = mapPrismaError(error);
  if (mapped) {
    return reply.status(mapped.status).send(mapped.body);
  }
  throw error;
}
