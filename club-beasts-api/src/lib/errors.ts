import { Prisma } from "@prisma/client";

export type ApiErrorBody = { error: string; code: string };

type MappedPrismaError = ApiErrorBody & { status: number };

/**
 * Mapeo estandar de errores conocidos de Prisma a respuestas HTTP.
 *
 * Evita que errores de integridad (unicidad, FK, registro inexistente) escapen
 * como 500 con el mensaje interno del motor (p. ej. "Unique constraint failed on
 * the fields: (`membresiaId`,`version`)"), que filtaria detalles de esquema.
 */
const PRISMA_HTTP: Record<string, MappedPrismaError> = {
  P2002: {
    status: 409,
    code: "CONFLICTO",
    error: "La solicitud entra en conflicto con un registro existente",
  },
  P2003: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "La solicitud hace referencia a un registro inexistente",
  },
  P2004: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "La solicitud viola una restricción de datos",
  },
  P2011: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "Faltan datos obligatorios en la solicitud",
  },
  P2016: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "La solicitud no coincide con ningún registro",
  },
  P2017: {
    status: 404,
    code: "NOT_FOUND",
    error: "Registro no encontrado",
  },
  P2018: {
    status: 404,
    code: "NOT_FOUND",
    error: "Registro no encontrado",
  },
  P2019: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "Los datos de la solicitud están fuera del rango permitido",
  },
  P2020: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "Los datos de la solicitud están fuera del rango permitido",
  },
  P2023: {
    status: 400,
    code: "VALIDATION_ERROR",
    error: "Formato de dato incompatible con el esquema",
  },
  P2025: {
    status: 404,
    code: "NOT_FOUND",
    error: "Registro no encontrado",
  },
  P2026: {
    status: 409,
    code: "CONFLICTO",
    error: "La operación conflictuó con otra escritura simultánea. Intente de nuevo",
  },
  P2024: {
    status: 503,
    code: "SERVICE_UNAVAILABLE",
    error: "Servicio temporalmente no disponible. Intente de nuevo",
  },
  P2028: {
    status: 503,
    code: "SERVICE_UNAVAILABLE",
    error: "La operación tardó demasiado y fue cancelada. Intente de nuevo",
  },
};

/** Cuerpo 500 sin detalle interno para errores de Prisma sin mapeo explicito. */
export function internalPrismaErrorBody(): ApiErrorBody {
  return {
    error: "Error interno al procesar la solicitud",
    code: "INTERNAL_ERROR",
  };
}

/** True si el error proviene del cliente de Prisma (cualquier subtipo). */
export function esErrorPrismaClient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return true;
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return typeof name === "string" && name.startsWith("PrismaClient");
}

/** True si el error es un PrismaClientKnownRequestError con ese codigo. */
export function isPrismaCode(error: unknown, code: string): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === code;
  }
  return prismaKnownErrorCode(error) === code;
}

function prismaKnownErrorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { name?: unknown; code?: unknown };
  if (candidate.name !== "PrismaClientKnownRequestError") return null;
  return typeof candidate.code === "string" ? candidate.code : null;
}

/**
 * Convierte un error de Prisma conocido en status + cuerpo de respuesta.
 * Devuelve null cuando el error no es un error conocido de Prisma (el llamador
 * decide si lo propaga como 500).
 */
export function mapPrismaError(
  error: unknown
): { status: number; body: ApiErrorBody } | null {
  const code = prismaKnownErrorCode(error);
  if (!code) return null;
  const mapped = PRISMA_HTTP[code];
  if (!mapped) return null;
  return { status: mapped.status, body: { error: mapped.error, code: mapped.code } };
}
