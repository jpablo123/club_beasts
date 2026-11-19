import prisma from "../lib/prisma.js";

type HistorialItem = {
  tipo: "RUTINA" | "PLAN_NUTRICIONAL" | "INGRESO";
  fecha: Date | string;
  actor: string | null;
  snapshot: unknown;
};

export async function obtenerHistorialCliente(clienteId: string, opts: { tipo?: string; limit: number; offset: number }, ocultarActor = false) {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const items: HistorialItem[] = [];
  if (!opts.tipo || opts.tipo === "RUTINA") {
    const asignaciones = await prisma.rutinaAsignacion.findMany({ where: { clienteId }, orderBy: { fechaInicio: "desc" }, skip: offset, take: limit });
    for (const a of asignaciones) items.push({ tipo: "RUTINA", fecha: a.fechaInicio, actor: ocultarActor ? null : (a.actorId ?? null), snapshot: ocultarActor ? { ...a, actorId: undefined } : a });
  }
  if (!opts.tipo || opts.tipo === "PLAN_NUTRICIONAL") {
    const planes = await (prisma as any).planNutricionalAsignacion.findMany({ where: { clienteId }, orderBy: { createdAt: "desc" }, skip: offset, take: limit });
    for (const p of planes) items.push({ tipo: "PLAN_NUTRICIONAL", fecha: p.createdAt ?? p.fechaInicio, actor: ocultarActor ? null : (p.actorId ?? null), snapshot: ocultarActor ? { ...p, actorId: undefined } : p });
  }
  if (!opts.tipo || opts.tipo === "INGRESO") {
    const ingresos = await prisma.ingreso.findMany({ where: { clienteId }, orderBy: { fecha: "desc" }, skip: offset, take: limit });
    for (const i of ingresos) items.push({ tipo: "INGRESO", fecha: i.fecha, actor: null, snapshot: i });
  }
  items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const total = items.length;
  return { items, total };
}