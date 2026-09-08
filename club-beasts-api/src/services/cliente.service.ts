import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

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
  email?: string;
  sedeId?: string;
  estado?: string;
  observaciones?: string;
}

export async function createCliente(data: CreateClienteInput) {
  const defaultPin = "1234";
  const hashedPin = await bcrypt.hash(defaultPin, 10);

  return prisma.cliente.create({
    data: {
      ...data,
      pin: hashedPin,
      estado: "NUEVO",
    },
  });
}

export async function updateCliente(id: string, data: UpdateClienteInput) {
  return prisma.cliente.update({
    where: { id },
    data,
  });
}

export async function getClienteById(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: { sede: true },
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
      include: { sede: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.count({ where }),
  ]);

  return { clientes, total, page, limit, pages: Math.ceil(total / limit) };
}
