import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { isPrismaCode } from "../lib/errors.js";
import { isValidDate } from "../schemas/membresia.schema.js";
import type { TipoServicioPropio } from "../schemas/servicio.schema.js";
import {
  calcularFechasEdicion,
  getTodayBogota,
  hasOverlap,
  includeCompleto,
  toDTO,
} from "./membresia.service.js";

/**
 * INC-05 (HU-13/HU-14, contrato ratificado 2026-10-20) — servicios de
 * **servicio personalizado** y **servicio de nutricion** sobre la tabla
 * compartida `MembresiaGym` con `tipoServicio` explicito (DEC-004/DEC-044,
 * modelo ratificado: cero migracion).
 *
 * Espejo de `crearMembresia` / `editarMembresia` / `listarMembresias` con
 * divergencias ratificadas:
 *  - el solape se evalua SOLO contra vigencias del MISMO `tipoServicio`
 *    (DEC-004: servicios separados), dentro de la misma transaccion
 *    (patron `INC00-MEM-02`);
 *  - los codigos de error son propios: `SERVICIO_SOLAPADA` /
 *    `SERVICIO_CONFLICTO` (DEC-044), nunca `MEMBRESIA_*`;
 *  - `registrarCambio` captura `P2002 -> SERVICIO_CONFLICTO` ANTES de
 *    `mapPrismaError` (correccion C5);
 *  - la pertenencia del `PATCH` incluye `tipoServicio` (correccion C6);
 *  - el `PATCH` aplica **DEC-046** (concurrencia optimista patron
 *    `INC00-MEM-03`, arbitro `@@unique([membresiaId, version])`) y
 *    **DEC-047** via `calcularFechasEdicion` (orden C2).
 */

/** Estados calculados con la MISMA fuente unica que gym (DEC-043). */
export type { TipoServicioPropio };

/**
 * INC00-MEM-07: defensa en profundidad (mismo patron que el espejo gym).
 * El schema Zod ya rechaza fechas vacias o invalidas, pero ningun camino de
 * escritura del servicio puede persistirlas aunque se llame fuera de la capa
 * HTTP.
 */
function assertFechaEditable(valor: string | undefined): void {
  if (valor !== undefined && !isValidDate(valor)) {
    throw new Error("VALIDATION_ERROR");
  }
}

/**
 * Escribe la fila de auditoria dentro de la transaccion activa. La
 * restriccion unique (membresiaId, version) es el arbitro a nivel de datos
 * (DEC-046): un choque de versiones aborta con `SERVICIO_CONFLICTO` y nada
 * de la transaccion queda persistido (correccion C5: P2002 se captura aqui,
 * antes de que el mapeo generico de Prisma lo convierta en un code distinto).
 */
async function registrarCambioServicio(
  tx: Prisma.TransactionClient,
  data: {
    membresiaId: string;
    actorId: string;
    accion: string;
    version: number;
    fechaInicioAnterior?: string | null;
    fechaFinAnterior?: string | null;
    fechaInicioNueva: string;
    fechaFinNueva: string;
  }
): Promise<void> {
  try {
    await tx.membresiaGymCambio.create({ data });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      throw new Error("SERVICIO_CONFLICTO");
    }
    throw error;
  }
}

/**
 * `GET /clientes/:clienteId/servicios-{tipo}` (INC05-PER-02/NUT-02):
 * `{ servicios, fechaActual }` con estado CALCULADO (nunca persistido) por
 * la misma fuente unica que gym/portal/recepcion — `CONGELADO` sale
 * automatico cuando hay pausa vigente (INC05-PER-03/NUT-03). El `where`
 * filtra por tipo (incompatibilidad #1). El chequeo 404 de cliente
 * inexistente lo hace la ruta (divergencia deliberada C6 del espejo gym).
 */
export async function listarServicios(
  clienteId: string,
  tipoServicio: TipoServicioPropio
) {
  const hoy = getTodayBogota();

  const filas = await prisma.membresiaGym.findMany({
    where: { clienteId, tipoServicio },
    include: includeCompleto,
    orderBy: { fechaInicio: "desc" },
  });

  return {
    servicios: filas.map((fila) => toDTO(fila, hoy)),
    fechaActual: hoy,
  };
}

/**
 * `POST /clientes/:clienteId/servicios-{tipo}` (INC05-PER-01/NUT-01).
 *
 * Espejo de `crearMembresia` con tres diferencias de contrato: la fila se
 * crea con `tipoServicio` explicito, el solape es por tipo y los codigos de
 * error son `SERVICIO_*`. La guarda heredada `CLIENTE_INACTIVO` (HU-08 b4 /
 * CONF-06) vive en el SERVICIO y evalua ANTES del solape: un cliente
 * INACTIVO no recibe servicios nuevos; la respuesta es 409 CLIENTE_INACTIVO,
 * nunca SERVICIO_SOLAPADA. Renovar crea periodo nuevo (DEC-007); gaps de 1
 * dia estan permitidos (DEC-008).
 */
