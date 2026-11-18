import prisma from "../lib/prisma.js";
import { isPrismaCode } from "../lib/errors.js";
import {
  estadoAsignacionPorFechaFin,
  esVisibleRutinaPersonalizada,
  puedeActivarRutina,
  SIN_RUTINA_MENSAJE,
  type EstadoVigenciaPersonalizado,
  type RutinaAsignacion,
  type RutinaPortal,
  type RutinaPortalBase,
  type TIPO_RUTINA_PORTAL,
} from "../schemas/rutina.schema.js";
import {
  contenidoCreateCompleto,
  ErrorNegocio,
  estadoVigenciaPersonalizada,
} from "./rutina.service.js";
import { getTodayBogota } from "./membresia.service.js";

/**
 * INC-10 (HU-20/21/26 + R5/R6/R7) — asignacion, historial, estado de la
 * activa y portal.
 *
 * Reglas del servicio (contrato API RATIFICADO del spec INC-10):
 *  - Orden de errores endpoint 5 (R8/DEC-070): 404 CLIENTE_NO_ENCONTRADO ->
 *    404 RUTINA_NO_ENCONTRADA -> 409 CLIENTE_INACTIVO (DEC-069: solo NUEVO/
 *    ACTIVO reciben rutinas; SUSPENDIDO/RETIRADO/INACTIVO -> 409) -> 409
 *    SIN_VIGENCIA_PERSONALIZADA (DEC-066, solo PERSONALIZADA) -> 409
 *    RUTINA_YA_ACTIVA -> 409 ASIGNACION_CONFLICTO -> 201. La validacion
 *    401/403/400 params/400 body la hace la ruta ANTES de entrar aqui.
 *  - HU-21 c3 / RU-31: al asignar una nueva, la activa previa se cierra con
 *    `fechaFin = fechaInicio` de la nueva (regla canonica
 *    `cerrarAsignacionActiva`), y se limpia `activaClave = null` en la MISMA
 *    transaccion (INC00-MEM-02).
 *  - R7/INC00-MEM-03: la VERIFICACION (cliente/rutina/estado/vigencia/
 *    ya-activa + lectura de la activa a cerrar) ocurre ANTES de la
 *    transaccion; la transaccion (a) cierra SOLO la activa verificada (update
 *    condicional `fechaFin: null` -> si otra escritura la cerro primero,
 *    count !== 1 -> ASIGNACION_CONFLICTO) y (b) crea la nueva con el arbitro
 *    portable `activaClave = clienteId` (unico): un P2002 de la carrera se
 *    traduce en 409 ASIGNACION_CONFLICTO SIN pisar al ganador (la transaccion
 *    aborta completa). C1/C2 del RED lo fijan.
 *  - R6/DEC-067: `contenidoSnapshot` = "payload create completo" del contenido
 *    vigente, capturado DENTRO de la transaccion de la asignacion; TODO
 *    consumo de contenido (portal/historial/activa) lee desde el snapshot.
 *    Un PATCH de la rutina solo afecta asignaciones futuras (RU-33).
 *  - DEC-066: la ocultacion (endpoint 7/8) NUNCA borra la asignacion; el
 *    estado `ACTIVA|SIN_RUTINA|OCULTA_POR_VIGENCIA` se deriva con la fuente
 *    unica `estadoVigenciaPersonalizada`.
 *  - HU-26 c1 (SEC-01/SEC-03): el portal es self-only (clienteId del token) y
 *    el DTO viaja SIN `actor`/`actualizadoPor`.
 */

const includeAsignacion = {
  rutina: { select: { id: true, nombre: true, tipoRutina: true, descripcion: true } },
  actor: { select: { id: true, nombre: true } },
} as const;

type FilaAsignacion = {
  id: string;
  clienteId: string;
  rutinaId: string;
  fechaInicio: string;
  fechaFin: string | null;
  contenidoSnapshot: string;
  rutina: { id: string; nombre: string; tipoRutina: string; descripcion: string | null };
  actor: { id: string; nombre: string };
};

/** DTO del canonico `rutinaAsignacionSchema` (orden de claves del canonico). */
function aAsignacionDTO(fila: FilaAsignacion): RutinaAsignacion {
  return {
    id: fila.id,
    clienteId: fila.clienteId,
    rutina: {
      id: fila.rutina.id,
      nombre: fila.rutina.nombre,
      tipoRutina: fila.rutina.tipoRutina as RutinaAsignacion["rutina"]["tipoRutina"],
      descripcion: fila.rutina.descripcion ?? null,
    },
    fechaInicio: fila.fechaInicio,
    fechaFin: fila.fechaFin ?? null,
    estado: estadoAsignacionPorFechaFin(fila.fechaFin),
    actor: { id: fila.actor.id, nombre: fila.actor.nombre },
    contenidoSnapshot: JSON.parse(fila.contenidoSnapshot),
  };
}

