import type { Anamnesis as AnamnesisModelo, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { isPrismaCode } from "../lib/errors.js";
import {
  CAMPOS_ANAMNESIS,
  CAMPOS_SENSIBLES,
  SECCIONES_ANAMNESIS,
  derivarEstadoAnamnesis,
  guardarParcialAnamnesisSchema,
  mensajePrimerErrorZod,
  type AnamnesisCampos,
  type CampoAnamnesis,
  type EstadoAnamnesis,
} from "../schemas/anamnesis.schema.js";

/**
 * INC-09 (HU-09/10/11/28) — CRUD de la anamnesis deportiva.
 *
 * Reglas del servicio (contrato API RATIFICADO del spec INC-09):
 *  - INC09-R09: la (de)serializacion JSON de los multi-selects
 *    (`antecedentesMedicos`, `diasNoEntrenamiento`) ocurre SOLO aqui: el
 *    schema valida `string[]` en ambos extremos; Prisma persiste `String`
 *    con JSON de `string[]` (SQLite no soporta scalar lists).
 *  - INC09-R05 / DEC-055: serializacion por WHITLIST EXPLICITA (listas de
 *    claves por vista); jamas se propaga el registro de Prisma (`...registro`).
 *  - R5: el estado es DERIVADO (`derivarEstadoAnamnesis`), no persistido (sin
 *    columna -> sin drift). Se recalcula en cada guardado/edicion.
 *  - R3/C3a (merge del PATCH): clave AUSENTE = conserva; clave presente con
 *    `null`/`""` = VACIA el campo; clave con valor = valida y reemplaza.
 *    Las contradicciones SI/NO se validan sobre el ESTADO FUSIONADO (post-404
 *    anamnesis) -> resultado `CONTRADICCION` con el mensaje del primer error.
 *    Un arreglo vacio `[]` cuenta como "sin diligenciar" (mismo criterio que
 *    AN-26): vacia el campo.
 *  - DEC-057: 1 anamnesis por cliente (`clienteId` unico); el doble POST se
 *    resuelve con check explicito + fallback P2002 -> `EXISTENTE`.
 *  - DEC-057 trazabilidad: `actualizadoPorId` (actor del token) +
 *    `fechaActualizacion` (`@updatedAt` de Prisma, ISO-8601).
 *  - Sin escritura en 4xx: toda validacion (incluida la del fusionado) ocurre
 *    ANTES del `create`/`update`.
 */

/** Mensaje literal SIN_REGISTRO (R2, fijado en el RED). */
export const MENSAJE_SIN_REGISTRO =
  "Aun no hay una anamnesis registrada para este cliente.";

// ─── Tipos ─────────────────────────────────────────────────────────────────

/**
 * Registro de anamnesis deserializado para lectura: las 25 propiedades con
 * `null` = sin diligenciar (los multi-selects ya parseados como `string[]`).
 */
export interface AnamnesisRegistro {
  clienteId: string;
  actualizadoPorId: string;
  fechaActualizacion: Date;
  nombreCompleto: string | null;
  numeroDocumento: string | null;
  sexo: string | null;
  rh: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  lugarNacimiento: string | null;
  estadoCivil: string | null;
  direccionResidencia: string | null;
  numeroContacto: string | null;
  correoElectronico: string | null;
  practicaDeporte: string | null;
  cualDeporte: string | null;
  tiempoQuePractica: string | null;
  contactoEmergencia: string | null;
  eps: string | null;
  antecedentesMedicos: string[] | null;
  antecedentesFamiliares: string | null;
  enfermedadRelevante: string | null;
  cualEnfermedad: string | null;
  objetivosEntrenamiento: string | null;
  nivelActividad: string | null;
  diasNoEntrenamiento: string[] | null;
  horaAcostarse: string | null;
  comidasPorDia: number | null;
}

export type ResultadoCreacion =
  | { estado: "CREADA"; registro: AnamnesisRegistro }
  | { estado: "EXISTENTE" };

export type ResultadoActualizacion =
  | { estado: "ACTUALIZADA"; registro: AnamnesisRegistro }
  | { estado: "SIN_REGISTRO" }
  | { estado: "CONTRADICCION"; mensaje: string };

/** Campos fusionados (escritura): los 25 con `undefined` = sin diligenciar. */
type CamposFusion = Record<CampoAnamnesis, unknown>;

// ─── INC09-R09: (de)serializacion JSON de los multi-selects ────────────────

const CAMPOS_MULTIPLES: ReadonlySet<string> = new Set([
  "antecedentesMedicos",
  "diasNoEntrenamiento",
]);

/** Serializa un multi-select a JSON `string[]` (null si no diligenciado). */
function serializarMulti(valor: unknown): string | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  return JSON.stringify(valor);
}

