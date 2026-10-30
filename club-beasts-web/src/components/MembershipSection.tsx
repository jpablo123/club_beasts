"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  type ApiError,
  type EstadoMembresia,
  type MembresiaCambio,
  type ResultadoPausa,
} from "@/lib/api";
import { hoyBogotaISO, pausaVigente, sumarDiasInclusivos } from "@/lib/membresia-fechas";
import { Card, Button, Badge, Input, Select } from "@/components";
import CongelacionForm, { type ModoCongelacion } from "@/components/CongelacionForm";

interface MembresiaUsuario {
  id: string;
  nombre: string;
}

interface Membresia {
  id: string;
  clienteId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoMembresia;
  /**
   * INC-05 / DEC-045 (b): GYM | PERSONALIZADO | NUTRICION (campo aditivo del
   * DTO, `INC05-CONF-04`). Opcional en el tipo porque los DTO mas antiguos no
   * lo traen; al pintar se asume GYM (mismo default que el backend).
   */
  tipoServicio?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  creadoPor: MembresiaUsuario;
  actualizadoPor: MembresiaUsuario;
  cambios: MembresiaCambio[];
}

interface MembresiasResponse {
  membresias: Membresia[];
  fechaActual: string;
}

/** Respuesta de `GET .../servicios-personalizado` y `.../servicios-nutricion` (#2/#5). */
interface ServiciosResponse {
  servicios: Membresia[];
  fechaActual: string;
}

interface MembershipSectionProps {
  clienteId: string;
  /**
   * DEC-017: solo DUENO / RECEPCIONISTA gestionan la membresia (incluidas las
   * acciones de congelar, descongelar y editar la congelacion). Denegado por
   * defecto: si la seccion se instancia sin permiso explicito no se pintan.
   */
  canManage?: boolean;
}

const estadoConfig: Record<
  EstadoMembresia,
  { badge: "royal" | "success" | "gray"; label: string }
> = {
  PROGRAMADA: { badge: "royal", label: "Programada" },
  ACTIVA: { badge: "success", label: "Activa" },
  VENCIDA: { badge: "gray", label: "Vencida" },
  // HU15-C03: estado CALCULADO durante el rango de pausa (prevalece sobre los
  // demas). DEC-025: es informativo, no bloquea nada; por eso el badge usa el
  // royal del design system (mismo tono que "Programada", sin rojo de alarma).
  CONGELADO: { badge: "royal", label: "Congelado" },
};

/**
 * INC05-PER-04 / INC05-NUT-04 (DEC-045 = (b)): etiqueta visible de cada fila
 * segun su `tipoServicio`, para no pintar un personalizado ni una nutricion
 * como si fueran membresia gym (incompatibilidad #1 del spec INC-05).
 */
const tipoServicioLabel: Record<string, string> = {
  GYM: "Gym",
  PERSONALIZADO: "Personalizado",
  NUTRICION: "Nutrición",
};

function etiquetaTipoServicio(m: Membresia): string {
  return tipoServicioLabel[m.tipoServicio ?? "GYM"] ?? "Gym";
}

const PLANES = [
  { label: "Personalizado", value: "personalizado", dias: null },
  { label: "1 mes (30 días)", value: "1m", dias: 30 },
  { label: "3 meses (90 días)", value: "3m", dias: 90 },
  { label: "6 meses (180 días)", value: "6m", dias: 180 },
  { label: "1 año (365 días)", value: "1a", dias: 365 },
];

const planOptions = PLANES.map((p) => ({ value: p.value, label: p.label }));

function hoyISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFechaLarga(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function pluralDias(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? `1 ${singular}` : `${cantidad} ${plural}`;
}

/**
 * Feedback de exito (DEC-024): siempre muestra la `fechaFin` nueva y los dias
 * de la operacion (`diasCongelados` / `diasDevueltos` / `diasCongeladosAnterior`).
 * Texto neutro: la congelacion es una pausa informativa, no un bloqueo (DEC-025).
 */
function mensajeExito(r: ResultadoPausa, modo: ModoCongelacion): string {
  const fin = formatFechaLarga(r.fechaFin);

  if (modo === "descongelar") {
    const dias = r.diasDevueltos ?? 0;
    return `Congelación finalizada: la membresía vence el ${fin} (${pluralDias(
      dias,
      "día devuelto",
      "días devueltos"
    )}).`;
  }

  if (modo === "editar") {
    const dias = r.diasCongelados ?? 0;
    const anterior = r.diasCongeladosAnterior ?? 0;
    return `Congelación editada: la membresía vence el ${fin} (${pluralDias(
      dias,
      "día congelado",
      "días congelados"
    )}; ${anterior} ${anterior === 1 ? "anterior" : "anteriores"}).`;
  }

  const dias = r.diasCongelados ?? 0;
  const rango = r.congelacion
    ? ` del ${formatFechaLarga(r.congelacion.fechaInicio)} al ${formatFechaLarga(r.congelacion.fechaFin)}`
    : "";
  return `Congelación registrada${rango}: la membresía vence el ${fin} (${pluralDias(
    dias,
    "día congelado",
    "días congelados"
  )}).`;
}

type FormMode = "none" | "create" | "edit";

interface FormData {
  fechaInicio: string;
  fechaFin: string;
}

export default function MembershipSection({
  clienteId,
  canManage = false,
}: MembershipSectionProps) {
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [fechaActual, setFechaActual] = useState("");
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number>(1);
  const [form, setForm] = useState<FormData>({ fechaInicio: "", fechaFin: "" });
  const [planSeleccionado, setPlanSeleccionado] = useState("personalizado");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mostrarFechaFin, setMostrarFechaFin] = useState(false);
  // INC-02: formulario de pausa activo y feedback de la ultima operacion.
  const [pausaForm, setPausaForm] = useState<{
    modo: ModoCongelacion;
    membresiaId: string;
  } | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  /** Hoy en America/Bogota: lo fija el listado (`fechaActual`) o el reloj. */
  const hoy = fechaActual || hoyBogotaISO();

  /**
   * INC-05 (contrato #2/#4/#8 + DEC-045 = (b)): la ficha pinta los tres tipos
   * de vigencia. Fuente primaria `GET .../membresias-gym` (#7): hoy devuelve
   * todas las filas del cliente sin filtrar; cuando el backend GREEN la filtra
   * por `tipoServicio: "GYM"` (incompatibilidad #1), las filas
   * PERSONALIZADO / NUTRICION llegan de los listados propios (#2/#5, con su
   * `tipoServicio` filtrado server-side). Las fuentes secundarias son
   * opcionales: si faltan o fallan (p. ej. los endpoints aun desplegados),
   * solo degrada el pintado de ese tipo; la fuente primaria sigue gobernando
   * el manejo de sesion y de errores, como antes.
   */
  const loadMembresias = useCallback(async () => {
    try {
      const [gym, personalizado, nutricion] = await Promise.allSettled([
        api.membresias.list(clienteId),
        api.servicios?.personalizado?.(clienteId),
        api.servicios?.nutricion?.(clienteId),
      ]);

      if (gym.status !== "fulfilled" || !gym.value) {
        const apiErr = gym.status === "rejected" ? (gym.reason as ApiError) : undefined;
        if (apiErr?.kind === "session_expired") return;
        setMembresias([]);
        return;
      }

      const base = gym.value as unknown as MembresiasResponse;
      const filas: Membresia[] = [...base.membresias];
      let fecha = base.fechaActual;

      for (const fuente of [personalizado, nutricion]) {
        if (fuente.status !== "fulfilled" || !fuente.value) continue;
        const data = fuente.value as unknown as ServiciosResponse;
        if (!Array.isArray(data?.servicios)) continue;
        filas.push(...data.servicios);
        if (!fecha) fecha = data.fechaActual;
      }

      // Sin duplicados (mientras `membresias-gym` no filtra por tipo, la misma
      // fila puede llegar de dos fuentes) y con el orden `fechaInicio desc` de
      // la API.
      const unicas = Array.from(new Map(filas.map((m) => [m.id, m])).values());
      unicas.sort((a, b) =>
        a.fechaInicio < b.fechaInicio ? 1 : a.fechaInicio > b.fechaInicio ? -1 : 0
      );

      setMembresias(unicas);
      setFechaActual(fecha);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "session_expired") return;
      setMembresias([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    loadMembresias();
  }, [loadMembresias]);

  const resetForm = () => {
    setFormMode("none");
    setEditingId(null);
    setEditingVersion(1);
    setForm({ fechaInicio: "", fechaFin: "" });
    setPlanSeleccionado("personalizado");
    setFormError("");
    setMostrarFechaFin(false);
    // Solo un formulario visible a la vez y sin feedback de una operacion
    // anterior cuando se abre uno nuevo.
    setPausaForm(null);
    setExito(null);
  };

  /** Abre congelar / descongelar / editar sobre la vigencia indicada. */
  const abrirPausa = (modo: ModoCongelacion, membresiaId: string) => {
    resetForm();
    setPausaForm({ modo, membresiaId });
  };

  /**
   * INC-02 / DEC-024: feedback tras cada operacion (fechaFin nueva + dias) y
   * merge de la respuesta en la fila, sin recargar el listado (sin salto de
   * la vista).
   */
  const handleExitoPausa = (resultado: ResultadoPausa, modo: ModoCongelacion) => {
    setMembresias((prev) =>
      prev.map((m) =>
        m.id === resultado.id
          ? {
              ...m,
              fechaFin: resultado.fechaFin,
              estado: resultado.estado,
              version: resultado.version,
              cambios: resultado.cambios,
              actualizadoPor: resultado.actualizadoPor,
              updatedAt: resultado.updatedAt,
            }
          : m
      )
    );
    setExito(mensajeExito(resultado, modo));
    setPausaForm(null);
  };

  const openCreate = () => {
    resetForm();
    setFormMode("create");
    const hoy = hoyISO();
    setForm({ fechaInicio: hoy, fechaFin: "" });
    setPlanSeleccionado("1m");
    // INC00-MEM-06 / DEC-006: extremos inclusivos, un preset de N dias
    // termina en `inicio + N - 1` (30 dias inclusivos, no 31).
    setForm((prev) => ({
      ...prev,
      fechaFin: sumarDiasInclusivos(hoy, 30),
    }));
  };

  const handlePlanChange = (value: string) => {
    setPlanSeleccionado(value);
    const plan = PLANES.find((p) => p.value === value);
    if (plan?.dias) {
      setForm((prev) => {
        const inicio = prev.fechaInicio || hoyISO();
        return {
          fechaInicio: inicio,
          fechaFin: sumarDiasInclusivos(inicio, plan.dias),
        };
      });
      setMostrarFechaFin(false);
    }
  };

  const handleFechaInicioChange = (value: string) => {
    const plan = PLANES.find((p) => p.value === planSeleccionado);
    if (plan?.dias && value) {
      setForm({
        fechaInicio: value,
        fechaFin: sumarDiasInclusivos(value, plan.dias),
      });
    } else {
      setForm((prev) => ({ ...prev, fechaInicio: value }));
    }
  };

  const handleFechaFinChange = (value: string) => {
    setForm((prev) => ({ ...prev, fechaFin: value }));
    setPlanSeleccionado("personalizado");
  };

  const openEdit = (m: Membresia) => {
    setFormMode("edit");
    setEditingId(m.id);
    setEditingVersion(m.version);
    setForm({ fechaInicio: m.fechaInicio, fechaFin: m.fechaFin });
    setFormError("");
    setMostrarFechaFin(false);
  };

  const validateForm = (): string | null => {
    if (!form.fechaInicio || !form.fechaFin) {
      return "Las fechas de inicio y fin son obligatorias.";
    }
    if (form.fechaInicio > form.fechaFin) {
      return "La fecha de inicio no puede ser posterior a la fecha fin.";
    }
    return null;
  };

  const checkOverlap = (inicio: string, fin: string, excludeId?: string): boolean => {
    return membresias.some((m) => {
      // INC-05 / DEC-008: el solape se evalua por `tipoServicio`, nunca entre
      // tipos distintos. El formulario crea vigencias GYM (POST
      // .../membresias-gym), asi que una fila PERSONALIZADO / NUTRICION
      // solapada no bloquea un periodo gym valido.
      if ((m.tipoServicio ?? "GYM") !== "GYM") return false;
      if (excludeId && m.id === excludeId) return false;
      return m.fechaInicio <= fin && m.fechaFin >= inicio;
    });
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const hasOverlap =
      formMode === "edit"
        ? checkOverlap(form.fechaInicio, form.fechaFin, editingId ?? undefined)
        : checkOverlap(form.fechaInicio, form.fechaFin);

    if (hasOverlap) {
      setFormError("El período se solapa con una membresía existente.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (formMode === "create") {
        await api.membresias.create(clienteId, {
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
      } else if (formMode === "edit" && editingId) {
        await api.membresias.update(clienteId, editingId, {
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          version: editingVersion,
        });
      }
      resetForm();
      await loadMembresias();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "session_expired") return;
      setFormError(apiErr.message || "Error al guardar la membresía.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  if (loading) {
    return (
      <Card padding="lg" className="mt-6">
        <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wide mb-4">
          Membresías
        </h2>
        <p className="text-gray-400 text-sm">Cargando membresías...</p>
      </Card>
    );
  }

  // Vigencia sobre la que recae el formulario de pausa abierto (INC-02).
  const membresiaPausa = pausaForm
    ? membresias.find((m) => m.id === pausaForm.membresiaId)
    : undefined;

  return (
    <Card padding="lg" className="mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wide">
          Membresías
        </h2>
        {formMode === "none" && !pausaForm && (
          <Button size="sm" onClick={openCreate}>
            Nueva Membresía
          </Button>
        )}
      </div>

      {/* Formulario */}
      {formMode !== "none" && (
        <div className="bg-near-black rounded-card p-5 mb-6 border border-gray-800">
          <h3 className="text-white font-medium mb-4">
            {formMode === "create" ? "Nuevo Período" : "Editar Período"}
          </h3>
          {formMode === "create" && (
            <div className="mb-4">
              <Select
                label="Plan"
                value={planSeleccionado}
                onChange={(e) => handlePlanChange(e.target.value)}
                options={planOptions}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => handleFechaInicioChange(e.target.value)}
              error={undefined}
            />
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fecha Fin</label>
              {mostrarFechaFin ? (
                <Input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => handleFechaFinChange(e.target.value)}
                  error={undefined}
                />
              ) : (
                <div className="flex items-center gap-2 h-[42px]">
                  <span className="text-white text-sm flex-1">
                    {form.fechaFin ? formatFechaLarga(form.fechaFin) : "—"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => setMostrarFechaFin(true)}
                  >
                    Editar
                  </Button>
                </div>
              )}
            </div>
          </div>
          {formError && (
            <p className="text-red-400 text-sm mb-4">{formError}</p>
          )}
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave} loading={saving}>
              Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Feedback de la ultima operacion de pausa: fechaFin nueva + dias (DEC-024) */}
      {exito && (
        <div
          role="status"
          className="mb-6 p-3 bg-royal/10 border border-royal/30 rounded-card"
        >
          <p className="text-white text-sm">{exito}</p>
        </div>
      )}

      {/* Formulario de congelar / descongelar / editar congelacion (INC-02) */}
      {pausaForm && membresiaPausa && (
        <CongelacionForm
          key={`${pausaForm.modo}-${pausaForm.membresiaId}`}
          clienteId={clienteId}
          membresiaId={membresiaPausa.id}
          modo={pausaForm.modo}
          hoy={hoy}
          vigencia={{
            fechaInicio: membresiaPausa.fechaInicio,
            fechaFin: membresiaPausa.fechaFin,
            version: membresiaPausa.version,
          }}
          pausa={pausaVigente(membresiaPausa.cambios, hoy)}
          onCancelar={() => setPausaForm(null)}
          onExito={handleExitoPausa}
        />
      )}

      {/* Lista de membresías */}
      {membresias.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No hay membresías registradas para este cliente.
        </p>
      ) : (
        <div className="space-y-3">
          {membresias.map((m) => {
            const cfg = estadoConfig[m.estado];
            const pausa = pausaVigente(m.cambios, hoy);
            // INC-05 / DEC-045 (b): las acciones de gestion son solo de las
            // vigencias GYM (editan via PATCH .../membresias-gym/:id). Las
            // filas PERSONALIZADO / NUTRICION se pintan etiquetadas, sin
            // acciones: gestionarlas queda fuera del pintado minimo.
            const esGym = (m.tipoServicio ?? "GYM") === "GYM";
            return (
              <div
                key={m.id}
                className="bg-near-black rounded-card p-4 border border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Badge variant={cfg.badge} size="sm">
                      {cfg.label}
                    </Badge>
                    {/* INC05-PER-04 / INC05-NUT-04: etiqueta del tipo de vigencia. */}
                    <Badge variant="gray" size="sm">
                      {etiquetaTipoServicio(m)}
                    </Badge>
                    <span className="text-white text-sm font-medium">
                      {formatDate(m.fechaInicio)} — {formatDate(m.fechaFin)}
                    </span>
                  </div>
                  {/* Rango de pausa vigente: informativo (DEC-025: no bloquea nada). */}
                  {pausa && (
                    <p className="text-gray-500 text-xs mb-1">
                      {`Pausa: ${formatDate(pausa.fechaInicio)} — ${formatDate(pausa.fechaFin)}${pausa.motivo ? ` · ${pausa.motivo}` : ""}`}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">
                    Creado por {m.creadoPor.nombre} · v{m.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* DEC-017: las acciones de pausa son solo de DUENO/RECEPCIONISTA. */}
                  {canManage && esGym &&
                    (pausa ? (
                      <>
                        <Button size="sm" onClick={() => abrirPausa("descongelar", m.id)}>
                          Descongelar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => abrirPausa("editar", m.id)}
                        >
                          Editar congelación
                        </Button>
                      </>
                    ) : (
                      m.estado !== "VENCIDA" && (
                        <Button size="sm" onClick={() => abrirPausa("congelar", m.id)}>
                          Congelar
                        </Button>
                      )
                    ))}
                  {/* Editar fechas: solo filas GYM (el PATCH es de la ruta
                      .../membresias-gym; para los servicios nuevos ese mismo
                      boton devolveria 404 Servicio no encontrado). */}
                  {esGym && m.estado !== "VENCIDA" && (
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
