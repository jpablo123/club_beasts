import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { isPrismaCode } from "../lib/errors.js";
import { isValidDate } from "../schemas/membresia.schema.js";

const BOGOTA_OFFSET = -5;

export function getTodayBogota(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bogota = new Date(utc + BOGOTA_OFFSET * 3600000);
  const y = bogota.getFullYear();
  const m = String(bogota.getMonth() + 1).padStart(2, "0");
  const d = String(bogota.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * INC-03 (CONF-06): hora actual en America/Bogota como `HH:mm:ss`, usada por
 * `POST /recepcion/ingresos` para la columna `Ingreso.hora`. Misma conversion
 * que `getTodayBogota` (offset fijo -05:00, DEC-005).
 */
export function getHoraBogota(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bogota = new Date(utc + BOGOTA_OFFSET * 3600000);
  const hh = String(bogota.getHours()).padStart(2, "0");
  const mm = String(bogota.getMinutes()).padStart(2, "0");
  const ss = String(bogota.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function calcularEstado(
  fechaInicio: string,
  fechaFin: string,
  hoy: string,
  congelaciones?: Array<{ congelacionInicio: string; congelacionFin: string }>
): "PROGRAMADA" | "ACTIVA" | "VENCIDA" | "CONGELADO" {
  // INC-02 / HU-15 b3 + HU-12 b2: `CONGELADO` es un estado CALCULADO (no se
  // persiste) con precedencia sobre PROGRAMADA / ACTIVA / VENCIDA: si `hoy`
  // cae dentro de un rango de pausa vigente, la vigencia esta congelada aunque
  // el calendario diga otra cosa (fixture F7: VENCIDA + pausa que cubre hoy).
  // Fuera de todo rango vigente se conserva el calculo base (HU15-C03).
  if (
    congelaciones?.some(
      (rango) =>
        rango.congelacionInicio <= hoy && hoy <= rango.congelacionFin
    )
  ) {
    return "CONGELADO";
  }
  if (hoy < fechaInicio) return "PROGRAMADA";
  if (hoy > fechaFin) return "VENCIDA";
  return "ACTIVA";
}

/** Dias de calendario entre dos fechas `YYYY-MM-DD` (negativo si `desde > hasta`). */
function diasCalendario(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split("-").map(Number);
  const [y2, m2, d2] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000
  );
}

/** Dias completos inclusivos de un rango (DEC-005/DEC-006): (fin - inicio) + 1. */
function diasInclusivos(inicio: string, fin: string): number {
  return diasCalendario(inicio, fin) + 1;
}

/** Suma (o resta) dias de calendario a una fecha `YYYY-MM-DD`. */
function sumarDias(fecha: string, cantidad: number): string {
  const [anio, mes, diaMes] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + cantidad))
    .toISOString()
    .slice(0, 10);
}

/**
 * Formula de la ampliacion DEC-024 (ratificada 2026-10-08):
 * `diasDevueltos = max(0, finRango - max(hoy, inicioRango) + 1)`.
 *
 * - pausa futura (`hoy < inicio`)  -> N completo (devuelve la extension entera)
 * - pausa en curso                 -> `fin - hoy + 1` (formula literal DEC-024)
 * - pausa terminada (`hoy > fin`)  -> 0 (nunca negativo)
 * - rango invertido                -> 0
 */
export function diasDevueltos(
  inicioRango: string,
  finRango: string,
  hoy: string
): number {
  if (finRango < inicioRango) return 0;
  const desde = hoy < inicioRango ? inicioRango : hoy;
  if (desde > finRango) return 0;
  return diasCalendario(desde, finRango) + 1;
}

/**
 * Formula de edicion de la ampliacion DEC-024 (casos limite 5/6/7 del spec):
 * `fechaFin' = fechaFin - N_anterior + N_nuevo`, es decir se revierte la
 * extension COMPLETA que aplico `congelar` y se aplica el N nuevo. Los dias
 * ya consumidos solo se descuentan en `descongelar`, nunca al editar.
 */
export function fechaFinTrasEdicion(
  fechaFin: string,
  pausaInicio: string,
  pausaFin: string,
  rangoNuevoInicio: string,
  rangoNuevoFin: string
): string {
  const delta =
    diasInclusivos(rangoNuevoInicio, rangoNuevoFin) -
    diasInclusivos(pausaInicio, pausaFin);
  return sumarDias(fechaFin, delta);
}

export function hasOverlap(
  arr: Array<{ fechaInicio: string; fechaFin: string }>,
  newStart: string,
  newEnd: string,
  excludeId?: string
): boolean {
  return arr.some((m) => {
    if (excludeId && m === arr.find((x) => (x as any).id === excludeId)) return false;
    return newStart <= m.fechaFin && m.fechaInicio <= newEnd;
  });
}

// ─── Secuencia de pausa de una vigencia (INC-02 / DEC-024) ───────────────────

type RangoPausa = { congelacionInicio: string; congelacionFin: string };

export type FilaCambio = {
  accion: string;
  version: number;
  congelacionInicio: string | null;
  congelacionFin: string | null;
};

const ACCIONES_PAUSA = new Set([
  "CONGELACION",
  "DESCONGELACION",
  "EDICION_CONGELACION",
]);

/**
 * "congelacion vigente" (spec INC-02, modelo de datos): la ULTIMA fila de la
 * secuencia de pausa de la vigencia (orden por `version`, unica por membresia)
 * debe ser `CONGELACION` o `EDICION_CONGELACION`. Si la ultima fila es
 * `DESCONGELACION` (o no hay pausas) no hay pausa vigente que operar.
 *
 * Nota: la condicion `hoy <= congelacionFin` no se evalua aqui; la resuelve la
 * formula `diasDevueltos` (= 0 -> `409 CONGELACION_INEXISTENTE`), que ademas
 * permite descongelar una pausa futura devolviendo los N dias completos.
 */
export function pausaVigente(cambios: FilaCambio[]): RangoPausa | null {
  const secuencia = cambios
    .filter((cambio) => ACCIONES_PAUSA.has(cambio.accion))
    .sort((a, b) => a.version - b.version);
  const ultima = secuencia[secuencia.length - 1];
  if (!ultima) return null;
  if (
    ultima.accion !== "CONGELACION" &&
    ultima.accion !== "EDICION_CONGELACION"
  ) {
    return null;
  }
  if (!ultima.congelacionInicio || !ultima.congelacionFin) return null;
  return {
    congelacionInicio: ultima.congelacionInicio,
    congelacionFin: ultima.congelacionFin,
  };
}

/**
 * Pausas aun vigentes en la secuencia: una `CONGELACION` abre un rango, una
 * `EDICION_CONGELACION` lo reemplaza (la pausa editada es siempre la ultima
 * abierta) y una `DESCONGELACION` cierra el rango que nombra.
 *
 * Se usa para (a) calcular `CONGELADO`, (b) detectar solape con "otra"
 * congelacion (DEC-008) y (c) excluir la pausa que se esta editando.
 */
export function pausasActivas(cambios: FilaCambio[]): RangoPausa[] {
  const activas: RangoPausa[] = [];
  const ordenados = [...cambios].sort((a, b) => a.version - b.version);

  for (const cambio of ordenados) {
    if (!cambio.congelacionInicio || !cambio.congelacionFin) continue;
    const rango = {
      congelacionInicio: cambio.congelacionInicio,
      congelacionFin: cambio.congelacionFin,
    };

    if (cambio.accion === "CONGELACION") {
      activas.push(rango);
    } else if (cambio.accion === "EDICION_CONGELACION") {
      // Reemplaza la pausa abierta mas reciente (la que se esta editando).
      if (activas.length > 0) activas[activas.length - 1] = rango;
      else activas.push(rango);
    } else if (cambio.accion === "DESCONGELACION") {
      const indice = activas.findIndex(
        (rangoActivo) =>
          rangoActivo.congelacionInicio === rango.congelacionInicio &&
          rangoActivo.congelacionFin === rango.congelacionFin
      );
      if (indice >= 0) activas.splice(indice, 1);
    }
  }

  return activas;
}

/** `RangoPausa` -> forma `{ fechaInicio, fechaFin }` que espera `hasOverlap`. */
function rangosComoPeriodos(
  rangos: RangoPausa[]
): Array<{ fechaInicio: string; fechaFin: string }> {
  return rangos.map((rango) => ({
    fechaInicio: rango.congelacionInicio,
    fechaFin: rango.congelacionFin,
  }));
}

// ─── INC-03 (HU-16 b3): fuente unica de estado de acceso al gym ──────────────

export type EstadoAccesoGym =
  | "PROGRAMADA"
  | "ACTIVA"
  | "VENCIDA"
  | "CONGELADO"
  | "SIN_VIGENCIA";

export type ResultadoEstadoAcceso = {
  estadoAccesoGym: EstadoAccesoGym;
  /** `fechaFin` de la vigencia elegida; null cuando no hay vigencia GYM. */
  fechaVencimiento: string | null;
  /** Rango de la pausa vigente SOLO si `hoy` cae dentro de ella; si no, null. */
  congelacion: { fechaInicio: string; fechaFin: string } | null;
};

/**
 * INC-03 / HU-16 b3 (VEN-05): UNICA fuente del estado que exponen ficha,
 * listado, portal y recepcion. `calcularEstado` no cambia (INC-02 aceptado);
 * aqui se le agregan (a) las pausas de la secuencia para detectar CONGELADO,
 * (b) el sin-vigencia cuando no hay fila GYM y (c) el rango de congelacion a
 * exponer cuando `hoy` esta contenido en una pausa activa.
 */
export function resolverEstadoAcceso(
  membresia: { fechaInicio: string; fechaFin: string } | null,
  cambios: FilaCambio[] | undefined,
  hoy: string
): ResultadoEstadoAcceso {
  if (!membresia) {
    return {
      estadoAccesoGym: "SIN_VIGENCIA",
      fechaVencimiento: null,
      congelacion: null,
    };
  }

  const rangos = pausasActivas(cambios ?? []);
  const estado = calcularEstado(
    membresia.fechaInicio,
    membresia.fechaFin,
    hoy,
    rangos
  );
  const rangoHoy =
    rangos.find(
      (rango) => rango.congelacionInicio <= hoy && hoy <= rango.congelacionFin
    ) ?? null;

  return {
    estadoAccesoGym: estado,
    fechaVencimiento: membresia.fechaFin,
    congelacion: rangoHoy
      ? {
          fechaInicio: rangoHoy.congelacionInicio,
          fechaFin: rangoHoy.congelacionFin,
        }
      : null,
  };
}

/** Tipos de servicio congelables (DEC-023): NUTRICION queda fuera. */
const TIPOS_CONGELABLES: ReadonlySet<string> = new Set([
  "GYM",
  "PERSONALIZADO",
]);

interface MembresiaDTO {
  id: string;
  clienteId: string;
  tipoServicio: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "PROGRAMADA" | "ACTIVA" | "VENCIDA" | "CONGELADO";
  version: number;
  createdAt: string;
  updatedAt: string;
  creadoPor: { id: string; nombre: string };
  actualizadoPor: { id: string; nombre: string };
  cambios: Array<{
    id: string;
    accion: string;
    version: number;
    motivo?: string | null;
    congelacionInicio?: string;
    congelacionFin?: string;
    fechaInicioAnterior: string | null;
    fechaFinAnterior: string | null;
    fechaInicioNueva: string;
    fechaFinNueva: string;
    actor: { id: string; nombre: string };
    createdAt: string;
  }>;
}

function toDTO(m: any, hoy: string): MembresiaDTO {
  const cambios: FilaCambio[] = m.cambios ?? [];
  return {
    id: m.id,
    clienteId: m.clienteId,
    tipoServicio: m.tipoServicio ?? "GYM",
    fechaInicio: m.fechaInicio,
    fechaFin: m.fechaFin,
    estado: calcularEstado(m.fechaInicio, m.fechaFin, hoy, pausasActivas(cambios)),
    version: m.version,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
    updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
    creadoPor: { id: m.creadoPor.id, nombre: m.creadoPor.nombre },
    actualizadoPor: { id: m.actualizadoPor.id, nombre: m.actualizadoPor.nombre },
    cambios: m.cambios.map((c: any) => ({
      id: c.id,
      accion: c.accion,
      version: c.version,
      motivo: c.motivo,
      // Solo las filas de pausa traen rango; `undefined` (no `null`) permite
      // que el DTO sea retrocompatible y JSON no emita la clave.
      congelacionInicio: c.congelacionInicio ?? undefined,
      congelacionFin: c.congelacionFin ?? undefined,
      fechaInicioAnterior: c.fechaInicioAnterior,
      fechaFinAnterior: c.fechaFinAnterior,
      fechaInicioNueva: c.fechaInicioNueva,
      fechaFinNueva: c.fechaFinNueva,
      actor: { id: c.actor.id, nombre: c.actor.nombre },
      createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
    })),
  };
}

const includeCompleto = {
  creadoPor: { select: { id: true, nombre: true } },
  actualizadoPor: { select: { id: true, nombre: true } },
  cambios: {
    include: { actor: { select: { id: true, nombre: true } } },
    orderBy: { version: "asc" as const },
  },
};

/**
 * INC00-MEM-07: defensa en profundidad. El esquema Zod ya rechaza fechas
 * vacias o invalidas, pero ningun camino de escritura del servicio puede
 * persistirlas aunque se llame fuera de la capa HTTP.
 */
function assertFechaEditable(valor: string | undefined): void {
  if (valor !== undefined && !isValidDate(valor)) {
    throw new Error("VALIDATION_ERROR");
  }
}

/**
 * Escribe la fila de auditoria dentro de la transaccion activa.
 * La restriccion unique (membresiaId, version) es el arbitro a nivel de datos:
 * si otra escritura ya registro esa version, el unico ganador posible es la que
 * se registro primero y esta transaccion aborta con MEMBRESIA_CONFLICTO.
 */
async function registrarCambio(
  tx: Prisma.TransactionClient,
  data: {
    membresiaId: string;
    actorId: string;
    accion: string;
    version: number;
    motivo?: string | null;
    congelacionInicio?: string | null;
    congelacionFin?: string | null;
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
      throw new Error("MEMBRESIA_CONFLICTO");
    }
    throw error;
  }
}

