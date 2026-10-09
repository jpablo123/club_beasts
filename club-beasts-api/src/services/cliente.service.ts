import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { calcularEstado, getTodayBogota } from "./membresia.service.js";

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
 * El listado (`searchClientes`) sigue usando `selectCliente` sin la relacion
 * para no pagar el costo de traer periodos por cada fila.
 */
const selectFichaCliente = {
  ...selectCliente,
  membresias: {
    select: { id: true, fechaInicio: true, fechaFin: true },
    orderBy: { fechaInicio: "desc" as const },
  },
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

  return prisma.cliente.update({
    where: { id },
    data: {
      ...data,
      email: normalizeLimpieza(data.email),
      observaciones: normalizeLimpieza(data.observaciones),
      ...(actorId ? { actualizadoPorId: actorId } : {}),
    },
    select: selectCliente,
  });
}

/**
 * INC01-FIC-02 (G4): la ficha expone `membresias` con el estado calculado con
 * la MISMA regla del modulo de membresias (`calcularEstado` sobre el calendario
 * America/Bogota de `getTodayBogota`, extremos inclusivos). No se duplica la
 * logica de zona horaria: se reutiliza el helper existente.
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
      estado: calcularEstado(membresia.fechaInicio, membresia.fechaFin, hoy),
    })),
  };
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
