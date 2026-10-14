import { FastifyInstance, FastifyRequest } from "fastify";
import prisma from "../lib/prisma.js";
import {
  getHoraBogota,
  getTodayBogota,
  resolverEstadoAcceso,
} from "../services/membresia.service.js";
import {
  createClienteRapido,
  SEDE_INEXISTENTE,
} from "../services/cliente.service.js";
import {
  consultaQuerySchema,
  crearClienteRapidoSchema,
  crearIngresoSchema,
  listarIngresosQuerySchema,
  mensajeErrorValidacion,
} from "../schemas/recepcion.schema.js";
import {
  esErrorPrismaClient,
  internalPrismaErrorBody,
  isPrismaCode,
  mapPrismaError,
  type ApiErrorBody,
} from "../lib/errors.js";

/**
 * INC-03 (HU-29 / HU-30 / HU-31) — superficie de recepcion.
 *
 * DEC-001: las 4 rutas exigen rol DUENO o RECEPCIONISTA (401 sin token /
 * token invalido, 403 con otro rol) via `authenticateRoles`, previo a
 * cualquier validacion de negocio.
 *
 * Fuente unica de estado (HU-16 b3 / VEN-05): consulta e ingresos usan el
 * MISMO `resolverEstadoAcceso` que ficha, listado y portal.
 */

const STAFF_ROLES = ["DUENO", "RECEPCIONISTA"];

/** Selector de vigencia GYM ratificado (spec INC-03: vigencia "actual"). */
const ordenVigenciaGym = [
  { fechaFin: "desc" as const },
  { fechaInicio: "desc" as const },
  { id: "desc" as const },
];

const cambiosPausaSelect = {
  select: {
    accion: true,
    version: true,
    congelacionInicio: true,
    congelacionFin: true,
  },
  orderBy: { version: "asc" as const },
};

/** Trae la vigencia GYM vigente (o null) con su secuencia de pausas. */
async function cargarVigenciaGym(clienteId: string) {
  const [vigencia] = await prisma.membresiaGym.findMany({
    where: { clienteId, tipoServicio: "GYM" },
    orderBy: ordenVigenciaGym,
    take: 1,
    include: { cambios: cambiosPausaSelect },
  });
  return vigencia ?? null;
}

const SEDE_NO_EXISTE_BODY: ApiErrorBody = {
  error: "La sede indicada no existe. Verifique el identificador enviado.",
  code: "VALIDATION_ERROR",
};

const CLIENTE_NO_ENCONTRADO_BODY: ApiErrorBody = {
  error: "Cliente no encontrado",
  code: "NOT_FOUND",
};

/** Mapea errores de la creacion rapida (precedente HU-04 / DEC-002). */
function responderErrorRapido(
  error: unknown,
  request: FastifyRequest
): { status: number; body: ApiErrorBody } | null {
  const message =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown }).message
      : undefined;

  if (message === SEDE_INEXISTENTE) {
    return { status: 400, body: SEDE_NO_EXISTE_BODY };
  }

  if (isPrismaCode(error, "P2002")) {
    return {
      status: 409,
      body: { error: "Ya existe un cliente con esa cédula", code: "DUPLICATE" },
    };
  }

  const prismaError = mapPrismaError(error);
  if (prismaError) return prismaError;

  if (esErrorPrismaClient(error)) {
    request.log.error({ err: error }, "Error de Prisma sin mapeo en rapido");
    return { status: 500, body: internalPrismaErrorBody() };
  }

  return null;
}

