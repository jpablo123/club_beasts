import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { getTodayBogota, resolverEstadoAcceso } from "./membresia.service.js";

interface CreateClienteInput {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string;
  sedeId: string;
  observaciones?: string;
}

interface UpdateClienteInput {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  email?: string | null;
  sedeId?: string;
  estado?: string;
  /** INC-04 (DEC-035): motivo del cambio de estado (3-200). Nunca se
   * persiste en `Cliente`; la fuente unica es `ClienteEstadoCambio`. */
  motivo?: string;
  observaciones?: string | null;
}

/**
 * INC-04 (HU-17 b1 derivado / HU17-C04, DEC-038): codigo de error de negocio
 * cuando la transicion de estado no esta en la matriz ratificada. La ruta
 * /clientes lo traduce a 409 con el mensaje fijado en el spec
 * ("Transicion de estado no permitida").
 */
export const TRANSICION_INVALIDA = "TRANSICION_INVALIDA";

/**
 * INC-04 (DEC-038, matriz ratificada 5x5 del spec de INC-04):
 *   - NUEVO -> ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO
 *   - ACTIVO <-> SUSPENDIDO
 *   - * -> RETIRADO (incluido INACTIVO) e * -> INACTIVO (excepto desde RETIRADO)
 *   - INACTIVO -> ACTIVO (DEC-020, reactivacion)
 *   - RETIRADO es terminal: sin salidas
 * La diagonal (`desde === hacia`) no esta en la matriz: es no-op 200 sin
 * registro (CONF-02) y el servicio la resuelve ANTES de mirar esta tabla.
 * `src/` no puede importar G14; es el espejo exacto de
 * `features/acceptance-criteria/HU-17-schemas.ts:287-296`.
 */
const TRANSICIONES_ESTADO_CLIENTE: Record<
  string,
  Partial<Record<string, boolean>>
> = {
  NUEVO: { ACTIVO: true, SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  ACTIVO: { SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  SUSPENDIDO: { ACTIVO: true, RETIRADO: true, INACTIVO: true },
  RETIRADO: {}, // terminal (DEC-038): no se reactiva ni se cambia
  INACTIVO: { ACTIVO: true, RETIRADO: true }, // DEC-020 + "* -> RETIRADO"
};

const selectCliente = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  email: true,
  sedeId: true,
  estado: true,
  observaciones: true,
  debeCambiarPin: true,
  createdAt: true,
  updatedAt: true,
  // INC01-TRZ-01/02 (G2): solo los IDS del usuario interno. Sin relacion a
  // User (ni email ni nombre): no rompe SEC-03 ni fuga datos.
  creadoPorId: true,
  actualizadoPorId: true,
  sede: { select: { id: true, nombre: true } },
};

/**
 * INC01-FIC-02 (G4): select de la FICHA (`GET /clientes/:id`). Amplia el
 * select compartido con la relacion `membresias` (periodos del cliente).
 *
 * INC-03 (VEN-05 / DEC-032): agrega `perfilPendiente` y, por cada vigencia,
 * `tipoServicio` + la secuencia `cambios` (solo filas de pausa) para que la
 * ficha calcule el estado con la MISMA fuente unica (`resolverEstadoAcceso`)
 * que listado, portal y recepcion. La secuencia NO se expone en la respuesta
 * (se consumes en `getClienteById`); `selectCliente` (listado) sigue sin la
 * relacion para no pagar el costo de traer periodos por cada fila.
 */
const selectFichaCliente = {
  ...selectCliente,
  perfilPendiente: true,
  membresias: {
    select: {
      id: true,
      fechaInicio: true,
      fechaFin: true,
      tipoServicio: true,
      cambios: {
        select: {
          accion: true,
          version: true,
          congelacionInicio: true,
          congelacionFin: true,
        },
        orderBy: { version: "asc" as const },
      },
    },
    orderBy: { fechaInicio: "desc" as const },
  },
};

/**
 * INC-03 (RAP-03 / UI contract de `AltaClienteRapido`): select de la
 * respuesta del PATCH /clientes/:id. Extiende `selectCliente` con
 * `perfilPendiente` (DEC-032/033: el front pinta "Completado" cuando la
 * marca baja a false tras recibir email) y la relacion
 * `creadoPor { id, nombre }` que lee `AltaClienteRapido` al completar el
 * perfil (precedente HU-05: nombre del staff, sin email ni credenciales).
 *
 * Solo staff (DUENO/RECEPCIONISTA) consume el PATCH; `selectCliente`
 * (listado/POST) y la ficha de CLIENTE quedan intactos.
 */
const selectClienteUpdate = {
  ...selectCliente,
  perfilPendiente: true,
  creadoPor: { select: { id: true, nombre: true } },
};

/**
 * INC-03 (HU-31): select del cliente creado por el flujo rapido de recepcion
 * (`POST /recepcion/clientes-rapidos`). Incluye `perfilPendiente` (DEC-032) y
 * las relaciones `sede`/`creadoPor` que exige el schema G14
 * `clienteRapidoResponseSchema`. Sin PIN ni credenciales.
 */
const selectClienteRapido = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  email: true,
  estado: true,
  perfilPendiente: true,
  observaciones: true,
  sede: { select: { id: true, nombre: true } },
  creadoPor: { select: { id: true, nombre: true } },
};

