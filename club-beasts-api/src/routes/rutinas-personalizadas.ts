import { FastifyInstance } from "fastify";
import {
  crearRutinaPersonalizadaSchema,
  mensajePrimerErrorZod,
} from "../schemas/rutina.schema.js";
import {
  crearRutinaPersonalizada,
  responderError,
} from "../services/rutina.service.js";
import { BODY_LIMIT_RUTINAS } from "./rutinas.js";

/**
 * INC-10 (HU-19) — ruta de creacion de la rutina PERSONALIZADA estructurada
 * (endpoint 1b del contrato API RATIFICADO; sin prefijo /api).
 *
 *  - `POST /rutinas-personalizadas` (solo DUENO, DEC-065): 201
 *    `rutinaPersonalizadaDatosSchema`; 400 con el PRIMER error zod (INC05-
 *    CONF-01) e incluye `validarContencionCiclos` (RU-12) ejecutado en el
 *    SERVICIO (fechas hijo ⊆ padre). `tipoRutina` debe ser `PERSONALIZADA`.
 *
 * bodyLimit (R1#3): ver `BODY_LIMIT_RUTINAS` en `rutinas.ts` (solo rutas de
 * escritura de rutinas; el resto conserva el default de Fastify).
 */
export default async function rutinasPersonalizadasRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/rutinas-personalizadas",
    {
      bodyLimit: BODY_LIMIT_RUTINAS,
      preHandler: [fastify.authenticateRoles(["DUENO"])],
    },
    async (request, reply) => {
      const bodyResult = crearRutinaPersonalizadaSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }
      const actorId = (request.user as { id: string }).id;
      try {
        const datos = await crearRutinaPersonalizada(bodyResult.data, actorId);
        return reply.status(201).send(datos);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}