export async function listarMembresias(clienteId: string) {
  const hoy = getTodayBogota();

  const membresias = await prisma.membresiaGym.findMany({
    where: { clienteId },
    include: includeCompleto,
    orderBy: { fechaInicio: "desc" },
  });

  return {
    membresias: membresias.map((m: any) => toDTO(m, hoy)),
    fechaActual: hoy,
  };
}

export async function crearMembresia(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  actorId: string
) {
  const hoy = getTodayBogota();

  assertFechaEditable(fechaInicio);
  assertFechaEditable(fechaFin);

  // INC00-MEM-02: la verificacion de solape y la escritura ocurren dentro de la
  // MISMA transaccion. Si otro periodo se compromete en la ventana entre la
  // verificacion y la escritura, esta transaccion lo ve (o choca contra la
  // restriccion de integridad) y aborta, de modo que nunca quedan dos periodos
  // solapados persistidos.
  return prisma.$transaction(async (tx) => {
    const existentes = await tx.membresiaGym.findMany({
      where: { clienteId },
      select: { fechaInicio: true, fechaFin: true },
    });

    if (hasOverlap(existentes, fechaInicio, fechaFin)) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const membresia = await tx.membresiaGym.create({
      data: {
        clienteId,
        fechaInicio,
        fechaFin,
        creadoPorId: actorId,
        actualizadoPorId: actorId,
        version: 1,
      },
      include: includeCompleto,
    });

    await registrarCambio(tx, {
      membresiaId: membresia.id,
      actorId,
      accion: "CREACION",
      version: 1,
      fechaInicioNueva: fechaInicio,
      fechaFinNueva: fechaFin,
    });

    const completa = await tx.membresiaGym.findUnique({
      where: { id: membresia.id },
      include: includeCompleto,
    });

    return toDTO(completa!, hoy);
  });
}