export async function crearServicio(
  clienteId: string,
  tipoServicio: TipoServicioPropio,
  fechaInicio: string,
  fechaFin: string,
  actorId: string
) {
  const hoy = getTodayBogota();

  assertFechaEditable(fechaInicio);
  assertFechaEditable(fechaFin);

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true },
  });
  if (cliente?.estado === "INACTIVO") {
    throw new Error("CLIENTE_INACTIVO");
  }

  // INC00-MEM-02: la verificacion de solape (por TIPO, DEC-004) y la
  // escritura ocurren dentro de la MISMA transaccion: nunca quedan dos
  // periodos del mismo tipo solapados persistidos.
  return prisma.$transaction(async (tx) => {
    const existentes = await tx.membresiaGym.findMany({
      where: { clienteId, tipoServicio },
      select: { fechaInicio: true, fechaFin: true },
    });

    if (hasOverlap(existentes, fechaInicio, fechaFin)) {
      throw new Error("SERVICIO_SOLAPADA");
    }

    const servicio = await tx.membresiaGym.create({
      data: {
        clienteId,
        tipoServicio,
        fechaInicio,
        fechaFin,
        creadoPorId: actorId,
        actualizadoPorId: actorId,
        version: 1,
      },
      include: includeCompleto,
    });

    await registrarCambioServicio(tx, {
      membresiaId: servicio.id,
      actorId,
      accion: "CREACION",
      version: 1,
      fechaInicioNueva: fechaInicio,
      fechaFinNueva: fechaFin,
    });

    const completa = await tx.membresiaGym.findUnique({
      where: { id: servicio.id },
      include: includeCompleto,
    });

    return toDTO(completa!, hoy);
  });
}

/**
 * `PATCH /clientes/:clienteId/servicios-{tipo}/:servicioId` (DEC-046 = (a)).
 *
 * Orden de evaluacion (correccion C2): pertenencia (`clienteId` +
 * `tipoServicio`, una fila de otro tipo -> `404 Servicio no encontrado`) ->
 * `409 SERVICIO_CONFLICTO` (version) -> fechas efectivas (**DEC-047**: solo
 * `fechaInicio` desplaza `fechaFin` por el mismo delta; validacion 400
 * ANTES de desplazar) -> `409 SERVICIO_SOLAPADA` (del MISMO tipo) ->
 * escritura condicional `version + 1` + auditoria `EDICION` con las fechas
 * EFECTIVas -> `200`. **Sin** guarda `CLIENTE_INACTIVO` (CONF-02): editar
 * no es asignar.
 */
export async function editarServicio(
  clienteId: string,
  servicioId: string,
  tipoServicio: TipoServicioPropio,
  data: { fechaInicio?: string; fechaFin?: string; version: number },
  actorId: string
) {
  const hoy = getTodayBogota();

  assertFechaEditable(data.fechaInicio);
  assertFechaEditable(data.fechaFin);

  // INC00-MEM-03 / INC00-MEM-02: pertenencia, version, fechas efectivas y
  // solape se verifican DENTRO de la misma transaccion que escribe.
  return prisma.$transaction(async (tx) => {
    const existente = await tx.membresiaGym.findUnique({
      where: { id: servicioId },
      select: {
        id: true,
        clienteId: true,
        tipoServicio: true,
        fechaInicio: true,
        fechaFin: true,
        version: true,
      },
    });

    if (
      !existente ||
      existente.clienteId !== clienteId ||
      existente.tipoServicio !== tipoServicio
    ) {
      throw new Error("NOT_FOUND");
    }

    if (existente.version !== data.version) {
      throw new Error("SERVICIO_CONFLICTO");
    }

    // DEC-047 (orden C2): fechas efectivas; la validacion de orden (400)
    // ocurre ANTES de desplazar `fechaFin`.
    const nuevasFechas = calcularFechasEdicion(
      existente.fechaInicio,
      existente.fechaFin,
      data
    );

    const otrosPeriodos = await tx.membresiaGym.findMany({
      where: { clienteId, tipoServicio, id: { not: servicioId } },
      select: { fechaInicio: true, fechaFin: true },
    });

    if (
      hasOverlap(otrosPeriodos, nuevasFechas.fechaInicio, nuevasFechas.fechaFin)
    ) {
      throw new Error("SERVICIO_SOLAPADA");
    }

    const nuevaVersion = existente.version + 1;

    // Escritura condicional (lock optimista): solo escribe quien lee la
    // misma version; si otra escritura gano la carrera, count !== 1 y esta
    // transaccion aborta sin escribir.
    const escritura = await tx.membresiaGym.updateMany({
      where: {
        id: servicioId,
        clienteId,
        version: existente.version,
      },
      data: {
        fechaInicio: nuevasFechas.fechaInicio,
        fechaFin: nuevasFechas.fechaFin,
        actualizadoPorId: actorId,
        version: nuevaVersion,
        updatedAt: new Date(),
      },
    });

    if (escritura.count !== 1) {
      throw new Error("SERVICIO_CONFLICTO");
    }

    await registrarCambioServicio(tx, {
      membresiaId: servicioId,
      actorId,
      accion: "EDICION",
      version: nuevaVersion,
      fechaInicioAnterior: existente.fechaInicio,
      fechaFinAnterior: existente.fechaFin,
      fechaInicioNueva: nuevasFechas.fechaInicio,
      fechaFinNueva: nuevasFechas.fechaFin,
    });

    const completa = await tx.membresiaGym.findUnique({
      where: { id: servicioId },
      include: includeCompleto,
    });

    return toDTO(completa!, hoy);
  });
}
