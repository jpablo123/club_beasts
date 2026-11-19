import { getSession } from "next-auth/react";
import { recoverSession } from "./session-recovery";
import type {
  AnamnesisRespuestaPortal,
  AnamnesisRespuestaStaff,
  AnamnesisStaffDTO,
} from "./anamnesis-campos";
import type {
  BorradorPersonalizada,
  BorradorRutina,
} from "./rutina-schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiError extends Error {
  message: string;
  code?: string;
  status?: number;
  kind:
    | "network"
    | "session_expired"
    | "invalid_credentials"
    | "auth_cliente_inactivo"
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

/**
 * Estado de acceso del gimnasio expuesto por INC-03 en portal (#1) y
 * recepcion (#2). El backend calcula el enum; la UI solo lo traduce
 * (CONF-04). `SIN_VIGENCIA` no existe en `EstadoMembresia` porque describe
 * la ausencia de cualquier vigencia GYM (`HU25-C06`).
 */
export type EstadoAccesoGym = EstadoMembresia | "SIN_VIGENCIA";

export interface RangoCongelacion {
  fechaInicio: string;
  fechaFin: string;
}

/** Respuesta 200 de `GET /portal/resumen` (`portalResumenResponseSchema`). */
export interface PortalResumen {
  cliente: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    sede: { id: string; nombre: string };
  };
  estadoAccesoGym: EstadoAccesoGym;
  /** `fechaFin` en `YYYY-MM-DD`; `null` sin vigencia (HU25-C03/C06). */
  fechaVencimiento: string | null;
  /** Solo presente con `estadoAccesoGym = CONGELADO` (HU25-C04). */
  congelacion: RangoCongelacion | null;
  fechaActual: string;
  /**
   * INC-06 (DEC-048, R3): `true` cuando el cliente no tiene NINGUNA vigencia
   * `ACTIVA`/`CONGELADO` en GYM/PERSONALIZADO/NUTRICION (R1: solo vigencias;
   * el estado general del cliente no entra en este flag). Campo top-level
   * unico nuevo, aditivo sobre G14 (HU-25).
   */
  sinMembresiaActiva: boolean;
}

/** Alerta operativa no sensible derivada del estado (DEC-028). */
export interface AlertaRecepcion {
  codigo: string;
  mensaje: string;
}

/** Respuesta 200 de `GET /recepcion/consulta` (`consultaRecepcionResponseSchema`). */
export interface ConsultaRecepcion {
  id: string;
  nombreCompleto: string;
  cedula: string;
  sede: { id: string; nombre: string };
  /** Siempre `null` en INC-03 (DEC-029: no existe `Cliente.foto`). */
  foto: string | null;
  estadoAccesoGym: EstadoAccesoGym;
  fechaVencimiento: string | null;
  congelacion: RangoCongelacion | null;
  ultimoIngreso: {
    fecha: string;
    hora: string;
    sede: { id: string; nombre: string };
  } | null;
  alertas: AlertaRecepcion[];
  fechaActual: string;
}

/** Fila de `Ingreso` (HU-30 / `ingresoResponseSchema`). */
export interface Ingreso {
  id: string;
  clienteId: string;
  cedula: string;
  fecha: string;
  hora: string;
  sede: { id: string; nombre: string };
  registradoPor: { id: string; nombre: string };
  createdAt: string;
}

/** Respuesta 200 de `GET /recepcion/ingresos` (`ingresosListResponseSchema`). */
export interface IngresosList {
  ingresos: Ingreso[];
  total: number;
}

/** Respuesta 201 de `POST /recepcion/clientes-rapidos` (`clienteRapidoResponseSchema`). */
export interface ClienteRapido {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string | null;
  sede: { id: string; nombre: string };
  estado: string;
  perfilPendiente: boolean;
  observaciones: string | null;
  creadoPor: { id: string; nombre: string };
}

// ---------------------------------------------------------------------------
// INC-10 (bloque 6): DTOs de rutinas, asignaciones y portal (contrato R1..R8)
// ---------------------------------------------------------------------------

export interface RutinaResumenDTO {
  id: string;
  nombre: string;
  tipoRutina: string;
  descripcion: string | null;
}

