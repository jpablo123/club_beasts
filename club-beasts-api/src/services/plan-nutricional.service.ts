import { PlanNutricional as PlanModelo } from "@prisma/client";
import { Prisma } from "@prisma/client";import prisma from "../lib/prisma.js";
import { ErrorNegocio } from "./rutina.service.js";
import {
  type CrearPlanNutricional,
  type ActualizarPlanNutricional,
  type PlanNutricionalDatos,
} from "../schemas/plan-nutricional.schema.js";

export class ErrorValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorValidacion";
  }
}

export type FilaPlanNutricional = PlanModelo & {
  actualizadoPor: { id: string; nombre: string } | null;
  creadoPor: { id: string; nombre: string } | null;
};

const includeActualizadoPor = {
  actualizadoPor: { select: { id: true, nombre: true } },
  creadoPor: { select: { id: true, nombre: true } },
} satisfies Prisma.PlanNutricionalInclude;

function serializar(v: unknown): string {
  return JSON.stringify(v);
}
function deserializar<T>(crudo: unknown, fallback: T): T {
  if (crudo === null || crudo === undefined) return fallback;
  if (typeof crudo === "string") {
    try { return JSON.parse(crudo) as T; } catch { return fallback; }
  }
  return crudo as T;
}

function aDatos(fila: FilaPlanNutricional): PlanNutricionalDatos {
  return {
    id: fila.id,
    nombre: fila.nombre ?? null,
    datosBiometricos: deserializar(fila.datosBiometricos, {}) as PlanNutricionalDatos["datosBiometricos"],
    macronutrientes: fila.macronutrientes ? deserializar(fila.macronutrientes, null) : null,
    comidas: deserializar(fila.comidas, []),
    recomendaciones: fila.recomendaciones ?? null,
    suplementacion: fila.suplementacion ?? null,
    observacionesGenerales: fila.observacionesGenerales ?? null,
    fechaActualizacion: fila.updatedAt.toISOString(),
    actualizadoPor: fila.actualizadoPor ? { id: fila.actualizadoPor.id, nombre: fila.actualizadoPor.nombre } : null,
  };
}

export async function obtenerFilaPlanNutricional(id: string): Promise<FilaPlanNutricional | null> {
  const fila = await prisma.planNutricional.findUnique({ where: { id }, include: includeActualizadoPor });
  return (fila as FilaPlanNutricional) ?? null;
}

export async function crearPlanNutricional(datos: CrearPlanNutricional, actorId: string): Promise<PlanNutricionalDatos> {
  const fila = await prisma.planNutricional.create({
    data: {
      nombre: datos.nombre ?? "Plan nutricional",      datosBiometricos: serializar(datos.datosBiometricos),
      macronutrientes: datos.macronutrientes ? serializar(datos.macronutrientes) : (Prisma as any).JsonNull,      comidas: serializar(datos.comidas),
      recomendaciones: datos.recomendaciones ?? null,
      suplementacion: datos.suplementacion ?? null,
      observacionesGenerales: datos.observacionesGenerales ?? null,
      creadoPorId: actorId,
      actualizadoPorId: actorId,
    },
    include: includeActualizadoPor,
  });
  return aDatos(fila as FilaPlanNutricional);
}

export async function listarPlanesNutricionales(): Promise<{ planes: PlanNutricionalDatos[]; total: number }> {
  const filas = await prisma.planNutricional.findMany({ orderBy: { createdAt: "desc" }, include: includeActualizadoPor });
  const planes = filas.map((f) => aDatos(f as FilaPlanNutricional));
  return { planes, total: planes.length };
}

export async function actualizarPlanNutricional(fila: FilaPlanNutricional, cambios: ActualizarPlanNutricional, actorId: string): Promise<PlanNutricionalDatos> {
  const data: Prisma.PlanNutricionalUpdateInput = { actualizadoPorId: actorId } as any;
  if (cambios.nombre !== undefined) data.nombre = cambios.nombre ?? null;
  if (cambios.datosBiometricos !== undefined) data.datosBiometricos = serializar(cambios.datosBiometricos);
  if (cambios.macronutrientes !== undefined) data.macronutrientes = cambios.macronutrientes ? serializar(cambios.macronutrientes) : (Prisma as any).JsonNull;  if (cambios.comidas !== undefined) data.comidas = serializar(cambios.comidas);
  if (cambios.recomendaciones !== undefined) data.recomendaciones = cambios.recomendaciones ?? null;
  if (cambios.suplementacion !== undefined) data.suplementacion = cambios.suplementacion ?? null;
  if (cambios.observacionesGenerales !== undefined) data.observacionesGenerales = cambios.observacionesGenerales ?? null;
  const actualizada = await prisma.planNutricional.update({ where: { id: fila.id }, data, include: includeActualizadoPor });
  return aDatos(actualizada as FilaPlanNutricional);
}

export { ErrorNegocio };