// ─── Existencia del cliente (404 CLIENTE_NO_ENCONTRADO, DEC-070) ────────────

/** Guarda 404 de los endpoints 6/7 (el endpoint 5 la resuelve en su escalera). */
export async function existeCliente(clienteId: string): Promise<void> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  if (!cliente) {
    throw new ErrorNegocio("CLIENTE_NO_ENCONTRADO");
  }
}

// ─── POST /clientes/:clienteId/rutinas/asignacion (endpoint 5) ──────────────

/**
 * Asigna la rutina al cliente con la invariante 0-1 activas (RU-21/RU-35).
 * Ver el bloque de reglas R7 del header: verificacion previa + transaccion
 * con cierre condicional de la activa verificada + arbitro `activaClave`.
 */
export async function asignarRutina(
  clienteId: string,
  rutinaId: string,
  fechaInicio: string | undefined,
  actorId: string
): Promise<RutinaAsignacion> {
  // ── Verificacion (orden R8/DEC-070) — ANTES de la transaccion (INC00-MEM-03)
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true },
  });
  if (!cliente) {
    throw new ErrorNegocio("CLIENTE_NO_ENCONTRADO");
  }

  const rutina = await prisma.rutina.findUnique({
    where: { id: rutinaId },
    select: { id: true, tipoRutina: true },
  });
  if (!rutina) {
    throw new ErrorNegocio("RUTINA_NO_ENCONTRADA");
  }

  // DEC-069: solo NUEVO/ACTIVO reciben rutinas.
  if (cliente.estado !== "NUEVO" && cliente.estado !== "ACTIVO") {
    throw new ErrorNegocio("CLIENTE_INACTIVO");
  }

  // DEC-066: la personalizada exige vigencia ACTIVA al momento del cambio;
  // este chequeo PRECEDE a RUTINA_YA_ACTIVA (edge fijado RU-28).
  if (rutina.tipoRutina === "PERSONALIZADA") {
    const estadoVigencia = await estadoVigenciaPersonalizada(clienteId);
    const regla = puedeActivarRutina("PERSONALIZADA", estadoVigencia);
    if (!regla.permitido) {
      throw new ErrorNegocio("SIN_VIGENCIA_PERSONALIZADA");
    }
  }

  // Verificacion de la activa a cerrar + guarda RUTINA_YA_ACTIVA.
  const activaVerificada = await prisma.rutinaAsignacion.findFirst({
    where: { clienteId, fechaFin: null },
    select: { id: true, rutinaId: true },
  });
  if (activaVerificada && activaVerificada.rutinaId === rutinaId) {
    throw new ErrorNegocio("RUTINA_YA_ACTIVA");
  }

  const inicio = fechaInicio ?? getTodayBogota();

  // ── Transaccion (INC00-MEM-02): cierre condicional + creacion con arbitro ──
  try {
    return await prisma.$transaction(async (tx) => {
      if (activaVerificada) {
        // Cierra SOLO la activa verificada y solo si sigue activa: una
        // escritura competidora que la cerro primero invalida esta
        // verificacion -> ASIGNACION_CONFLICTO (no se pisa al ganador).
        const cierre = await tx.rutinaAsignacion.updateMany({
          where: {
            id: activaVerificada.id,
            fechaFin: null,
            activaClave: clienteId,
          },
          data: {
            fechaFin: inicio, // RU-31: fechaFin = fechaInicio de la nueva
            activaClave: null, // limpieza del arbitro EN la misma transaccion
          },
        });
        if (cierre.count !== 1) {
          throw new ErrorNegocio("ASIGNACION_CONFLICTO");
        }
      }

      // DEC-067/R6: snapshot del contenido vigente en esta misma transaccion.
      const rutinaFila = await tx.rutina.findUniqueOrThrow({ where: { id: rutinaId } });
      const snapshot = JSON.stringify(contenidoCreateCompleto(rutinaFila));

      const creada = await tx.rutinaAsignacion.create({
        data: {
          clienteId,
          rutinaId,
          fechaInicio: inicio,
          actorId,
          contenidoSnapshot: snapshot,
          activaClave: clienteId, // ARBITRO 0-1 activas (INC00-MEM-03)
        },
        include: includeAsignacion,
      });
      return aAsignacionDTO(creada as unknown as FilaAsignacion);
    });
  } catch (error) {
    if (error instanceof ErrorNegocio) throw error;
    // P2002 sobre `activaClave` = otra asignacion activa gano la carrera.
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) {
      throw new ErrorNegocio("ASIGNACION_CONFLICTO");
    }
    throw error;
  }
}

// ─── GET /clientes/:clienteId/rutinas/historial (endpoint 6) ────────────────