export default async function recepcionRoutes(fastify: FastifyInstance) {
  // ─── #2 HU-29: GET /recepcion/consulta ────────────────────────────────────
  fastify.get(
    "/recepcion/consulta",
    { preHandler: [fastify.authenticateRoles(STAFF_ROLES)] },
    async (request, reply) => {
      const parsed = consultaQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: mensajeErrorValidacion(parsed.error),
          code: "VALIDATION_ERROR",
        });
      }

      const { cedula } = parsed.data;
      const cliente = await prisma.cliente.findUnique({
        where: { cedula },
        select: {
          id: true,
          cedula: true,
          nombres: true,
          apellidos: true,
          estado: true,
          sede: { select: { id: true, nombre: true } },
          membresias: {
            where: { tipoServicio: "GYM" },
            orderBy: ordenVigenciaGym,
            take: 1,
            include: { cambios: cambiosPausaSelect },
          },
          ingresos: {
            orderBy: [{ fecha: "desc" }, { hora: "desc" }],
            take: 1,
            select: {
              fecha: true,
              hora: true,
              sede: { select: { id: true, nombre: true } },
            },
          },
        },
      });

      if (!cliente) {
        return reply.status(404).send(CLIENTE_NO_ENCONTRADO_BODY);
      }

      const hoy = getTodayBogota();
      const vigencia = cliente.membresias[0] ?? null;
      const acceso = resolverEstadoAcceso(vigencia, vigencia?.cambios, hoy);
      const ultimoIngreso = cliente.ingresos[0] ?? null;

      // DEC-028: alertas derivadas del estado, en orden deterministico
      // (ESTADO_CLIENTE antes de MEMBRESIA_VENCIDA).
      const alertas: Array<{
        codigo: "ESTADO_CLIENTE" | "MEMBRESIA_VENCIDA";
        mensaje: string;
      }> = [];
      if (cliente.estado !== "ACTIVO") {
        alertas.push({
          codigo: "ESTADO_CLIENTE",
          mensaje: `El cliente tiene estado ${cliente.estado}`,
        });
      }
      if (acceso.estadoAccesoGym === "VENCIDA" && acceso.fechaVencimiento) {
        alertas.push({
          codigo: "MEMBRESIA_VENCIDA",
          mensaje: `La membresía venció el ${acceso.fechaVencimiento}`,
        });
      }

      return {
        id: cliente.id,
        nombreCompleto: `${cliente.nombres} ${cliente.apellidos}`,
        cedula: cliente.cedula,
        sede: cliente.sede,
        // DEC-029: no existe `Cliente.foto`; siempre null.
        foto: null,
        estadoAccesoGym: acceso.estadoAccesoGym,
        fechaVencimiento: acceso.fechaVencimiento,
        congelacion: acceso.congelacion,
        ultimoIngreso,
        alertas,
        fechaActual: hoy,
      };
    }
  );

  // ─── #3 HU-30: POST /recepcion/ingresos ───────────────────────────────────
  fastify.post(
    "/recepcion/ingresos",
    { preHandler: [fastify.authenticateRoles(STAFF_ROLES)] },
    async (request, reply) => {
      const parsed = crearIngresoSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: mensajeErrorValidacion(parsed.error),
          code: "VALIDATION_ERROR",
        });
      }

      const { cedula, sedeId } = parsed.data;
      const cliente = await prisma.cliente.findUnique({
        where: { cedula },
        select: { id: true, cedula: true, estado: true },
      });
      if (!cliente) {
        return reply.status(404).send(CLIENTE_NO_ENCONTRADO_BODY);
      }

      const sede = await prisma.sede.findUnique({
        where: { id: sedeId },
        select: { id: true, nombre: true },
      });
      if (!sede) {
        return reply.status(400).send(SEDE_NO_EXISTE_BODY);
      }

      // DEC-030: el estado general del cliente bloquea ANTES de la vigencia
      // (SUSPENDIDO / RETIRADO no pueden registrar ingresos, sin escritura).
      if (cliente.estado === "SUSPENDIDO" || cliente.estado === "RETIRADO") {
        return reply.status(403).send({
          error: `El cliente está ${cliente.estado} y no puede registrar ingresos`,
          code: "INGRESO_NO_PERMITIDO",
        });
      }

      // Guarda de membresia habilitada (HU-30): CONGELADO tambien ingresa
      // (201, DEC-025/CONF-02); VENCIDA / PROGRAMADA / SIN_VIGENCIA -> 403
      // con el mensaje exacto por motivo.
      const hoy = getTodayBogota();
      const vigencia = await cargarVigenciaGym(cliente.id);
      const acceso = resolverEstadoAcceso(vigencia, vigencia?.cambios, hoy);

      if (acceso.estadoAccesoGym === "VENCIDA") {
        return reply.status(403).send({
          error: `La membresía no está habilitada para ingresar (vencida el ${vigencia!.fechaFin})`,
          code: "INGRESO_NO_PERMITIDO",
        });
      }
      if (acceso.estadoAccesoGym === "PROGRAMADA") {
        return reply.status(403).send({
          error: `La membresía no está habilitada para ingresar (aún no inicia desde ${vigencia!.fechaInicio})`,
          code: "INGRESO_NO_PERMITIDO",
        });
      }
      if (acceso.estadoAccesoGym === "SIN_VIGENCIA") {
        return reply.status(403).send({
          error:
            "La membresía no está habilitada para ingresar (no tiene vigencia activa)",
          code: "INGRESO_NO_PERMITIDO",
        });
      }

      // CONF-03: sin dedupe — cada POST crea una fila nueva (hoy America/
      // Bogota, hora America/Bogota HH:mm:ss CONF-06).
      const actor = request.user as { id: string; nombre: string };
      const ingreso = await prisma.ingreso.create({
        data: {
          clienteId: cliente.id,
          sedeId: sede.id,
          registradoPorId: actor.id,
          fecha: hoy,
          hora: getHoraBogota(),
        },
      });

      return reply.status(201).send({
        id: ingreso.id,
        clienteId: ingreso.clienteId,
        cedula: cliente.cedula,
        fecha: ingreso.fecha,
        hora: ingreso.hora,
        sede: { id: sede.id, nombre: sede.nombre },
        registradoPor: { id: actor.id, nombre: actor.nombre },
        createdAt: ingreso.createdAt.toISOString(),
      });
    }
  );

  // ─── #4 HU-30: GET /recepcion/ingresos ────────────────────────────────────
  fastify.get(
    "/recepcion/ingresos",
    { preHandler: [fastify.authenticateRoles(STAFF_ROLES)] },
    async (request, reply) => {
      const parsed = listarIngresosQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: mensajeErrorValidacion(parsed.error),
          code: "VALIDATION_ERROR",
        });
      }

      const { cedula, fecha } = parsed.data;
      const cliente = await prisma.cliente.findUnique({
        where: { cedula },
        select: { id: true, cedula: true },
      });
      if (!cliente) {
        return reply.status(404).send(CLIENTE_NO_ENCONTRADO_BODY);
      }

      const ingresos = await prisma.ingreso.findMany({
        where: {
          clienteId: cliente.id,
          ...(fecha ? { fecha } : {}),
        },
        orderBy: [{ fecha: "desc" }, { hora: "desc" }],
        include: {
          sede: { select: { id: true, nombre: true } },
          registradoPor: { select: { id: true, nombre: true } },
        },
      });

      return {
        ingresos: ingresos.map((ingreso) => ({
          id: ingreso.id,
          clienteId: ingreso.clienteId,
          cedula: cliente.cedula,
          fecha: ingreso.fecha,
          hora: ingreso.hora,
          sede: ingreso.sede,
          registradoPor: ingreso.registradoPor,
          createdAt: ingreso.createdAt.toISOString(),
        })),
        total: ingresos.length,
      };
    }
  );

  // ─── #5 HU-31: POST /recepcion/clientes-rapidos ───────────────────────────
  fastify.post(
    "/recepcion/clientes-rapidos",
    { preHandler: [fastify.authenticateRoles(STAFF_ROLES)] },
    async (request, reply) => {
      const parsed = crearClienteRapidoSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = parsed.error.errors.map((issue) => issue.message);
        return reply.status(400).send({
          error: errors.join(", "),
          code: "VALIDATION_ERROR",
        });
      }

      const actor = request.user as { id: string };
      const { cedula, nombres, apellidos, telefono, email, observaciones } =
        parsed.data;

      // DEC-031: `sedeId` opcional; default = sede del USUARIO del token.
      // El payload del JWT staff no trae sedeId (loginUser), asi que se
      // resuelve con un lookup de `User` por `request.user.id`.
      let sedeId = parsed.data.sedeId;
      if (!sedeId) {
        const usuario = await prisma.user.findUnique({
          where: { id: actor.id },
          select: { sedeId: true },
        });
        sedeId = usuario?.sedeId ?? undefined;
        if (!sedeId) {
          return reply.status(400).send({
            error: "sedeId es requerido",
            code: "VALIDATION_ERROR",
          });
        }
      }

      try {
        const cliente = await createClienteRapido(
          {
            cedula,
            nombres,
            apellidos,
            telefono,
            email: email || undefined,
            sedeId,
            observaciones: observaciones || undefined,
          },
          actor.id
        );
        return reply.status(201).send(cliente);
      } catch (error) {
        const respuesta = responderErrorRapido(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );
}
