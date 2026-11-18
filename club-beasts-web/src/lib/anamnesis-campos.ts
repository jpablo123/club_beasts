/**
 * INC-09 (GREEN T10) — Metadatos de los 23 campos / 25 propiedades de la
 * anamnesis deportiva (Anexo DEC-052 + Anexo DEC-052 compuestos 6 y 18).
 *
 * Fuente de literales: etiquetas EXACTAS del formulario real (DEC-052/Anexo),
 * fijadas por el RED (`tests/unit/inc09-anamnesis-vista.test.tsx` y
 * `tests/e2e/inc09-anamnesis-*`). Los tipos de control y las opciones salen
 * del contrato canónico HU-09 (`SEXO`, `SI_NO`, `ANTECEDENTES_MEDICOS`,
 * `DIAS_NO_ENTRENAMIENTO`, `NIVEL_ACTIVIDAD` — espejo en
 * `src/lib/anamnesis-schemas.ts`).
 */
import {
  ANTECEDENTES_MEDICOS,
  DIAS_NO_ENTRENAMIENTO,
  NIVEL_ACTIVIDAD,
  SEXO,
  SI_NO,
} from "./anamnesis-schemas";

/** Tipo de control del formulario DUENO (C3). */
export type TipoControl =
  | "texto"
  | "textoLargo"
  | "numero"
  | "fecha"
  | "hora"
  | "select"
  | "multi";

/** Claves del contrato cerrado de 25 propiedades (DEC-052 + compuestos). */
export type ClaveAnamnesis =
  | "nombreCompleto"
  | "numeroDocumento"
  | "sexo"
  | "rh"
  | "edad"
  | "fechaNacimiento"
  | "lugarNacimiento"
  | "estadoCivil"
  | "direccionResidencia"
  | "numeroContacto"
  | "correoElectronico"
  | "practicaDeporte"
  | "cualDeporte"
  | "tiempoQuePractica"
  | "contactoEmergencia"
  | "eps"
  | "antecedentesMedicos"
  | "antecedentesFamiliares"
  | "enfermedadRelevante"
  | "cualEnfermedad"
  | "objetivosEntrenamiento"
  | "nivelActividad"
  | "diasNoEntrenamiento"
  | "horaAcostarse"
  | "comidasPorDia";

export interface CampoAnamnesis {
  clave: ClaveAnamnesis;
  /** Etiqueta EXACTA del Anexo DEC-052. */
  etiqueta: string;
  tipo: TipoControl;
  /** Opciones literales para `select` / `multi` (orden del canónico). */
  opciones?: readonly string[];
  /** 13..100 / 1..12 (DEC-059). */
  min?: number;
  max?: number;
  filas?: number;
}

/**
 * RH select de 8 valores reales (DEC-059, regex canónico
 * `/^(A|B|AB|O)[+-]$/i`): las 8 combinaciones en orden clínico habitual.
 */