/**
 * INC00-CLI-01: codigo de error de negocio cuando la sede referenciada no
 * existe. Se lanza antes de persistir para evitar que la violacion de la
 * foreign key de Prisma (P2003) escape como 500 con el detalle interno del
 * motor (ruta de archivo, fragmento de consulta, codigo de restriccion).
 *
 * La ruta /clientes lo traduce a 400 VALIDATION_ERROR.
 */
export const SEDE_INEXISTENTE = "SEDE_INEXISTENTE";

/** Valida que la sede exista antes de escribir el cliente. */
async function assertSedeExiste(sedeId: string): Promise<void> {
  const sede = await prisma.sede.findUnique({
    where: { id: sedeId },
    select: { id: true },
  });
  if (!sede) {
    throw new Error(SEDE_INEXISTENTE);
  }
}

export async function createCliente(data: CreateClienteInput, actorId?: string) {
  await assertSedeExiste(data.sedeId);

  const defaultPin = "1234";
  const hashedPin = await bcrypt.hash(defaultPin, 10);

  return prisma.cliente.create({
    data: {
      ...data,
      pin: hashedPin,
      estado: "NUEVO",
      debeCambiarPin: true,
      creadoPorId: actorId ?? null,
      actualizadoPorId: actorId ?? null,
    },
    select: selectCliente,
  });
}

/**
 * INC00-CLI-03: limpieza intencional de opcionales.
 * `""` (o string en blanco) persiste como `null`; `null` persiste como `null`;
 * campo omitido (`undefined`) no genera cambio.
 */
function normalizeLimpieza(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim() === "" ? null : value;
}

/**
 * INC-04 (HU-08 b3 / HU-17 b2, DEC-035 + DEC-036 + DEC-038): actualizacion
 * del cliente CON cambio de estado trazable. Orden CONF-03 del endpoint #1
 * (el 401/403 preHandler y el 400 de params/ body los resuelve la ruta):
 *   404 (ya resuelto por la ruta) -> 409 TRANSICION_INVALIDA (matriz
 *   ratificada, sin escritura) -> 400 sedeId inexistente / 409 DUPLICATE
 *   (P2002) -> 200.
 *
 * Escritura atomica (HU08-C03): el update del cliente y el registro de
 * historial en `ClienteEstadoCambio` ocurren dentro del MISMO
 * `prisma.$transaction`; si algo falla no queda ni el estado nuevo ni la fila.
 *
 * Reglas:
 *  - `motivo` (3-200, ya validado por Zod en la ruta) se persiste SOLO en el
 *    registro de historial; jamas en una columna de `Cliente` (una sola
 *    fuente, DEC-036).
 *  - `estado` igual al actual -> no-op 200: update de los demas campos sin
 *    registro nuevo y sin `ultimoCambio` (CONF-02).
 *  - `motivo` sin `estado` (CONF-07) no escribe historial: aqui simplemente
 *    no hay rama de estado.
 *  - La respuesta agrega `motivo` (del ultimo cambio; si el request traia
 *    `motivo` sin cambio persistible, el viajero) y `ultimoCambio` SOLO
 *    cuando hubo cambio de estado (aditivo, incompatibilidad #2 del spec).
 */
