import { FastifyInstance, FastifyRequest } from "fastify";
import {
  congelarVigencia,
  crearMembresia,
  descongelarVigencia,
  editarCongelacion,
  editarMembresia,
  getTodayBogota,
  listarMembresias,
} from "../services/membresia.service.js";
import {
  createCongelacionSchema,
  createMembresiaSchema,
  descongelarSchema,
  MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY,
  updateCongelacionSchema,
  updateMembresiaSchema,
  membresiaParamsSchema,
  vigenciaParamsSchema,
} from "../schemas/membresia.schema.js";
import {
  esErrorPrismaClient,
  internalPrismaErrorBody,
  mapPrismaError,
} from "../lib/errors.js";

/** Respuesta estandar por codigo de error de negocio de membresia. */
const RESPUESTAS_ERROR: Record<
  string,
  { status: number; error: string; code: string }
> = {
  NOT_FOUND: {
    status: 404,
    error: "Membresía no encontrada",
    code: "NOT_FOUND",
  },
  MEMBRESIA_CONFLICTO: {
    status: 409,
    error: "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.",
    code: "MEMBRESIA_CONFLICTO",
  },
  MEMBRESIA_SOLAPADA: {
    status: 409,
    error: "Las fechas se solapan con un período existente",
    code: "MEMBRESIA_SOLAPADA",
  },
  VALIDATION_ERROR: {
    status: 400,
    error: "Fecha fin no puede ser anterior a fecha de inicio",
    code: "VALIDATION_ERROR",
  },
  // ── INC-02 (HU-15 + ampliacion DEC-024) ────────────────────────────────────
  // Un `code` = una unica respuesta HTTP; `CONGELACION_NO_PERMITIDA` tiene dos
  // condiciones (tipo de servicio y rango no contenido) con un mensaje cada
  // una, por eso la clave interna del mapa lleva sufijo y el `code` devuelto
  // sigue siendo unico (spec INC-02, "Tabla completa de errores").
  MEMBRESIA_VENCIDA: {
    status: 409,
    error: "No se puede congelar una membresía vencida",
    code: "MEMBRESIA_VENCIDA",
  },
  CONGELACION_NO_PERMITIDA: {
    status: 409,
    error: "La congelación no está permitida para este tipo de servicio",
    code: "CONGELACION_NO_PERMITIDA",
  },
  CONGELACION_NO_PERMITIDA_RANGO: {
    status: 409,
    error: "El rango de congelación debe estar dentro de la vigencia",
    code: "CONGELACION_NO_PERMITIDA",
  },
  CONGELACION_INEXISTENTE: {
    status: 409,
    error: "No hay una congelación vigente en esta membresía",
    code: "CONGELACION_INEXISTENTE",
  },
};

/**
 * Mapea un error de negocio (o de Prisma) a status + cuerpo.
 * Devuelve null si el error no es reconocido y debe propagarse.
 *
 * Mapeo estandar de Prisma: los codigos que corresponde a 4xx/5xx nunca se
 * responden como 500 con el mensaje interno del motor (filtraria detalles de
 * esquema); los que no estan mapeados responden un 500 generico y quedan
 * registrados en el log del servidor.
 */
function responderError(
  error: unknown,
  request: FastifyRequest
): { status: number; body: { error: string; code: string } } | null {
  const code =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown }).message
      : undefined;

  if (typeof code === "string" && RESPUESTAS_ERROR[code]) {
    const respuesta = RESPUESTAS_ERROR[code];
    return { status: respuesta.status, body: { error: respuesta.error, code: respuesta.code } };
  }

  const prismaError = mapPrismaError(error);
  if (prismaError) return prismaError;

  if (esErrorPrismaClient(error)) {
    request.log.error({ err: error }, "Error de Prisma sin mapeo en membresia");
    return { status: 500, body: internalPrismaErrorBody() };
  }

  return null;
}

