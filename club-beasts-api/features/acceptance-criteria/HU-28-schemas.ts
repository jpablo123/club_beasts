import { z } from "zod";
import { anamnesisDatosSchema, SECCIONES_ANAMNESIS } from "./HU-09-schemas";
import { estadoAnamnesisSchema } from "./HU-11-schemas";

/**
 * Contrato propuesto de validación — HU-28: Visualización de anamnesis en modo
 * lectura (portal del cliente). Generado por acceptance-criteria-analyst
 * (modo CREAR, INC-09-anamnesis-deportiva).
 *
 * FUENTE: HU-28 (historias-usuario-gimnasio.md 4.7) + HU-10 bullet 3 + Anexo DEC-052.
 *
 * Reglas:
 *   - El cliente consulta SU anamnesis en SOLO LECTURA (HU-28 bullets 1-2):
 *     aquí NO existe schema de escritura para el rol CLIENTE — la omisión es
 *     deliberada; una escritura con token CLIENTE debe responder 403
 *     (HU28-AN-29).
 *   - El contenido se presenta ORGANIZADO POR SECCIONES S1-S4 (HU-28 bullet 3):
 *     `anamnesisClienteSeccionesSchema` agrupa los campos con `.pick()` sobre
 *     el contrato canónico (mismas claves y literales del Anexo DEC-052).
 *   - Privacidad: el cliente ve SU anamnesis completa (incluidos sus
 *     antecedentes sensibles: son datos propios) pero NUNCA la de otro cliente
 *     (SEC-01/SEC-03, GAP-001) ni datos internos del staff: se expone
 *     `fechaActualizacion` sin `actualizadoPorId` (analogía DEC-041/DEC-036).
 *   - Sin anamnesis registrada: respuesta clara `SIN_REGISTRO` con mensaje
 *     (patrón de HU-27 "mensaje claro si no existe plan activo").
 *
 * Autónomo: solo depende de `zod` y de `./HU-09-schemas` / `./HU-11-schemas`
 * (fuente única de verdad de los campos y del estado).
 *
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por backend-developer
 * en el spec de INC-09 (no decide rutas HTTP ni Prisma).
 */

/**
 * Vista del cliente: sus datos completos (25 propiedades nulables) + estado
 * derivado (PENDIENTE/COMPLETA, HU-11) + fecha de actualización. SIN
 * `actualizadoPorId` (identidad del staff no se expone al cliente).
 */
export const anamnesisClienteSchema = anamnesisDatosSchema.extend({
  clienteId: z.string().min(1),
  estado: estadoAnamnesisSchema,
  fechaActualizacion: z.string().min(1),
});

export type AnamnesisCliente = z.infer<typeof anamnesisClienteSchema>;

/**
 * Misma anamnesis agrupada por las 4 secciones exactas del formulario
 * (HU28-AN-30). Cada sección es un `.pick()` del contrato canónico: las claves
 * y literales coinciden 1:1 con el Anexo DEC-052.
 */
export const anamnesisClienteSeccionesSchema = z.object({
  clienteId: z.string().min(1),
  estado: estadoAnamnesisSchema,
  fechaActualizacion: z.string().min(1),
  secciones: z.object({
    S1: anamnesisDatosSchema.pick({
      nombreCompleto: true,
      numeroDocumento: true,
      sexo: true,
      rh: true,
      edad: true,
      fechaNacimiento: true,
      lugarNacimiento: true,
      estadoCivil: true,
      direccionResidencia: true,
      numeroContacto: true,
      correoElectronico: true,
    }),
    S2: anamnesisDatosSchema.pick({
      practicaDeporte: true,
      cualDeporte: true,
      tiempoQuePractica: true,
    }),
    S3: anamnesisDatosSchema.pick({
      contactoEmergencia: true,
      eps: true,
      antecedentesMedicos: true,
      antecedentesFamiliares: true,
      enfermedadRelevante: true,
      cualEnfermedad: true,
    }),
    S4: anamnesisDatosSchema.pick({
      objetivosEntrenamiento: true,
      nivelActividad: true,
      diasNoEntrenamiento: true,
      horaAcostarse: true,
      comidasPorDia: true,
    }),
  }),
});

export type AnamnesisClienteSecciones = z.infer<typeof anamnesisClienteSeccionesSchema>;

/**
 * Sin anamnesis registrada (HU28-AN-32): mensaje claro, nunca un error 500 ni
 * una pantalla vacía. Títulos de referencia de secciones para la UI (los
 * literales del formulario vienen de `SECCIONES_ANAMNESIS` de HU-09).
 */
export const anamnesisSinRegistroSchema = z.object({
  estado: z.literal("SIN_REGISTRO"),
  mensaje: z.string().min(1),
});

export type AnamnesisSinRegistro = z.infer<typeof anamnesisSinRegistroSchema>;

export { SECCIONES_ANAMNESIS };
