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
  observaciones?: string | null;
}

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

export async function updateCliente(id: string, data: UpdateClienteInput, actorId?: string) {
  if (data.sedeId !== undefined) {
    await assertSedeExiste(data.sedeId);
  }

  // INC-03 (DEC-033): si el PATCH toca `email` y el valor resultante NO esta
  // vacio, el cliente deja de tener perfil rapido pendiente. Un PATCH sin
  // `email` (o con email vacio -> null) conserva la marca tal cual.
  const emailNormalizado = normalizeLimpieza(data.email);
  const limpiaPerfilPendiente = data.email !== undefined && Boolean(emailNormalizado);

  return prisma.cliente.update({
    where: { id },
    data: {
      ...data,
      email: emailNormalizado,
      observaciones: normalizeLimpieza(data.observaciones),
      ...(limpiaPerfilPendiente ? { perfilPendiente: false } : {}),
      ...(actorId ? { actualizadoPorId: actorId } : {}),
    },
    select: selectClienteUpdate,
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