/** Parsea el JSON `string[]` persistido (null si ausente/corrupto). */
function deserializarMulti(crudo: string | null): string[] | null {
  if (!crudo) return null;
  try {
    const parsed: unknown = JSON.parse(crudo);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

// ─── Mappers fila Prisma <-> registro deserializado ────────────────────────

function aRegistro(fila: AnamnesisModelo): AnamnesisRegistro {
  return {
    clienteId: fila.clienteId,
    actualizadoPorId: fila.actualizadoPorId,
    fechaActualizacion: fila.fechaActualizacion,
    nombreCompleto: fila.nombreCompleto,
    numeroDocumento: fila.numeroDocumento,
    sexo: fila.sexo,
    rh: fila.rh,
    edad: fila.edad,
    fechaNacimiento: fila.fechaNacimiento,
    lugarNacimiento: fila.lugarNacimiento,
    estadoCivil: fila.estadoCivil,
    direccionResidencia: fila.direccionResidencia,
    numeroContacto: fila.numeroContacto,
    correoElectronico: fila.correoElectronico,
    practicaDeporte: fila.practicaDeporte,
    cualDeporte: fila.cualDeporte,
    tiempoQuePractica: fila.tiempoQuePractica,
    contactoEmergencia: fila.contactoEmergencia,
    eps: fila.eps,
    antecedentesMedicos: deserializarMulti(fila.antecedentesMedicos),
    antecedentesFamiliares: fila.antecedentesFamiliares,
    enfermedadRelevante: fila.enfermedadRelevante,
    cualEnfermedad: fila.cualEnfermedad,
    objetivosEntrenamiento: fila.objetivosEntrenamiento,
    nivelActividad: fila.nivelActividad,
    diasNoEntrenamiento: deserializarMulti(fila.diasNoEntrenamiento),
    horaAcostarse: fila.horaAcostarse,
    comidasPorDia: fila.comidasPorDia,
  };
}

/** Registro -> campos de dominio (`undefined` = sin diligenciar). */
function aCampos(registro: AnamnesisRegistro): CamposFusion {
  const campos = {} as CamposFusion;
  for (const campo of CAMPOS_ANAMNESIS) {
    const valor = (registro as unknown as Record<string, unknown>)[campo];
    campos[campo] = valor === null ? undefined : valor;
  }
  return campos;
}

/**
 * Whitlist explicita -> datos de persistencia (`null` = sin diligenciar).
 * Multi-selects serializados aqui y solo aqui (INC09-R09). Arreglo vacio =
 * sin diligenciar (criterio AN-26).
 */
function aDatosPersistencia(
  campos: CamposFusion
): Record<string, string | number | null> {
  const datos: Record<string, string | number | null> = {};
  for (const campo of CAMPOS_ANAMNESIS) {
    const valor = campos[campo];
    if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) {
      datos[campo] = null;
    } else if (CAMPOS_MULTIPLES.has(campo)) {
      datos[campo] = serializarMulti(valor);
    } else {
      datos[campo] = valor as string | number;
    }
  }
  return datos;
}

/** Estado derivado del registro (R5: jamas persistido). */
function estadoDe(registro: AnamnesisRegistro): EstadoAnamnesis {
  return derivarEstadoAnamnesis(aCampos(registro) as AnamnesisCampos);
}

// ─── Serializacion por whitelist explicita (INC09-R05) ─────────────────────

/**
 * Proyeccion de las 25 propiedades SOLO por lista blanca de claves; lo no
 * diligenciado viaja como `null` (AN-28). Nunca se propaga `...registro`.
 */
function camposPorWhitelist(
  registro: AnamnesisRegistro,
  campos: readonly string[]
): Record<string, unknown> {
  const fuente = registro as unknown as Record<string, unknown>;
  const salida: Record<string, unknown> = {};
  for (const campo of campos) {
    const valor = fuente[campo];
    salida[campo] = valor === undefined ? null : valor;
  }
  return salida;
}

/** 20/25 propiedades operativas (DEC-055: fuera las 5 sensibles). */
const CAMPOS_OPERATIVOS: readonly string[] = CAMPOS_ANAMNESIS.filter(
  (campo) => !(CAMPOS_SENSIBLES as readonly string[]).includes(campo)
);

/** Vista DUENO: plana, 25 propiedades + metadatos staff. */
export function vistaDueno(registro: AnamnesisRegistro) {
  return {
    ...camposPorWhitelist(registro, CAMPOS_ANAMNESIS),
    clienteId: registro.clienteId,
    estado: estadoDe(registro),
    fechaActualizacion: registro.fechaActualizacion.toISOString(),
    actualizadoPorId: registro.actualizadoPorId,
  };
}

/**
 * Vista RECEPCIONISTA: plana, 20/25 propiedades (sin las 5 claves de
 * DEC-055: ni valores ni claves) + metadatos staff.
 */
export function vistaRecepcion(registro: AnamnesisRegistro) {
  return {
    ...camposPorWhitelist(registro, CAMPOS_OPERATIVOS),
    clienteId: registro.clienteId,
    estado: estadoDe(registro),
    fechaActualizacion: registro.fechaActualizacion.toISOString(),
    actualizadoPorId: registro.actualizadoPorId,
  };
}

/**
 * Vista CLIENTE (HU-28): agrupada S1-S4 con sus 25 valores, `estado` y
 * `fechaActualizacion`; SIN `actualizadoPorId` (DEC-041).
 */
export function vistaClienteSecciones(registro: AnamnesisRegistro) {
  return {
    clienteId: registro.clienteId,
    estado: estadoDe(registro),
    fechaActualizacion: registro.fechaActualizacion.toISOString(),
    secciones: {
      S1: camposPorWhitelist(registro, SECCIONES_ANAMNESIS.S1.campos),
      S2: camposPorWhitelist(registro, SECCIONES_ANAMNESIS.S2.campos),
      S3: camposPorWhitelist(registro, SECCIONES_ANAMNESIS.S3.campos),
      S4: camposPorWhitelist(registro, SECCIONES_ANAMNESIS.S4.campos),
    },
  };
}

/** SIN_REGISTRO (R2): identico para los 3 roles. */
export function vistaSinRegistro() {
  return {
    estado: "SIN_REGISTRO" as const,
    mensaje: MENSAJE_SIN_REGISTRO,
  };
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

/** Existencia del cliente (paso del orden de errores R7, previo a 409/201). */
export async function existeCliente(clienteId: string): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  return cliente !== null;
}

/** Registro 1:1 del cliente, deserializado (o null = SIN_REGISTRO). */
export async function obtenerAnamnesis(
  clienteId: string
): Promise<AnamnesisRegistro | null> {
  const fila = await prisma.anamnesis.findUnique({ where: { clienteId } });
  return fila ? aRegistro(fila) : null;
}

/**
 * POST (solo DUENO, DEC-058): crea la unica anamnesis del cliente (DEC-057).
 * `EXISTENTE` cubre el check explicito y el fallback P2002 (mismo cuerpo 409).
 * El body ya viene validado con `guardarParcialAnamnesisSchema` (R4: un
 * obligatorio faltante NO es 400 -> estado PENDIENTE derivado).
 */
export async function crearAnamnesis(
  clienteId: string,
  campos: AnamnesisCampos,
  actorId: string
): Promise<ResultadoCreacion> {
  const datos = aDatosPersistencia(campos as CamposFusion);
  try {
    const fila = await prisma.anamnesis.create({
      data: {
        ...datos,
        clienteId,
        actualizadoPorId: actorId,
      } as Prisma.AnamnesisUncheckedCreateInput,
    });
    return { estado: "CREADA", registro: aRegistro(fila) };
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      return { estado: "EXISTENTE" };
    }
    throw error;
  }
}

