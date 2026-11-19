/**
 * INC-12 (RED) - helpers compartidos de los tests de nutricion, asignacion,
 * historial y portal (NU-01..NU-42).
 *
 * Patron RED tolerante al artefacto ausente (contrato del orquestador,
 * patron INC-09/INC-10):
 *  - Las rutas de producto nuevas se importan por ESPECIFICADOR VARIABLE para
 *    que el RED compile/ejecute sin `src/routes/planes-nutricionales` (GREEN lo crea).
 *    Sin el modulo los endpoints responden 404 y los tests fallan por
 *    COMPORTAMIENTO AUSENTE, nunca por error de carga.
 *  - Ningun helper crea tablas ni modifica prisma/**: los modelos los aporta el GREEN.
 *  - La limpieza tolera los modelos nuevos ausentes (solo limpia si existen).
 */
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import { expect } from "vitest";
import prisma from "../../src/lib/prisma";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import portalRoutes from "../../src/routes/portal";
import recepcionRoutes from "../../src/routes/recepcion";
import anamnesisRoutes from "../../src/routes/anamnesis";

export const CODE_CLIENTE_NO_ENCONTRADO = "CLIENTE_NO_ENCONTRADO";
export const CODE_PLAN_NO_ENCONTRADO = "PLAN_NO_ENCONTRADO";
export const CODE_SIN_VIGENCIA = "SIN_VIGENCIA_NUTRICION";
export const CODE_PLAN_YA_ACTIVO = "PLAN_YA_ACTIVO";
export const CODE_CLIENTE_INACTIVO = "CLIENTE_INACTIVO";
export const CODE_ASIGNACION_CONFLICTO = "ASIGNACION_CONFLICTO";

export const ESTADO_SIN_PLAN = "SIN_PLAN";
export const ESTADO_OCULTA = "OCULTA_POR_VIGENCIA";
export const ESTADO_ACTIVA = "ACTIVA";

export const MENSAJE_CLIENTE_NO_ENCONTRADO = "Cliente no encontrado";
export const MENSAJE_PLAN_NO_ENCONTRADO = "Plan no encontrado";
export const MENSAJE_SIN_VIGENCIA =
  "El cliente no tiene el servicio de nutricion vigente: no se puede activar un plan nutricional";
export const MENSAJE_PLAN_YA_ACTIVO = "El plan ya esta activo para este cliente";
export const MENSAJE_CLIENTE_INACTIVO =
  "Cliente sin estado activo: no se le pueden asignar planes nutricionales";
export const MENSAJE_SIN_PLAN = "No tienes un plan nutricional activo";

// Especificadores VARIABLES: el GREEN puede exponer los endpoints desde
// `planes-nutricionales.ts` o desde clientes/portal/membresia.
const MODULOS_NUTRICION = [
  "../../src/routes/planes-nutricionales",
  "../../src/routes/plan-nutricional",
  "../../src/routes/nutricion",
  "../../src/routes/asignaciones-nutricion",
  "../../src/routes/portal-plan-nutricional",
];

export async function buildNutricionApp() {
  const app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.register(recepcionRoutes);
  await app.register(anamnesisRoutes);
  for (const mod of MODULOS_NUTRICION) {
    try {
      const m = await import(mod);
      if (m?.default) await app.register(m.default);
    } catch {
      // RED tolerante: modulo ausente => endpoints inexisten (404) por comportamiento ausente.
    }
  }
  await app.ready();
  return app;
}

export async function cleanupNutricion() {
  const anyPrisma: any = prisma as any;
  const models = [
    "planNutricionalAsignacion",
    "planNutricional",
    "PlanNutricionalAsignacion",
    "PlanNutricional",
  ];
  for (const m of models) {
    if (typeof anyPrisma?.[m]?.deleteMany === "function") {
      try {
        await anyPrisma[m].deleteMany({});
      } catch {
        // tabla aun no existe en RED; ignorar.
      }
    }
  }
}

export { prisma };