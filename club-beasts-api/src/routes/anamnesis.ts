import { FastifyInstance } from "fastify";
import {
  anamnesisParamsSchema,
  guardarParcialAnamnesisSchema,
  guardarParcialSinConsistenciaSchema,
  mensajePrimerErrorZod,
} from "../schemas/anamnesis.schema.js";
import {
  crearAnamnesis,
  existeCliente,
  obtenerAnamnesis,
  actualizarAnamnesis,
  vistaClienteSecciones,
  vistaDueno,
  vistaRecepcion,
  vistaSinRegistro,
} from "../services/anamnesis.service.js";

/**
 * INC-09 (HU-09/10/11/28) — rutas de la anamnesis deportiva.
 *
 * Contrato API RATIFICADO (spec INC-09, 2026-11-04) — endpoints:
 *  - `GET /clientes/:clienteId/anamnesis` (DUENO|RECEPCIONISTA|CLIENTE solo la
 *    propia): payload filtrado por rol; SIN_REGISTRO = 200 + marcador R2.
 *  - `GET /portal/anamnesis` (CLIENTE por token, sin id en URL — R2/C9).
 *  - `POST /clientes/:clienteId/anamnesis` (solo DUENO, DEC-058): 201 / 409
 *    ANAMNESIS_EXISTENTE (DEC-057: registro unico).
 *  - `PATCH /clientes/:clienteId/anamnesis` (solo DUENO): merge R3/C3a.
 *  - Sin DELETE (DEC-057: registro unico sin ciclo de vida).
 *
 * Orden de errores R7 (tabla determinista; el primer paso que aplica responde;
 * sin escritura en 4xx):
 *  - GET: 401 -> 403 rol (preHandler) -> 400 params -> 403 self-only (CLIENTE
 *    ajeno, mensaje propio, ANTES de 404 para no revelar existencia —
 *    SEC-01/SEC-03) -> 404 cliente (solo staff) -> 200 (vista por rol |
 *    SIN_REGISTRO).
 *  - POST: 401/403 (`authenticateRoles(["DUENO"])`) -> 400 params -> 400 body
 *    (Zod, primer error INC05-CONF-01; AN-26 si no hay nada diligenciado) ->
 *    404 cliente -> 409 ya existe -> 201.
 *  - PATCH: 401/403 -> 400 params -> 400 body (campos presentes + AN-26; sin
 *    consistencia cruzada) -> 404 cliente -> 404 anamnesis
 *    (ANAMNESIS_NO_ENCONTRADA) -> 400 consistencia SI/NO del ESTADO FUSIONADO
 *    -> 200.
 *  - Literales: 404 cliente = "Cliente no encontrado"/NOT_FOUND; 400 =
 *    VALIDATION_ERROR; 409 = ANAMNESIS_EXISTENTE; 404 anamnesis =
 *    "El cliente no tiene una anamnesis registrada"/ANAMNESIS_NO_ENCONTRADA.
 *
 * MONTAJE: este modulo es el router de anamnesis (`src/routes/anamnesis.ts`,
 * export default, patron del repo). Se registra en `src/index.ts` para el
 * servidor real; los tests lo cargan por especificador variable
 * (`inc09-anamnesis-helpers.ts`). NO se monta dentro de `clientes.ts` ni
 * `portal.ts` para evitar doble registro de rutas.
 *
 * El rol sale SIEMPRE del token; `plugins/auth.ts` y el PIN obligatorio quedan
 * intactos (solo se consume `authenticateRoles`).
 */