export const RH_OPCIONES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/** Las 25 propiedades en el orden del formulario (S1..S4). */
export const CAMPOS_ANAMNESIS: readonly CampoAnamnesis[] = [
  // S1 — Identificación personal
  { clave: "nombreCompleto", etiqueta: "Nombre completo", tipo: "texto" },
  { clave: "numeroDocumento", etiqueta: "Número de documento", tipo: "texto" },
  { clave: "sexo", etiqueta: "Sexo", tipo: "select", opciones: SEXO },
  { clave: "rh", etiqueta: "RH", tipo: "select", opciones: RH_OPCIONES },
  { clave: "edad", etiqueta: "Edad", tipo: "numero", min: 13, max: 100 },
  { clave: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha" },
  { clave: "lugarNacimiento", etiqueta: "Lugar de nacimiento", tipo: "texto" },
  { clave: "estadoCivil", etiqueta: "Estado civil", tipo: "texto" },
  { clave: "direccionResidencia", etiqueta: "Dirección de residencia", tipo: "texto" },
  { clave: "numeroContacto", etiqueta: "Número de contacto", tipo: "texto" },
  { clave: "correoElectronico", etiqueta: "Correo electrónico", tipo: "texto" },
  // S2 — Deporte
  {
    clave: "practicaDeporte",
    etiqueta: "Practica algún deporte",
    tipo: "select",
    opciones: SI_NO,
  },
  { clave: "cualDeporte", etiqueta: "Cual deporte", tipo: "texto" },
  { clave: "tiempoQuePractica", etiqueta: "Tiempo que practica", tipo: "texto" },
  // S3 — Emergencia y salud
  { clave: "contactoEmergencia", etiqueta: "Contacto de emergencia", tipo: "textoLargo", filas: 2 },
  { clave: "eps", etiqueta: "EPS", tipo: "texto" },
  {
    clave: "antecedentesMedicos",
    etiqueta: "Antecedentes médicos",
    tipo: "multi",
    opciones: ANTECEDENTES_MEDICOS,
  },
  {
    clave: "antecedentesFamiliares",
    etiqueta: "Antecedentes familiares",
    tipo: "textoLargo",
    filas: 2,
  },
  {
    clave: "enfermedadRelevante",
    etiqueta: "Enfermedad relevante",
    tipo: "select",
    opciones: SI_NO,
  },
  { clave: "cualEnfermedad", etiqueta: "Cual enfermedad", tipo: "textoLargo", filas: 2 },
  // S4 — Objetivos y estilo de vida
  {
    clave: "objetivosEntrenamiento",
    etiqueta: "Objetivos de entrenamiento",
    tipo: "textoLargo",
    filas: 3,
  },
  {
    clave: "nivelActividad",
    etiqueta: "Nivel de actividad",
    tipo: "select",
    opciones: NIVEL_ACTIVIDAD,
  },
  {
    clave: "diasNoEntrenamiento",
    etiqueta: "Días que no puede entrenar",
    tipo: "multi",
    opciones: DIAS_NO_ENTRENAMIENTO,
  },
  { clave: "horaAcostarse", etiqueta: "Hora para acostarse", tipo: "hora" },
  { clave: "comidasPorDia", etiqueta: "Comidas al día", tipo: "numero", min: 1, max: 12 },
];

/** Hints exactos de la Enmienda DEC-072 por clave. */
export const HINTS_CAMPOS: Record<ClaveAnamnesis, string> = {
  nombreCompleto: "Tal como aparece en tu documento de identidad.",
  numeroDocumento: "Cedula o documento de identidad.",
  sexo: "Selecciona FEMENINO o MASCULINO.",
  rh: "Grupo sanguineo con factor (ej. O+).",
  edad: "Edad en anos (13 a 100).",
  fechaNacimiento: "Fecha (YYYY-MM-DD) y lugar de nacimiento.",
  lugarNacimiento: "Fecha (YYYY-MM-DD) y lugar de nacimiento.",
  estadoCivil: "Opcional.",
  direccionResidencia: "Direccion actual de residencia.",
  numeroContacto: "Telefono de contacto.",
  correoElectronico: "Opcional; formato de correo valido.",
  practicaDeporte: "Selecciona SI o NO.",
  cualDeporte: "Solo si practica deporte (SI en la pregunta anterior).",
  tiempoQuePractica: "Tiempo que lleva practicandolo.",
  contactoEmergencia: "Nombre y numero de la persona a contactar en emergencia.",
  eps: "EPS actual.",
  antecedentesMedicos: "Marca lo que aplique; \"Ninguno\" excluye el resto.",
  antecedentesFamiliares: "Indica parentesco (padres, abuelos, hermanos) y cuales.",
  enfermedadRelevante: "Selecciona SI o NO.",
  cualEnfermedad: "Solo si respondio SI en la pregunta anterior.",
  objetivosEntrenamiento: "Describe los objetivos que deseas al entrenar.",
  nivelActividad: "Elige el nivel que mejor te describa (sin considerar el deporte).",
  diasNoEntrenamiento: "Marca los dias de la semana que no puede entrenar.",
  horaAcostarse: "Formato HH:mm.",
  comidasPorDia: "Numero de comidas por dia (1 a 12).",
};

/** Campos sensibles DEC-055. */
export const CAMPOS_SENSIBLES: readonly ClaveAnamnesis[] = [
  "rh",
  "antecedentesMedicos",
  "antecedentesFamiliares",
  "enfermedadRelevante",
  "cualEnfermedad",
];

/** Etiqueta exacta del Anexo por clave. */
export const ETIQUETAS_CAMPOS: Record<ClaveAnamnesis, string> = CAMPOS_ANAMNESIS.reduce(
  (acc, campo) => {
    acc[campo.clave] = campo.etiqueta;
    return acc;
  },
  {} as Record<ClaveAnamnesis, string>
);

/** Claves de los campos compuestos que se limpian con la pregunta a "NO" (AN-07). */
export const CONDICIONALES: Record<string, ClaveAnamnesis> = {
  practicaDeporte: "cualDeporte",
  enfermedadRelevante: "cualEnfermedad",
};

/** Valor del campo en el DTO de lectura (puede viajar como `null`). */
export type ValorAnamnesis = string | number | string[] | null | undefined;

/** 25 propiedades de datos (lectura) + metadatos de trazabilidad (staff). */
export type AnamnesisDatos = Partial<Record<ClaveAnamnesis, ValorAnamnesis>>;

export interface AnamnesisStaffDTO extends AnamnesisDatos {
  clienteId: string;
  estado: "PENDIENTE" | "COMPLETA";
  fechaActualizacion: string;
  actualizadoPorId: string;
}

/** SIN_REGISTRO (R2): 200 + mensaje claro, idéntico para los 3 roles. */
export interface AnamnesisSinRegistro {
  estado: "SIN_REGISTRO";
  mensaje: string;
}

/** Vista CLIENTE agrupada S1-S4 (`anamnesisClienteSeccionesSchema`). */
export interface AnamnesisPortalDTO {
  clienteId: string;
  estado: "PENDIENTE" | "COMPLETA";
  fechaActualizacion: string;
  secciones: Record<string, AnamnesisDatos>;
}

export type AnamnesisRespuestaStaff = AnamnesisStaffDTO | AnamnesisSinRegistro;
export type AnamnesisRespuestaPortal = AnamnesisPortalDTO | AnamnesisSinRegistro;

export function esSinRegistro(
  dto: AnamnesisRespuestaStaff | AnamnesisRespuestaPortal
): dto is AnamnesisSinRegistro {
  return dto.estado === "SIN_REGISTRO";
}

/** Valor de presentación de un campo (arrays unidos con ", "). */
export function formatearValor(valor: ValorAnamnesis): string {
  if (Array.isArray(valor)) return valor.join(", ");
  if (valor === null || valor === undefined) return "";
  return String(valor);
}