export default async function membresiaRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/clientes/:clienteId/membresias-gym",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const params = membresiaParamsSchema.parse(request.params);
      const result = await listarMembresias(params.clienteId);
      return result;
    }
  );

  fastify.post(
    "/clientes/:clienteId/membresias-gym",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = membresiaParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: paramsResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const bodyResult = createMembresiaSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: bodyResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const { clienteId } = paramsResult.data;
      const { fechaInicio, fechaFin } = bodyResult.data;
      const actorId = (request.user as any).id;

      try {
        const cliente = await fastify.prisma.cliente.findUnique({
          where: { id: clienteId },
          select: { id: true },
        });
        if (!cliente) {
          return reply.status(404).send({
            error: "Cliente no encontrado",
            code: "NOT_FOUND",
          });
        }

        const membresia = await crearMembresia(clienteId, fechaInicio, fechaFin, actorId);
        return reply.status(201).send(membresia);
      } catch (error: any) {
        const respuesta = responderError(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );

  fastify.patch(
    "/clientes/:clienteId/membresias-gym/:membresiaId",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = membresiaParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: paramsResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const bodyResult = updateMembresiaSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: bodyResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const { clienteId, membresiaId } = paramsResult.data;
      if (!membresiaId) {
        return reply.status(400).send({
          error: "membresiaId es requerido",
          code: "VALIDATION_ERROR",
        });
      }

      const actorId = (request.user as any).id;

      try {
        const membresia = await editarMembresia(
          clienteId,
          membresiaId,
          bodyResult.data,
          actorId
        );
        return membresia;
      } catch (error: any) {
        const respuesta = responderError(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );

  // ── INC-02 (HU-15 + ampliacion DEC-024) ────────────────────────────────────
  // Sin prefijo `/api` (el servidor registra rutas sin prefijo global) y con
  // el mismo preHandler DUENO/RECEPCIONISTA de las rutas de CRUD (DEC-017).

  /**
   * Regla post-Zod del contrato (DEC-022 b): `fechaFin` de la pausa debe ser
   * hoy o futura en `America/Bogota`; `fechaInicio` puede ser retroactivo
   * mientras el rango siga abierto. `hoy` es dinamica, por eso no va en Zod.
   */
  function validarFechaFinPausa(fechaFin: string) {
    if (fechaFin < getTodayBogota()) {
      return {
        status: 400,
        body: {
          error: MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY,
          code: "VALIDATION_ERROR",
        },
      } as const;
    }
    return null;
  }

  fastify.post(
    "/clientes/:clienteId/vigencias/:vigenciaId/congelar",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = vigenciaParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: paramsResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const bodyResult = createCongelacionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: bodyResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const postZod = validarFechaFinPausa(bodyResult.data.fechaFin);
      if (postZod) return reply.status(postZod.status).send(postZod.body);

      const { clienteId, vigenciaId } = paramsResult.data;
      const actorId = (request.user as any).id;

      try {
        const vigencia = await congelarVigencia(
          clienteId,
          vigenciaId,
          bodyResult.data,
          actorId
        );
        return reply.status(200).send(vigencia);
      } catch (error: any) {
        const respuesta = responderError(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );

  fastify.post(
    "/clientes/:clienteId/vigencias/:vigenciaId/descongelar",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = vigenciaParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: paramsResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const bodyResult = descongelarSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: bodyResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const { clienteId, vigenciaId } = paramsResult.data;
      const actorId = (request.user as any).id;

      try {
        const vigencia = await descongelarVigencia(
          clienteId,
          vigenciaId,
          bodyResult.data,
          actorId
        );
        return reply.status(200).send(vigencia);
      } catch (error: any) {
        const respuesta = responderError(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );

  fastify.patch(
    "/clientes/:clienteId/vigencias/:vigenciaId/congelacion",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = vigenciaParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: paramsResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const bodyResult = updateCongelacionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: bodyResult.error.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      const postZod = validarFechaFinPausa(bodyResult.data.fechaFin);
      if (postZod) return reply.status(postZod.status).send(postZod.body);

      const { clienteId, vigenciaId } = paramsResult.data;
      const actorId = (request.user as any).id;

      try {
        const vigencia = await editarCongelacion(
          clienteId,
          vigenciaId,
          bodyResult.data,
          actorId
        );
        return reply.status(200).send(vigencia);
      } catch (error: any) {
        const respuesta = responderError(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );
}