export interface RutinasListaDTO {
  rutinas: RutinaResumenDTO[];
  total: number;
}

export interface RutinaAsignacionDTO {
  id: string;
  clienteId: string;
  rutina: RutinaResumenDTO;
  fechaInicio: string;
  fechaFin: string | null;
  estado: "ACTIVA" | "CERRADA";
  actor: { id: string; nombre: string };
  contenidoSnapshot?: Record<string, unknown> | null;
}

export interface HistorialRutinasDTO {
  clienteId: string;
  asignaciones: RutinaAsignacionDTO[];
  total: number;
}

/** Estados del endpoint #7 (DEC-066/DEC-070: ocultaciÃ³n sin borrar). */
export type EstadoRutinaActiva = "ACTIVA" | "SIN_RUTINA" | "OCULTA_POR_VIGENCIA";

export interface RutinaActivaDTO {
  clienteId: string;
  asignacion: RutinaAsignacionDTO | null;
  estado: EstadoRutinaActiva;
}

/** Respuesta del portal (rutina del snapshot o `{ mensaje }`). */
export type RespuestaPortalRutina = Record<string, unknown> & {
  mensaje?: string;
};

function createApiError(
  message: string,
  opts: { code?: string; status?: number; kind?: ApiError["kind"] } = {}
): ApiError {  const err = new Error(message) as ApiError;
  err.code = opts.code;
  err.status = opts.status;
  err.kind = opts.kind ?? "unknown";
  return err;
}

/**
 * Body de un error HTTP como objeto. `JSON.parse` puede devolver escalares o
 * `null` (respuesta inesperada): en ese caso se trata como objeto vacio para
 * que `classifyError` siempre produzca un `ApiError` clasificado en vez de
 * lanzar un `TypeError` al leer `data.code`.
 */
