import { getSession } from "next-auth/react";
import { recoverSession } from "./session-recovery";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiError extends Error {
  message: string;
  code?: string;
  status?: number;
  kind:
    | "network"
    | "session_expired"
    | "invalid_credentials"
    | "forbidden"
    | "validation"
    | "server"
    | "unknown";
}

/** Estados que el backend calcula para una vigencia (HU-15 / HU-16). */
export type EstadoMembresia = "PROGRAMADA" | "ACTIVA" | "VENCIDA" | "CONGELADO";

/** Fila de auditoria de una vigencia (`cambios` del DTO `toDTO`). */
export interface MembresiaCambio {
  id: string;
  accion: string;
  version: number;
  motivo?: string | null;
  congelacionInicio?: string;
  congelacionFin?: string;
  fechaInicioAnterior: string | null;
  fechaFinAnterior: string | null;
  fechaInicioNueva: string;
  fechaFinNueva: string;
  actor: { id: string; nombre: string };
  createdAt: string;
}

/**
 * Respuesta 200 de `congelar`, `descongelar` y `editarCongelacion`
 * (spec INC-02, "Respuesta de exito"): el DTO de la vigencia extendido con
 * `fechaFinAnterior`, los dias de la operacion y el bloque `congelacion`.
 */
export interface ResultadoPausa {
  id: string;
  clienteId: string;
  fechaInicio: string;
  fechaFin: string;
  fechaFinAnterior: string;
  diasCongelados?: number;
  diasCongeladosAnterior?: number;
  diasDevueltos?: number;
  estado: EstadoMembresia;
  version: number;
  createdAt: string;
  updatedAt: string;
  creadoPor: { id: string; nombre: string };
  actualizadoPor: { id: string; nombre: string };
  cambios: MembresiaCambio[];
  congelacion: {
    fechaInicio: string;
    fechaFin: string;
    motivo: string;
    diasCongelados: number;
  } | null;
}

function createApiError(
  message: string,
  opts: { code?: string; status?: number; kind?: ApiError["kind"] } = {}
): ApiError {
  const err = new Error(message) as ApiError;
  err.code = opts.code;
  err.status = opts.status;
  err.kind = opts.kind ?? "unknown";
  return err;
}

function classifyError(status: number, data: Record<string, unknown>): ApiError {
  const code = typeof data.code === "string" ? data.code : undefined;
  const message =
    (typeof data.error === "string" && data.error) ||
    (typeof data.message === "string" && data.message) ||
    "Error en la solicitud";

  if (code === "AUTH_TOKEN_EXPIRED") {
    return createApiError(message, { code, status, kind: "session_expired" });
  }
  if (code === "AUTH_TOKEN_MISSING" || code === "AUTH_TOKEN_INVALID") {
    return createApiError(message, { code, status, kind: "session_expired" });
  }
  if (code === "AUTH_INVALID_CREDENTIALS") {
    return createApiError(message, { code, status, kind: "invalid_credentials" });
  }
  if (code === "AUTH_FORBIDDEN" || status === 403) {
    return createApiError(message, { code, status, kind: "forbidden" });
  }
  if (status === 401) {
    return createApiError(message, { code, status, kind: "session_expired" });
  }
  if (status >= 400 && status < 500) {
    return createApiError(message, { code, status, kind: "validation" });
  }
  return createApiError(message, { code, status, kind: "server" });
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = (session?.user as { apiToken?: string })?.apiToken ?? null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_URL}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw createApiError(
      `Error de red: no se pudo conectar con el servidor (${API_URL}). Verifique que el backend esté ejecutándose.`,
      { kind: "network" }
    );
  }

  const text = await res.text();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw createApiError(
      `Error del servidor: ${res.status} ${text.slice(0, 200)}`,
      { status: res.status, kind: "server" }
    );
  }

  if (!res.ok) {
    const error = classifyError(res.status, data);

    // Recuperación centralizada de sesión (INC00-AUTH-01).
    // Solo un 401 de sesión vencida/ausente dispara el cierre de sesión;
    // AUTH_INVALID_CREDENTIALS (AUTH-04), 403 (AUTH-05) y errores de red
    // (AUTH-06) conservan la sesión. La recuperación es single-flight y no
    // modifica el error que recibe la UI (mensaje aprobado del backend).
    if (res.status === 401 && error.kind === "session_expired") {
      await recoverSession(token);
    }

    throw error;
  }

  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    loginCliente: (cedula: string, pin: string) =>
      fetchApi("/auth/login-cliente", {
        method: "POST",
        body: JSON.stringify({ cedula, pin }),
      }),
    resetPin: (clienteId: string, newPin: string) =>
      fetchApi("/auth/reset-pin", {
        method: "POST",
        body: JSON.stringify({ clienteId, newPin }),
      }),
    changePin: (currentPin: string, newPin: string) =>
      fetchApi("/auth/change-pin", {
        method: "POST",
        body: JSON.stringify({ currentPin, newPin }),
      }),
  },
  clientes: {
    list: (params?: {
      search?: string;
      sedeId?: string;
      estado?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.sedeId) query.set("sedeId", params.sedeId);
      if (params?.estado) query.set("estado", params.estado);
      if (params?.page) query.set("page", String(params.page));
      // INC00-CLI-05: la paginacion de la lista usa limit (1..100, default 20).
      if (params?.limit) query.set("limit", String(params.limit));
      return fetchApi(`/clientes?${query.toString()}`);
    },
    get: (id: string) => fetchApi(`/clientes/${id}`),
    create: (data: Record<string, unknown>) =>
      fetchApi("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  membresias: {
    list: (clienteId: string) =>
      fetchApi(`/clientes/${clienteId}/membresias-gym`),
    create: (clienteId: string, data: { fechaInicio: string; fechaFin: string }) =>
      fetchApi(`/clientes/${clienteId}/membresias-gym`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      clienteId: string,
      membresiaId: string,
      data: { fechaInicio: string; fechaFin: string; version: number }
    ) =>
      fetchApi(`/clientes/${clienteId}/membresias-gym/${membresiaId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    // INC-02 (HU-15 + DEC-024): las 3 operaciones de pausa. Sin prefijo `/api`
    // (el backend registra rutas sin prefijo global) y con `version` en el body
    // (lock optimista INC00-MEM-03). Permiso: DUENO / RECEPCIONISTA (DEC-017).
    congelar: (
      clienteId: string,
      membresiaId: string,
      data: { fechaInicio: string; fechaFin: string; motivo: string; version: number }
    ) =>
      fetchApi(`/clientes/${clienteId}/vigencias/${membresiaId}/congelar`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    descongelar: (
      clienteId: string,
      membresiaId: string,
      data: { version: number; motivo?: string }
    ) =>
      fetchApi(`/clientes/${clienteId}/vigencias/${membresiaId}/descongelar`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    editarCongelacion: (
      clienteId: string,
      membresiaId: string,
      data: { fechaInicio: string; fechaFin: string; motivo: string; version: number }
    ) =>
      fetchApi(`/clientes/${clienteId}/vigencias/${membresiaId}/congelacion`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