/**
 * Historial staff (HU-21 c4): `fechaInicio` DESC (la activa arriba) y luego
 * `createdAt` DESC. Cada registro lleva `actor` + `contenidoSnapshot`
 * (DEC-068) — el snapshot NUNCA muta con ediciones posteriores (RU-33).
 */
export async function obtenerHistorial(
  clienteId: string
): Promise<{ clienteId: string; asignaciones: RutinaAsignacion[]; total: number }> {
  const filas = await prisma.rutinaAsignacion.findMany({
    where: { clienteId },
    include: includeAsignacion,
    orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
  });
  const asignaciones = filas.map((fila) => aAsignacionDTO(fila as unknown as FilaAsignacion));
  return { clienteId, asignaciones, total: asignaciones.length };
}

// ─── GET /clientes/:clienteId/rutinas/activa (endpoint 7) ───────────────────

export type EstadoRutinaActiva = "ACTIVA" | "SIN_RUTINA" | "OCULTA_POR_VIGENCIA";

/**
 * Estado de la rutina activa en la ficha (DEC-066/DEC-070): la personalizada
 * con vigencia no-ACTIVA se OCULTA (`OCULTA_POR_VIGENCIA`) SIN borrar la
 * asignacion; generica/induccion sin vigencia nunca se ocultan (RU-24).
 */
export async function obtenerActiva(clienteId: string): Promise<{
  clienteId: string;
  asignacion: RutinaAsignacion | null;
  estado: EstadoRutinaActiva;
}> {
  const activa = await prisma.rutinaAsignacion.findFirst({
    where: { clienteId, fechaFin: null },
    include: includeAsignacion,
  });
  if (!activa) {
    return { clienteId, asignacion: null, estado: "SIN_RUTINA" };
  }

  const tipoRutina = activa.rutina.tipoRutina;
  let visible = true;
  if (tipoRutina === "PERSONALIZADA") {
    const estadoVigencia: EstadoVigenciaPersonalizado =
      await estadoVigenciaPersonalizada(clienteId);
    visible = esVisibleRutinaPersonalizada(estadoVigencia);
  }
  return {
    clienteId,
    asignacion: aAsignacionDTO(activa as unknown as FilaAsignacion),
    estado: visible ? "ACTIVA" : "OCULTA_POR_VIGENCIA",
  };
}

// ─── GET /portal/rutina (endpoint 8) ───────────────────────────────────────

/**
 * Rutina activa del CLIENTE autenticado (HU-26): self-only, contenido desde
 * `contenidoSnapshot` (R6), DTO `.strict()` SIN `actor`/`actualizadoPor`
 * (SEC-01/SEC-03). Personalizada fuera de vigencia -> mensaje (oculta, sin
 * borrar). Sin activa -> `SIN_RUTINA_MENSAJE`.
 */
export async function obtenerPortalRutina(
  clienteId: string
): Promise<RutinaPortal | { mensaje: string }> {
  const activa = await prisma.rutinaAsignacion.findFirst({
    where: { clienteId, fechaFin: null },
    select: { id: true, fechaInicio: true, contenidoSnapshot: true },
  });
  if (!activa) {
    return { mensaje: SIN_RUTINA_MENSAJE };
  }

  const snapshot = JSON.parse(activa.contenidoSnapshot) as Record<string, unknown>;
  const tipoRutina = snapshot.tipoRutina as string;

  if (tipoRutina === "PERSONALIZADA") {
    const estadoVigencia = await estadoVigenciaPersonalizada(clienteId);
    if (!esVisibleRutinaPersonalizada(estadoVigencia)) {
      return { mensaje: SIN_RUTINA_MENSAJE };
    }
    return {
      tipoRutina: "PERSONALIZADA",
      asignacionId: activa.id,
      fechaInicio: activa.fechaInicio,
      nombre: snapshot.nombre as string,
      descripcion: (snapshot.descripcion as string | null) ?? null,
      informacionGeneral: snapshot.informacionGeneral as never,
      diagnostico: snapshot.diagnostico as never,
      macrociclos: snapshot.macrociclos as never,
      tests: (snapshot.tests as never[]) ?? [],
      antropometria: (snapshot.antropometria as never[]) ?? [],
      analisisBiomecanico: (snapshot.analisisBiomecanico as never[]) ?? [],
    };
  }

  return {
    tipoRutina: tipoRutina as (typeof TIPO_RUTINA_PORTAL)[number],
    asignacionId: activa.id,
    fechaInicio: activa.fechaInicio,
    nombre: snapshot.nombre as string,
    descripcion: (snapshot.descripcion as string | null) ?? null,
    objetivo: (snapshot.objetivo as string | null) ?? null,
    nivelExperiencia: (snapshot.nivelExperiencia ?? null) as RutinaPortalBase["nivelExperiencia"],
    sesiones: snapshot.sesiones as RutinaPortalBase["sesiones"],
  };
}