function asErrorBody(data: unknown): Record<string, unknown> {
  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : {};
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
  // INC04-R11 (DEC-034): el 401 de cuenta inactiva del portal NO es sesion
  // vencida. Se clasifica ANTES del fallback 401 para que un login de cliente
  // inactivo no dispare `recoverSession` ni borre el mensaje aprobado del
  // backend ("La cuenta esta inactiva. Contacte con recepcion.").
  if (code === "AUTH_CLIENTE_INACTIVO") {
    return createApiError(message, {
      code,
      status,
      kind: "auth_cliente_inactivo",
    });
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

/**
 * Ejecuta una llamada al backend y devuelve el body JSON parseado.
 *
 * El body se parsea como `unknown` porque `JSON.parse` no garantiza forma.
 * `T` es el contrato DTO del endpoint (los schemas de respuesta del backend,
 * p. ej. `clienteRapidoResponseSchema`); la conversion `unknown -> T` es la
 * UNICA asercion del modulo y vive solo aqui: el web no valida en runtime
 * (sin zod), por eso el caller declara el tipo y los call sites quedan
 * tipados sin casts. El default conserva el comportamiento historico
 * (`Record<string, unknown>`) para los endpoints sin DTO declarado.
 */
async function fetchApi<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
      `Error de red: no se pudo conectar con el servidor (${API_URL}). Verifique que el backend estÃ© ejecutÃ¡ndose.`,
      { kind: "network" }
    );
  }

  const text = await res.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw createApiError(
      `Error del servidor: ${res.status} ${text.slice(0, 200)}`,
      { status: res.status, kind: "server" }
    );
  }

  if (!res.ok) {
    const error = classifyError(res.status, asErrorBody(data));

    // RecuperaciÃ³n centralizada de sesiÃ³n (INC00-AUTH-01).
    // Solo un 401 de sesiÃ³n vencida/ausente dispara el cierre de sesiÃ³n;
    // AUTH_INVALID_CREDENTIALS (AUTH-04), 403 (AUTH-05) y errores de red
    // (AUTH-06) conservan la sesiÃ³n. La recuperaciÃ³n es single-flight y no
    // modifica el error que recibe la UI (mensaje aprobado del backend).
    if (res.status === 401 && error.kind === "session_expired") {
      await recoverSession(token);
    }

    throw error;
  }

  return data as T;
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
    // `T` documenta la forma del DTO que devuelve el PATCH (el backend responde
    // con el select del cliente); default `Record<string, unknown>` para los
    // call sites que ignoran la respuesta. INC-03 / DEC-033 lo consume como
    // `ClienteRapido` (contrato fijado por el RED de recepcion-rapida).
    update: <T = Record<string, unknown>>(id: string, data: Record<string, unknown>) =>
      fetchApi<T>(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    historial: <T = any>(id: string, params?: { tipo?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.tipo) query.set("tipo", params.tipo);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      const qs = query.toString();
      return fetchApi<T>(`/clientes/${id}/historial${qs ? `?${qs}` : ""}`);
    },
    resetPin: (id: string) =>
      fetchApi(`/clientes/${id}/reset-pin`, { method: "POST", body: JSON.stringify({}) }),
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
    cancelar: (clienteId: string, membresiaId: string) =>
      fetchApi(`/clientes/${clienteId}/vigencias/${membresiaId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({}),
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
  // INC-05 (contrato #2/#5, ratificado 2026-10-20): listados propios de cada
  // servicio, con `tipoServicio` filtrado server-side. Respuesta
  // `{ servicios, fechaActual }` (clave `servicios`, correccion C6(iii)).
  servicios: {
    personalizado: (clienteId: string) =>
      fetchApi(`/clientes/${clienteId}/servicios-personalizado`),
    nutricion: (clienteId: string) =>
      fetchApi(`/clientes/${clienteId}/servicios-nutricion`),
  },
  // INC-03 (endpoint #1): resumen del portal del cliente, sesion CLIENTE.
  portal: {
    resumen: () => fetchApi("/portal/resumen"),
    // INC-09 (endpoint 1b, R2/C9): anamnesis propia agrupada S1-S4 por token
    // CLIENTE (sin id en URL). SIN_REGISTRO = 200 + { estado, mensaje }.
    anamnesis: <T = AnamnesisRespuestaPortal>() => fetchApi<T>("/portal/anamnesis"),
    // INC-10 (endpoint 8, C8): rutina activa del cliente desde el snapshot
    // (DEC-067/DEC-068) o `{ mensaje: SIN_RUTINA_MENSAJE }`.
    rutina: <T = RespuestaPortalRutina>() => fetchApi<T>("/portal/rutina"),
    planNutricional: <T = any>() => fetchApi<T>("/portal/plan-nutricional"),
  },
  // INC-10 (endpoints #1..#4, contrato R1): creaciÃ³n/listado/detalle/ediciÃ³n
  // de rutinas. POST separado por familia (DEC-064 vs DEC-018); PATCH unificado
  // por tipo persistido (sin `tipoRutina` en el body: es inmutable).
  rutinas: {
    listar: <T = RutinasListaDTO>(params?: { tipo?: string; nombre?: string }) => {
      const query = new URLSearchParams();
      if (params?.tipo) query.set("tipo", params.tipo);
      if (params?.nombre) query.set("nombre", params.nombre);
      const qs = query.toString();
      return fetchApi<T>(`/rutinas${qs ? `?${qs}` : ""}`);
    },
    obtener: <T = Record<string, unknown>>(rutinaId: string) =>
      fetchApi<T>(`/rutinas/${rutinaId}`),
    asignarBulk: <T = Record<string, unknown>>(rutinaId: string, data: { clienteIds: string[] }) =>
      fetchApi<T>(`/rutinas/${rutinaId}/asignar`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    crear: <T = Record<string, unknown>>(data: BorradorRutina) =>
      fetchApi<T>("/rutinas", { method: "POST", body: JSON.stringify(data) }),
    crearPersonalizada: <T = Record<string, unknown>>(data: BorradorPersonalizada) =>
      fetchApi<T>("/rutinas-personalizadas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    actualizar: <T = Record<string, unknown>>(
      rutinaId: string,
      data: Record<string, unknown>
    ) =>
      fetchApi<T>(`/rutinas/${rutinaId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  // INC-10 (endpoints #5..#7, C5/C6/C9): asignaciÃ³n, historial y estado activo
  // en la ficha staff. `/asignacion` (singular) fijado en DEC-070.
  asignaciones: {
    crear: <T = RutinaAsignacionDTO>(
      clienteId: string,
      data: { rutinaId: string; fechaInicio?: string }
    ) =>
      fetchApi<T>(`/clientes/${clienteId}/rutinas/asignacion`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    historial: <T = HistorialRutinasDTO>(clienteId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/rutinas/historial`),
    activa: <T = RutinaActivaDTO>(clienteId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/rutinas/activa`),
  },
  // INC-09 (endpoints #1/#2/#3, contrato ratificado 2026-11-04): anamnesis
  // deportiva 1:1 con el cliente. GET filtra por rol (DUENO plana 25/25;
  // RECEP 20/25 sin las 5 claves de DEC-055; ambos con metadatos staff).
  // POST/PATCH solo DUENO (DEC-058). PATCH = merge R3/C3a: clave ausente =
  // conserva; `null`/`""` = vacia; valor = valida y reemplaza.
  anamnesis: {
    get: <T = AnamnesisRespuestaStaff>(clienteId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/anamnesis`),
    create: <T = AnamnesisStaffDTO>(clienteId: string, data: Record<string, unknown>) =>
      fetchApi<T>(`/clientes/${clienteId}/anamnesis`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: <T = AnamnesisStaffDTO>(clienteId: string, data: Record<string, unknown>) =>
      fetchApi<T>(`/clientes/${clienteId}/anamnesis`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  // INC-03 (endpoints #2..#5): superficie de recepcion, sesion staff
  // (DUENO / RECEPCIONISTA; el CLIENTE queda fuera por middleware + UI).
  recepcion: {
    // Cada endpoint declara su DTO de respuesta (mismo schema que valida el
    // backend), asi los call sites consumen el tipo sin casts intermedios.
    consulta: (cedula: string) =>
      fetchApi<ConsultaRecepcion>(
        `/recepcion/consulta?cedula=${encodeURIComponent(cedula)}`
      ),
    registrarIngreso: (data: { cedula: string; sedeId: string }) =>
      fetchApi<Ingreso>("/recepcion/ingresos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listarIngresos: (cedula: string, fecha?: string) => {
      const query = new URLSearchParams({ cedula });
      if (fecha) query.set("fecha", fecha);
      return fetchApi<IngresosList>(`/recepcion/ingresos?${query.toString()}`);
    },
    // DEC-031: el minimo son {cedula, nombres, apellidos, telefono};
    // `sedeId` es opcional (si se omite usa la sede del recepcionista).
    crearClienteRapido: (data: {
      cedula: string;
      nombres: string;
      apellidos: string;
      telefono: string;
      email?: string;
      observaciones?: string;
      sedeId?: string;
    }) =>
      fetchApi<ClienteRapido>("/recepcion/clientes-rapidos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  sedes: {
    conteos: <T = any>(sedeId?: string) =>
      fetchApi<T>(sedeId ? `/sedes/${sedeId}/conteos` : `/sedes/conteos`),
  },
  notificaciones: {
    enviar: <T = any>() =>
      fetchApi<T>("/notificaciones/vencimiento/enviar", { method: "POST" }),  },
  planesNutricionales: {
    listar: <T = any>() => fetchApi<T>("/planes-nutricionales"),
    obtener: <T = any>(id: string) => fetchApi<T>(`/planes-nutricionales/${id}`),
    crear: <T = any>(data: Record<string, unknown>) =>
      fetchApi<T>("/planes-nutricionales", { method: "POST", body: JSON.stringify(data) }),
    editar: <T = any>(id: string, data: Record<string, unknown>) =>
      fetchApi<T>(`/planes-nutricionales/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  asignacionesNutricion: {
    asignar: <T = any>(clienteId: string, planId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/planes-nutricionales/asignacion`, {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    historial: <T = any>(clienteId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/planes-nutricionales/historial`),
    activa: <T = any>(clienteId: string) =>
      fetchApi<T>(`/clientes/${clienteId}/planes-nutricionales/activa`),
  },
};


