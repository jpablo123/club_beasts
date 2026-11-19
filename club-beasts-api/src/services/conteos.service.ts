import prisma from "../lib/prisma.js";
import { calcularEstado } from "./membresia.service.js";
import { SEDE_INEXISTENTE } from "./cliente.service.js";

export async function obtenerConteosSede(sedeId: string, fecha?: string) {
  const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new Error(SEDE_INEXISTENTE);
  const hoy = fecha ?? new Date().toISOString().slice(0, 10);
  const membresias = await prisma.membresiaGym.findMany();
  let activos = 0, vencidos = 0, congelados = 0;
  for (const m of membresias) {
    const estado = calcularEstado(m.fechaInicio, m.fechaFin, hoy);
    if (estado === "ACTIVA") activos++;
    else if (estado === "VENCIDA") vencidos++;
    else if (estado === "CONGELADO") congelados++;
  }
  const ingresosDelDia = await prisma.ingreso.count({ where: { sedeId } });
  return { activos, vencidos, congelados, ingresosDelDia };
}