export async function editarMembresia(
  clienteId: string,
  membresiaId: string,
  data: { fechaInicio?: string; fechaFin?: string; version: number },
  actorId: string
) {
  const hoy = getTodayBogota();

  assertFechaEditable(data.fechaInicio);
  assertFechaEditable(data.fechaFin);

  // INC00-MEM-03 / INC00-MEM-02: pertenencia, version, orden de fechas y
  // solape se verifican DENTRO de la misma transaccion que escribe, de forma
  // que un cambio comprometido por otra parte en la ventana de verificacion
  // deja a esta escritura sin ganar: recibe 409 MEMBRESIA_CONFLICTO /
  // MEMBRESIA_SOLAPADA y no pisa el cambio ganador.
  return prisma.$transaction(async (tx) => {
    const existente = await tx.membresiaGym.findUnique({
      where: { id: membresiaId },
      select: {
        id: true,
        clienteId: true,
        fechaInicio: true,
        fechaFin: true,
        version: true,
      },
    });

    if (!existente || existente.clienteId !== clienteId) {
      throw new Error("NOT_FOUND");
    }

    if (existente.version !== data.version) {
      throw new Error("MEMBRESIA_CONFLICTO");
    }

    const nuevasFechas = {
      fechaInicio: data.fechaInicio ?? existente.fechaInicio,
      fechaFin: data.fechaFin ?? existente.fechaFin,
    };

    if (nuevasFechas.fechaInicio > nuevasFechas.fechaFin) {
      throw new Error("VALIDATION_ERROR");
    }

    const otrosPeriodos = await tx.membresiaGym.findMany({
      where: { clienteId, id: { not: membresiaId } },
      select: { fechaInicio: true, fechaFin: true },
    });

    if (
      hasOverlap(otrosPeriodos, nuevasFechas.fechaInicio, nuevasFechas.fechaFin)
    ) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const nuevaVersion = existente.version + 1;

    // Escritura condicional (lock optimista): solo escribe quien lee la misma
    // version. Si otra escritura gano la carrera, count !== 1 y no hay nada que
    // deshacer porque esta transaccion aborta sin escribir.
    const escritura = await tx.membresiaGym.updateMany({
      where: {
        id: membresiaId,
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
      throw new Error("MEMBRESIA_CONFLICTO");
    }

    await registrarCambio(tx, {
      membresiaId,
      actorId,
      accion: "EDICION",
      version: nuevaVersion,
      fechaInicioAnterior: existente.fechaInicio,
      fechaFinAnterior: existente.fechaFin,
      fechaInicioNueva: nuevasFechas.fechaInicio,
      fechaFinNueva: nuevasFechas.fechaFin,
    });

    const completa = await tx.membresiaGym.findUnique({
      where: { id: membresiaId },
      include: includeCompleto,
    });

    return toDTO(completa!, hoy);
  });
}

// ─── INC-02 (HU-15 + ampliacion DEC-024): congelar / descongelar / editar ─────

/** Contrato de las tres operaciones de pausa (DEC-017: las llama la ruta). */
export type DatosCongelacion = {
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  version: number;
};

export type DatosDescongelar = {
  version: number;
  motivo?: string;
};

export type RespuestaPausa = MembresiaDTO & {
  fechaFinAnterior: string;
  diasCongelados?: number;
  diasCongeladosAnterior?: number;
  diasDevueltos?: number;
  congelacion: {
    fechaInicio: string;
    fechaFin: string;
    motivo: string;
    diasCongelados: number;
  } | null;
};

type VigenciaPausa = {
  id: string;
  clienteId: string;
  fechaInicio: string;
  fechaFin: string;
  version: number;
};

/**
 * Carga la vigencia y aplica los 4 primeros guardas del orden deterministico
 * del contrato INC-02 (identicos para congelar, descongelar y editar):
 * `404 NOT_FOUND` (ownership) -> `409 MEMBRESIA_CONFLICTO` (lock optimista
 * INC00-MEM-03) -> `409 CONGELACION_NO_PERMITIDA` (tipo, DEC-023) ->
 * `409 MEMBRESIA_VENCIDA` (DEC-022).
 */
async function cargarVigenciaParaPausa(
  tx: Prisma.TransactionClient,
  clienteId: string,
  vigenciaId: string,
  version: number,
  hoy: string
) {
  const vigencia = await tx.membresiaGym.findUnique({
    where: { id: vigenciaId },
    include: includeCompleto,
  });

  if (!vigencia || vigencia.clienteId !== clienteId) {
    throw new Error("NOT_FOUND");
  }
  if (vigencia.version !== version) {
    throw new Error("MEMBRESIA_CONFLICTO");
  }
  if (!TIPOS_CONGELABLES.has(vigencia.tipoServicio)) {
    throw new Error("CONGELACION_NO_PERMITIDA");
  }
  if (hoy > vigencia.fechaFin) {
    throw new Error("MEMBRESIA_VENCIDA");
  }

  return vigencia;
}

/**
 * Escritura comun de toda operacion de pausa, DENTRO de la transaccion:
 * `updateMany` condicional sobre `version` (exactamente una escritura gana la
 * carrera) + fila de auditoria con `version` N+1, igual que `editarMembresia`
 * (INC00-MEM-03 / INC00-MEM-04). Si la fila de auditoria choca contra
 * `@@unique([membresiaId, version])`, `registrarCambio` aborta con
 * `MEMBRESIA_CONFLICTO` y nada de la transaccion queda persistido.
 */
async function escribirOperacionPausa(
  tx: Prisma.TransactionClient,
  args: {
    vigencia: VigenciaPausa;
    actorId: string;
    accion: string;
    rango: { inicio: string; fin: string };
    motivo: string | null;
    fechaFinNueva: string;
  },
  hoy: string
): Promise<MembresiaDTO> {
  const nuevaVersion = args.vigencia.version + 1;

  const escritura = await tx.membresiaGym.updateMany({
    where: {
      id: args.vigencia.id,
      clienteId: args.vigencia.clienteId,
      version: args.vigencia.version,
    },
    data: {
      fechaFin: args.fechaFinNueva,
      actualizadoPorId: args.actorId,
      version: nuevaVersion,
      updatedAt: new Date(),
    },
  });

  if (escritura.count !== 1) {
    throw new Error("MEMBRESIA_CONFLICTO");
  }

  await registrarCambio(tx, {
    membresiaId: args.vigencia.id,
    actorId: args.actorId,
    accion: args.accion,
    version: nuevaVersion,
    motivo: args.motivo,
    congelacionInicio: args.rango.inicio,
    congelacionFin: args.rango.fin,
    fechaInicioAnterior: args.vigencia.fechaInicio,
    fechaFinAnterior: args.vigencia.fechaFin,
    fechaInicioNueva: args.vigencia.fechaInicio,
    fechaFinNueva: args.fechaFinNueva,
  });

  const completa = await tx.membresiaGym.findUnique({
    where: { id: args.vigencia.id },
    include: includeCompleto,
  });
  if (!completa) throw new Error("NOT_FOUND");

  return toDTO(completa, hoy);
}

/**
 * `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` (HU-15).
 *
 * Orden de evaluacion (spec INC-02): 404 -> 409 `MEMBRESIA_CONFLICTO` ->
 * `CONGELACION_NO_PERMITIDA` (tipo) -> `MEMBRESIA_VENCIDA` ->
 * `CONGELACION_NO_PERMITIDA` (rango contenido) -> `MEMBRESIA_SOLAPADA` (solape
 * con otra pausa) -> `MEMBRESIA_SOLAPADA` (choque de la extension con un
 * periodo posterior). Efecto: `fechaFin += N` dias completos inclusivos
 * (America/Bogota, DEC-005/DEC-006) + fila `CONGELACION` en la misma
 * transaccion. Sin bloqueo de acceso (DEC-025).
 */
export async function congelarVigencia(
  clienteId: string,
  vigenciaId: string,
  data: DatosCongelacion,
  actorId: string
): Promise<RespuestaPausa> {
  const hoy = getTodayBogota();
  assertFechaEditable(data.fechaInicio);
  assertFechaEditable(data.fechaFin);

  return prisma.$transaction(async (tx) => {
    const vigencia = await cargarVigenciaParaPausa(
      tx,
      clienteId,
      vigenciaId,
      data.version,
      hoy
    );

    // DEC-022 a: el rango de la pausa debe estar contenido en la vigencia.
    if (
      data.fechaInicio < vigencia.fechaInicio ||
      data.fechaFin > vigencia.fechaFin
    ) {
      throw new Error("CONGELACION_NO_PERMITIDA_RANGO");
    }

    // DEC-008: no puede solaparse con otra pausa vigente de la misma vigencia
    // (los gaps entre pausas si estan permitidos).
    const pausas = rangosComoPeriodos(pausasActivas(vigencia.cambios));
    if (hasOverlap(pausas, data.fechaInicio, data.fechaFin)) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const dias = diasInclusivos(data.fechaInicio, data.fechaFin);
    const fechaFinNueva = sumarDias(vigencia.fechaFin, dias);

    // DEC-008: la extension no puede hacer chocar la vigencia con un periodo
    // posterior del mismo cliente (se evalua antes de escribir nada: atomico).
    const otrosPeriodos = await tx.membresiaGym.findMany({
      where: { clienteId, id: { not: vigenciaId } },
      select: { fechaInicio: true, fechaFin: true },
    });
    if (hasOverlap(otrosPeriodos, vigencia.fechaInicio, fechaFinNueva)) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const dto = await escribirOperacionPausa(
      tx,
      {
        vigencia,
        actorId,
        accion: "CONGELACION",
        rango: { inicio: data.fechaInicio, fin: data.fechaFin },
        motivo: data.motivo,
        fechaFinNueva,
      },
      hoy
    );

    return {
      ...dto,
      fechaFinAnterior: vigencia.fechaFin,
      diasCongelados: dias,
      congelacion: {
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        motivo: data.motivo,
        diasCongelados: dias,
      },
    };
  });
}

/**
 * `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar` (DEC-024).
 *
 * Formula ratificada: `diasDevueltos = max(0, finRango - max(hoy, inicioRango)
 * + 1)`; `fechaFin -= diasDevueltos`. Los dias ya consumidos permanecen
 * descontados. `diasDevueltos = 0` (pausa terminada, ya descongelada o nunca
 * congelada) -> `409 CONGELACION_INEXISTENTE`. `MEMBRESIA_SOLAPADA` no aplica:
 * decrementar `fechaFin` nunca crea un solape. Escribe fila `DESCONGELACION`
 * con el rango de la pausa y `motivo` opcional (null si no viaja).
 */
export async function descongelarVigencia(
  clienteId: string,
  vigenciaId: string,
  data: DatosDescongelar,
  actorId: string
): Promise<RespuestaPausa> {
  const hoy = getTodayBogota();

  return prisma.$transaction(async (tx) => {
    const vigencia = await cargarVigenciaParaPausa(
      tx,
      clienteId,
      vigenciaId,
      data.version,
      hoy
    );

    const pausa = pausaVigente(vigencia.cambios);
    const restantes = pausa
      ? diasDevueltos(pausa.congelacionInicio, pausa.congelacionFin, hoy)
      : 0;
    if (!pausa || restantes === 0) {
      throw new Error("CONGELACION_INEXISTENTE");
    }

    const fechaFinNueva = sumarDias(vigencia.fechaFin, -restantes);

    const dto = await escribirOperacionPausa(
      tx,
      {
        vigencia,
        actorId,
        accion: "DESCONGELACION",
        rango: {
          inicio: pausa.congelacionInicio,
          fin: pausa.congelacionFin,
        },
        motivo: data.motivo ?? null,
        fechaFinNueva,
      },
      hoy
    );

    return {
      ...dto,
      fechaFinAnterior: vigencia.fechaFin,
      diasDevueltos: restantes,
      congelacion: null,
    };
  });
}

/**
 * `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion` (DEC-024).
 *
 * Clave de la edicion: primero se revierte `N_anterior` EN MEMORIA y con la
 * fila revertida `[fechaInicio, fechaFin - N_anterior]` se ejecutan las MISMAS
 * reglas de congelar sobre el rango nuevo; despues se aplica `N_nuevo`
 * (`fechaFin' = fechaFin - N_anterior + N_nuevo`). Siempre redeclara el rango
 * -> `motivo` obligatorio (mismo schema que congelar) y escribe fila
 * `EDICION_CONGELACION`.
 */
export async function editarCongelacion(
  clienteId: string,
  vigenciaId: string,
  data: DatosCongelacion,
  actorId: string
): Promise<RespuestaPausa> {
  const hoy = getTodayBogota();
  assertFechaEditable(data.fechaInicio);
  assertFechaEditable(data.fechaFin);

  return prisma.$transaction(async (tx) => {
    const vigencia = await cargarVigenciaParaPausa(
      tx,
      clienteId,
      vigenciaId,
      data.version,
      hoy
    );

    const pausa = pausaVigente(vigencia.cambios);
    const restantes = pausa
      ? diasDevueltos(pausa.congelacionInicio, pausa.congelacionFin, hoy)
      : 0;
    if (!pausa || restantes === 0) {
      throw new Error("CONGELACION_INEXISTENTE");
    }

    const diasAnteriores = diasInclusivos(
      pausa.congelacionInicio,
      pausa.congelacionFin
    );
    const diasNuevos = diasInclusivos(data.fechaInicio, data.fechaFin);

    // Fila revertida: con ella se validan las MISMAS reglas de congelar.
    const fechaFinRev = sumarDias(vigencia.fechaFin, -diasAnteriores);

    if (
      data.fechaInicio < vigencia.fechaInicio ||
      data.fechaFin > fechaFinRev
    ) {
      throw new Error("CONGELACION_NO_PERMITIDA_RANGO");
    }

    // Solape con OTRAS pausas: la que se edita queda excluida (DEC-008).
    const otrasPausas = rangosComoPeriodos(
      pausasActivas(vigencia.cambios).filter(
        (rango) =>
          !(
            rango.congelacionInicio === pausa.congelacionInicio &&
            rango.congelacionFin === pausa.congelacionFin
          )
      )
    );
    if (hasOverlap(otrasPausas, data.fechaInicio, data.fechaFin)) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const fechaFinNueva = sumarDias(fechaFinRev, diasNuevos);

    const otrosPeriodos = await tx.membresiaGym.findMany({
      where: { clienteId, id: { not: vigenciaId } },
      select: { fechaInicio: true, fechaFin: true },
    });
    if (hasOverlap(otrosPeriodos, vigencia.fechaInicio, fechaFinNueva)) {
      throw new Error("MEMBRESIA_SOLAPADA");
    }

    const dto = await escribirOperacionPausa(
      tx,
      {
        vigencia,
        actorId,
        accion: "EDICION_CONGELACION",
        rango: { inicio: data.fechaInicio, fin: data.fechaFin },
        motivo: data.motivo,
        fechaFinNueva,
      },
      hoy
    );

    return {
      ...dto,
      fechaFinAnterior: vigencia.fechaFin,
      diasCongelados: diasNuevos,
      diasCongeladosAnterior: diasAnteriores,
      congelacion: {
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        motivo: data.motivo,
        diasCongelados: diasNuevos,
      },
    };
  });
}