export async function updateCliente(
  id: string,
  data: UpdateClienteInput,
  actorId?: string
) {
  // El motivo viajero nunca llega a `prisma.cliente.update` (no existe la
  // columna): se separa aqui y se usa unicamente para el historial/respuesta.
  const { motivo, ...campos } = data;

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id },
      select: { estado: true },
    });

    let ultimoCambio: {
      id: string;
      clienteId: string;
      estadoAnterior: string | null;
      estadoNuevo: string;
      motivo: string;
      actor: { id: string; nombre: string };
      createdAt: string;
    } | null = null;

    const cambiaEstado = data.estado !== undefined &&
      cliente !== null &&
      data.estado !== cliente.estado;

    if (data.estado !== undefined && cliente !== null && cambiaEstado) {
      // 409 (CONF-03): la matriz se evalua con el estado ya leido (tras el
      // 404 de la ruta) y ANTES de sedeId/DUPLICATE; sin escritura.
      const permitida = TRANSICIONES_ESTADO_CLIENTE[cliente.estado]?.[
        data.estado
      ];
      if (!permitida) {
        throw new Error(TRANSICION_INVALIDA);
      }
    }

    if (data.sedeId !== undefined) {
      await assertSedeExiste(data.sedeId);
    }

    // INC-03 (DEC-033): si el PATCH toca `email` y el valor resultante NO esta
    // vacio, el cliente deja de tener perfil rapido pendiente. Un PATCH sin
    // `email` (o con email vacio -> null) conserva la marca tal cual.
    const emailNormalizado = normalizeLimpieza(data.email);
    const limpiaPerfilPendiente = data.email !== undefined && Boolean(emailNormalizado);

    const actualizado = await tx.cliente.update({
      where: { id },
      data: {
        ...campos,
        email: emailNormalizado,
        observaciones: normalizeLimpieza(data.observaciones),
        ...(limpiaPerfilPendiente ? { perfilPendiente: false } : {}),
        ...(actorId ? { actualizadoPorId: actorId } : {}),
      },
      select: selectClienteUpdate,
    });

    if (cambiaEstado && data.estado !== undefined) {
      // `actorId` siempre viene del JWT de staff en la ruta PATCH; el registro
      // de historial lo exige HU08-C03 (quien realizo el cambio).
      const fila = await tx.clienteEstadoCambio.create({
        data: {
          clienteId: id,
          estadoAnterior: cliente!.estado,
          estadoNuevo: data.estado,
          motivo: motivo!,
          actorId: actorId!,
        },
        include: { actor: { select: { id: true, nombre: true } } },
      });

      ultimoCambio = {
        id: fila.id,
        clienteId: fila.clienteId,
        estadoAnterior: fila.estadoAnterior,
        estadoNuevo: fila.estadoNuevo,
        motivo: fila.motivo,
        // Precedente `Ingreso.createdAt.toISOString()` (recepcion.ts:284).
        actor: { id: fila.actor.id, nombre: fila.actor.nombre },
        createdAt: fila.createdAt.toISOString(),
      };
    }

    // `motivo` de la respuesta: derivado del ultimo cambio (una sola fuente,
    // DEC-036); el motivo viajero solo pinta cuando no hay cambio que
    // persistir (no-op CONF-02) y aun asi NUNCA se escribe en BD.
    let motivoRespuesta: string | null = ultimoCambio?.motivo ?? null;
    if (motivoRespuesta === null && motivo !== undefined) {
      motivoRespuesta = motivo;
    }
    if (motivoRespuesta === null) {
      const ultimaFila = await tx.clienteEstadoCambio.findFirst({
        where: { clienteId: id },
        orderBy: { createdAt: "desc" },
        select: { motivo: true },
      });
      motivoRespuesta = ultimaFila?.motivo ?? null;
    }

    return {
      ...actualizado,
      motivo: motivoRespuesta,
      // Aditivo: presente SOLO cuando hubo cambio de estado (CONF-02);
      // `undefined` desaparece del JSON y el campo queda ausente.
      ...(ultimoCambio ? { ultimoCambio } : {}),
    };
  });
}

