import prisma from "../lib/prisma.js";

export async function enviarNotificacionesVencimiento(dias: number) {
  let enviados = 0, deduplicados = 0, errores = 0;
  const hoy = new Date();
  const limite = new Date(hoy.getTime() + dias * 86400000);
  const hoyStr = hoy.toISOString().slice(0, 10);
  const limiteStr = limite.toISOString().slice(0, 10);
  const membresias = await prisma.membresiaGym.findMany({ where: { fechaFin: { gte: hoyStr, lte: limiteStr } } });
  const provider = process.env.NOTIF_PROVIDER ?? "stub";
  for (const m of membresias) {
    const fechaVenc = m.fechaFin;
    try {
      const exists = await prisma.notificacionEnvio.findUnique({ where: { clienteId_servicioId_fechaVencimiento_tipoAviso: { clienteId: m.clienteId, servicioId: m.id, fechaVencimiento: fechaVenc, tipoAviso: "VENCIMIENTO" } } });
      if (exists) { deduplicados++; continue; }
      await prisma.notificacionEnvio.create({ data: { clienteId: m.clienteId, servicioId: m.id, fechaVencimiento: fechaVenc, tipoAviso: "VENCIMIENTO", enviadoEn: new Date(), canal: provider.toUpperCase(), estado: "ENVIADO" } });
      enviados++;
    } catch (e) {
      errores++;
    }
  }
  return { enviados, deduplicados, errores };
}