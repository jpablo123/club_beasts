import prisma from "../lib/prisma.js";
import { isPrismaCode } from "../lib/errors.js";
import { ErrorNegocio } from "./rutina.service.js";
import { getTodayBogota } from "./membresia.service.js";
import { listarServicios } from "./servicio.service.js";

const includeAsignacion = {
  plan: { select: { id: true, nombre: true } },
  actor: { select: { id: true, nombre: true } },
} as const;

export async function asignarPlanNutricional(
  clienteId: string,
  planId: string,
  fechaInicio: string | undefined,
  actorId: string
) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { estado: true } });
  if (!cliente) throw new ErrorNegocio("CLIENTE_NO_ENCONTRADO");
  const plan = await prisma.planNutricional.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) throw new ErrorNegocio("PLAN_NO_ENCONTRADO");
  if (cliente.estado !== "NUEVO" && cliente.estado !== "ACTIVO") throw new ErrorNegocio("CLIENTE_INACTIVO");

  const { servicios } = await listarServicios(clienteId, "NUTRICION");
  const vigente = servicios.some((s: any) => s.estado === "ACTIVA");
  if (!vigente) throw new ErrorNegocio("SIN_VIGENCIA_NUTRICION");

  const activaVerificada = await prisma.planNutricionalAsignacion.findFirst({ where: { clienteId, fechaFin: null }, select: { id: true, planId: true } });
  if (activaVerificada && activaVerificada.planId === planId) throw new ErrorNegocio("PLAN_YA_ACTIVO");

  const inicio = fechaInicio ?? getTodayBogota();

  try {
    return await prisma.$transaction(async (tx) => {
      if (activaVerificada) {
        const cierre = await tx.planNutricionalAsignacion.updateMany({
          where: { id: activaVerificada.id, fechaFin: null, activaClave: clienteId },
          data: { fechaFin: inicio, activaClave: null },
        });
        if (cierre.count !== 1) throw new ErrorNegocio("ASIGNACION_CONFLICTO");
      }
      const planFila = await tx.planNutricional.findUniqueOrThrow({ where: { id: planId } });
      const snapshot = JSON.stringify(planFila);
      const creada = await tx.planNutricionalAsignacion.create({
        data: { clienteId, planId, fechaInicio: inicio, actorId, snapshot, activaClave: clienteId },
        include: includeAsignacion,
      });
      return creada;
    });
  } catch (error) {
    if (error instanceof ErrorNegocio) throw error;
    if (isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034")) throw new ErrorNegocio("ASIGNACION_CONFLICTO");
    throw error;
  }
}

export async function obtenerHistorialNutricion(clienteId: string) {
  const filas = await prisma.planNutricionalAsignacion.findMany({ where: { clienteId }, include: includeAsignacion, orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }] });
  return { clienteId, asignaciones: filas, total: filas.length };
}

export async function obtenerActivaNutricion(clienteId: string) {
  const activa = await prisma.planNutricionalAsignacion.findFirst({ where: { clienteId, fechaFin: null }, include: includeAsignacion });
  if (!activa) return { clienteId, asignacion: null, estado: "SIN_PLAN" as const };
  return { clienteId, asignacion: activa, estado: "ACTIVA" as const };
}

export async function obtenerPortalPlanNutricional(clienteId: string) {
  const activa = await prisma.planNutricionalAsignacion.findFirst({ where: { clienteId, fechaFin: null }, select: { id: true, fechaInicio: true, snapshot: true } });
  if (!activa) return { mensaje: "No tienes un plan nutricional activo" };
  const { servicios } = await listarServicios(clienteId, "NUTRICION");
  const vigente = servicios.some((s: any) => s.estado === "ACTIVA");
  if (!vigente) return { estado: "OCULTO_POR_VIGENCIA", mensaje: "No tienes un plan nutricional activo" };
  return { asignacionId: activa.id, fechaInicio: activa.fechaInicio, plan: JSON.parse(activa.snapshot as string) };
}

export async function existeClienteNutricion(clienteId: string): Promise<void> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
  if (!cliente) throw new ErrorNegocio("CLIENTE_NO_ENCONTRADO");
}