/**
 * INC-04 (CONF-05, endpoint #2): ultimo registro de historial del cliente
 * (mas reciente primero) para derivar el `motivo` de la ficha. Sin endpoint
 * nuevo de historial: la ficha expone SOLO el motivo del ultimo cambio.
 */
export async function getUltimoCambioEstado(clienteId: string) {
  return prisma.clienteEstadoCambio.findFirst({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, nombre: true } } },
  });
}

/**
 * INC01-FIC-02 (G4) + INC-03 (VEN-05): la ficha expone `membresias` con el
 * estado calculado por la FUENTE UNICA del modulo (`resolverEstadoAcceso`:
 * `calcularEstado` + pausas de la secuencia `cambios`, America/Bogota via
 * `getTodayBogota`, extremos inclusivos). La ficha ya no puede contradecir al
 * listado en una vigencia CONGELADO (divergencia que cerraba VEN-05).
 */
export async function getClienteById(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: selectFichaCliente,
  });
  if (!cliente) return cliente;

  const hoy = getTodayBogota();
  return {
    ...cliente,
    membresias: cliente.membresias.map((membresia) => ({
      id: membresia.id,
      fechaInicio: membresia.fechaInicio,
      fechaFin: membresia.fechaFin,
      tipoServicio: membresia.tipoServicio,
      estado: resolverEstadoAcceso(membresia, membresia.cambios, hoy)
        .estadoAccesoGym,
    })),
  };
}

/**
 * INC-03 (HU-31 / DEC-032): creacion rapida desde recepcion. Reutiliza el
 * precedente HU-04 (`createCliente`: PIN por defecto hasheado, sede
 * pre-validada) con dos diferencias: marca `perfilPendiente: true` y select
 * propio (`selectClienteRapido`) que incluye `perfilPendiente` y las
 * relaciones `sede`/`creadoPor` del schema G14.
 */
export async function createClienteRapido(
  data: CreateClienteInput,
  actorId: string
) {
  await assertSedeExiste(data.sedeId);

  const defaultPin = "1234";
  const hashedPin = await bcrypt.hash(defaultPin, 10);

  return prisma.cliente.create({
    data: {
      ...data,
      pin: hashedPin,
      estado: "NUEVO",
      debeCambiarPin: true,
      perfilPendiente: true,
      creadoPorId: actorId,
      actualizadoPorId: actorId,
    },
    select: selectClienteRapido,
  });
}

export async function searchClientes(query: {
  search?: string;
  sedeId?: string;
  estado?: string;
  page?: number;
  limit?: number;
}) {
  const { search, sedeId, estado, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { cedula: { contains: search } },
      { nombres: { contains: search } },
      { apellidos: { contains: search } },
    ];
  }
  if (sedeId) where.sedeId = sedeId;
  if (estado) where.estado = estado;

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: selectCliente,
    }),
    prisma.cliente.count({ where }),
  ]);

  return { clientes, total, page, limit, pages: Math.ceil(total / limit) };
}