export default async function anamnesisRoutes(fastify: FastifyInstance) {
  // ── GET /clientes/:clienteId/anamnesis — vista por rol ──────────────────
  fastify.get(
    "/clientes/:clienteId/anamnesis",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA", "CLIENTE"])] },
    async (request, reply) => {
      const paramsResult = anamnesisParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      const { clienteId } = paramsResult.data;
      const usuario = request.user as { id: string; rol: string };

      // R7: 403 self-only ANTES de 404 (SEC-01/SEC-03: no revelar existencia).
      if (usuario.rol === "CLIENTE" && usuario.id !== clienteId) {
        return reply.status(403).send({
          error: "No tienes permisos para realizar esta acción.",
          code: "AUTH_FORBIDDEN",
        });
      }

      // R7: 404 cliente (solo staff; el CLIENTE propio ya existe por token).
      if (usuario.rol !== "CLIENTE") {
        const clienteExiste = await existeCliente(clienteId);
        if (!clienteExiste) {
          return reply.status(404).send({
            error: "Cliente no encontrado",
            code: "NOT_FOUND",
          });
        }
      }

      const registro = await obtenerAnamnesis(clienteId);
      if (!registro) {
        return reply.status(200).send(vistaSinRegistro());
      }

      if (usuario.rol === "RECEPCIONISTA") {
        return reply.status(200).send(vistaRecepcion(registro));
      }
      if (usuario.rol === "CLIENTE") {
        return reply.status(200).send(vistaClienteSecciones(registro));
      }
      return reply.status(200).send(vistaDueno(registro));
    }
  );

  // ── GET /portal/anamnesis — CLIENTE por token (sin id en URL — R2/C9) ───
  fastify.get(
    "/portal/anamnesis",
    { preHandler: [fastify.authenticateRoles(["CLIENTE"])] },
    async (request, reply) => {
      const clienteId = (request.user as { id: string }).id;

      const registro = await obtenerAnamnesis(clienteId);
      if (!registro) {
        return reply.status(200).send(vistaSinRegistro());
      }
      return reply.status(200).send(vistaClienteSecciones(registro));
    }
  );

  // ── POST /clientes/:clienteId/anamnesis — solo DUENO (DEC-058) ─────────
  fastify.post(
    "/clientes/:clienteId/anamnesis",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      const paramsResult = anamnesisParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      const { clienteId } = paramsResult.data;

      // R7: 400 body (Zod, primer error) ANTES de 404/409. R4: un obligatorio
      // faltante NO es 400 (guardado parcial -> PENDIENTE); el 400 de AN-26 es
      // por body sin ningun campo diligenciado.
      const bodyResult = guardarParcialAnamnesisSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }

      const clienteExiste = await existeCliente(clienteId);
      if (!clienteExiste) {
        return reply.status(404).send({
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        });
      }

      const actorId = (request.user as { id: string }).id;
      const resultado = await crearAnamnesis(clienteId, bodyResult.data, actorId);
      if (resultado.estado === "EXISTENTE") {
        return reply.status(409).send({
          error: "El cliente ya tiene una anamnesis registrada. Use la actualizacion.",
          code: "ANAMNESIS_EXISTENTE",
        });
      }
      return reply.status(201).send(vistaDueno(resultado.registro));
    }
  );

  // ── PATCH /clientes/:clienteId/anamnesis — solo DUENO, merge R3/C3a ────
  fastify.patch(
    "/clientes/:clienteId/anamnesis",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      const paramsResult = anamnesisParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      const { clienteId } = paramsResult.data;

      // R7: 400 body (campos presentes + AN-26; primer error). Sin
      // consistencia cruzada aqui: las contradicciones SI/NO se validan sobre
      // el estado fusionado (post-404) — R3.
      const bodyResult = guardarParcialSinConsistenciaSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }

      const clienteExiste = await existeCliente(clienteId);
      if (!clienteExiste) {
        return reply.status(404).send({
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        });
      }

      // Claves presentes en el body crudo: distinguen "ausente = conserva" de
      // "null/\"\" = vacia" (R3/C3a).
      const clavesPresentes = new Set(Object.keys(request.body ?? {}));
      const actorId = (request.user as { id: string }).id;
      const resultado = await actualizarAnamnesis(
        clienteId,
        bodyResult.data,
        clavesPresentes,
        actorId
      );

      if (resultado.estado === "SIN_REGISTRO") {
        return reply.status(404).send({
          error: "El cliente no tiene una anamnesis registrada",
          code: "ANAMNESIS_NO_ENCONTRADA",
        });
      }
      if (resultado.estado === "CONTRADICCION") {
        return reply.status(400).send({
          error: resultado.mensaje,
          code: "VALIDATION_ERROR",
        });
      }
      return reply.status(200).send(vistaDueno(resultado.registro));
    }
  );
}