/**
 * PATCH (solo DUENO): semantica de merge R3/C3a sobre el registro existente.
 *  - clave AUSENTE en `clavesPresentes` -> conserva el valor almacenado;
 *  - clave presente sin diligenciar (`null`/`""`/`[]` -> `undefined` tras el
 *    preproceso del schema) -> VACIA el campo;
 *  - clave presente con valor -> reemplaza (ya validado por campo).
 * Contradicciones SI/NO validadas sobre el ESTADO FUSIONADO (post-404) con el
 * mensaje del PRIMER error (INC05-CONF-01). Sin escritura si hay 4xx.
 */
export async function actualizarAnamnesis(
  clienteId: string,
  cambios: AnamnesisCampos,
  clavesPresentes: ReadonlySet<string>,
  actorId: string
): Promise<ResultadoActualizacion> {
  const fila = await prisma.anamnesis.findUnique({ where: { clienteId } });
  if (!fila) {
    return { estado: "SIN_REGISTRO" };
  }

  const fusionado: CamposFusion = { ...aCampos(aRegistro(fila)) };
  for (const campo of CAMPOS_ANAMNESIS) {
    if (!clavesPresentes.has(campo)) continue;
    const valor = (cambios as unknown as Record<string, unknown>)[campo];
    const sinDiligenciar =
      valor === undefined || (Array.isArray(valor) && valor.length === 0);
    fusionado[campo] = sinDiligenciar ? undefined : valor;
  }

  // R3/R7: consistencia SI/NO sobre el fusionado (post-404) -> 400 si choca.
  const validacion = guardarParcialAnamnesisSchema.safeParse(fusionado);
  if (!validacion.success) {
    return {
      estado: "CONTRADICCION",
      mensaje: mensajePrimerErrorZod(validacion),
    };
  }

  const datos = aDatosPersistencia(fusionado);
  const actualizada = await prisma.anamnesis.update({
    where: { clienteId },
    data: {
      ...datos,
      actualizadoPorId: actorId,
    } as Prisma.AnamnesisUncheckedUpdateInput,
  });
  return { estado: "ACTUALIZADA", registro: aRegistro(actualizada) };
}
