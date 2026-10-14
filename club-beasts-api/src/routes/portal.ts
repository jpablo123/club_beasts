import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";
import {
  getTodayBogota,
  resolverEstadoAcceso,
} from "../services/membresia.service.js";

/**
 * INC-03 (HU-25) — `GET /portal/resumen`.
 *
 * DEC-001: solo rol CLIENTE; la identidad sale del token (`request.user.id`
 * es el `cliente.id` emitido por `POST /auth/login-cliente`). El cliente solo
 * ve SUS datos: no hay parametro de identificacion que manipular.
 *
 * Fuente unica de estado (HU-16 b3 / VEN-05): el `estadoAccesoGym` sale del
 * MISMO `resolverEstadoAcceso` que ficha, listado y recepcion. La vigencia
 * GYM se elige con el selector ratificado: `tipoServicio = "GYM"`, orden
 * `fechaFin desc, fechaInicio desc, id desc`, `take 1`.
 *
 * Superficie de respuesta = superconjunto del contrato G14
 * (`cliente{}` anidado, HU-25-schemas.ts) + campos planos
 * (`nombreCompleto`/`cedula`/`sede`) que consumen los steps Gherkin del
 * portal: zod no-estricto acepta ambos (decision tecnica documentada).
 */
export default async function portalRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/portal/resumen",
    { preHandler: [fastify.authenticateRoles(["CLIENTE"])] },
    async (request, reply) => {
      const clienteId = (request.user as { id: string }).id;

      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          cedula: true,
          sede: { select: { id: true, nombre: true } },
          membresias: {
            where: { tipoServicio: "GYM" },
            orderBy: [
              { fechaFin: "desc" },
              { fechaInicio: "desc" },
              { id: "desc" },
            ],
            take: 1,
            include: {
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
          },
        },
      });

      if (!cliente) {
        return reply.status(404).send({
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        });
      }

      const hoy = getTodayBogota();
      const vigencia = cliente.membresias[0] ?? null;
      const acceso = resolverEstadoAcceso(vigencia, vigencia?.cambios, hoy);

      return {
        cliente: {
          id: cliente.id,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          cedula: cliente.cedula,
          sede: cliente.sede,
        },
        nombreCompleto: `${cliente.nombres} ${cliente.apellidos}`,
        cedula: cliente.cedula,
        sede: cliente.sede,
        estadoAccesoGym: acceso.estadoAccesoGym,
        fechaVencimiento: acceso.fechaVencimiento,
        congelacion: acceso.congelacion,
        fechaActual: hoy,
      };
    }
  );
}
