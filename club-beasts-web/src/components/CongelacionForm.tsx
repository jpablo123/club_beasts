"use client";

import { useState } from "react";
import { api, type ApiError, type ResultadoPausa } from "@/lib/api";
import { Button, Input } from "@/components";
import { diasInclusivos, restarDiasCalendario } from "@/lib/membresia-fechas";

/**
 * INC-02 (HU-15 + DEC-024) — Formulario de las 3 operaciones de pausa.
 *
 * - `congelar` y `editar` declaran un rango (`fechaInicio`, `fechaFin`, `motivo`)
 *   y siempre envian `version` (lock optimista INC00-MEM-03).
 * - `descongelar` pide confirmacion, no lleva fechas y solo envia `motivo`
 *   si el usuario escribio uno (contrato: opcional, pero si viaja no puede
 *   estar vacio).
 * - DEC-022 en cliente: el rango debe estar contenido en la vigencia y
 *   `fechaFin >= hoy` (America/Bogota) se validan ANTES de llamar al backend.
 * - DEC-025: los textos describen una pausa informativa; nada sugiere que el
 *   cliente pierda acceso.
 */

export type ModoCongelacion = "congelar" | "editar" | "descongelar";

export interface VigenciaCongelacion {
  fechaInicio: string;
  fechaFin: string;
  version: number;
}

export interface PausaCongelacion {
  fechaInicio: string;
  fechaFin: string;
  motivo?: string | null;
}

interface CongelacionFormProps {
  clienteId: string;
  membresiaId: string;
  modo: ModoCongelacion;
  /** Hoy en `America/Bogota` (lo fija el listado: `fechaActual`). */
  hoy: string;
  vigencia: VigenciaCongelacion;
  pausa: PausaCongelacion | null;
  onCancelar: () => void;
  onExito: (resultado: ResultadoPausa, modo: ModoCongelacion) => void;
}

const TITULOS: Record<ModoCongelacion, string> = {
  congelar: "Congelar membresía",
  editar: "Editar congelación",
  descongelar: "Descongelar membresía",
};

const BOTONES: Record<ModoCongelacion, string> = {
  congelar: "Aplicar congelación",
  editar: "Guardar cambios",
  descongelar: "Confirmar descongelación",
};

/** Fallback cuando el backend no envia mensaje legible (un `code` = un mensaje). */
const MENSAJES_CODIGO: Record<string, string> = {
  CONGELACION_INEXISTENTE: "No hay una congelación vigente en esta membresía",
  MEMBRESIA_CONFLICTO:
    "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.",
  MEMBRESIA_VENCIDA: "No se puede congelar una membresía vencida",
  MEMBRESIA_SOLAPADA: "Las fechas se solapan con un período existente",
  CONGELACION_NO_PERMITIDA:
    "La congelación no está permitida para este tipo de servicio",
  NOT_FOUND: "Membresía no encontrada",
  AUTH_FORBIDDEN: "No tienes permisos para realizar esta acción.",
};

function formatFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-");
  return `${d}/${m}/${y}`;
}

/** Inicio por defecto al congelar: hoy, pero nunca antes de la vigencia. */
function inicioPorDefecto(hoy: string, vigencia: VigenciaCongelacion): string {
  return hoy < vigencia.fechaInicio ? vigencia.fechaInicio : hoy;
}

export default function CongelacionForm({
  clienteId,
  membresiaId,
  modo,
  hoy,
  vigencia,
  pausa,
  onCancelar,
  onExito,
}: CongelacionFormProps) {
  const esRango = modo !== "descongelar";

  const [fechaInicio, setFechaInicio] = useState(() => {
    if (modo === "editar") return pausa?.fechaInicio ?? "";
    if (modo === "congelar") return inicioPorDefecto(hoy, vigencia);
    return "";
  });
  const [fechaFin, setFechaFin] = useState(() => {
    if (modo === "editar") return pausa?.fechaFin ?? "";
    if (modo === "congelar") return vigencia.fechaFin;
    return "";
  });
  const [motivo, setMotivo] = useState(() =>
    modo === "editar" ? (pausa?.motivo ?? "") : ""
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /**
   * Reglas DEC-022 en cliente (el backend las repite como autoridad):
   * rango contenido en la vigencia y `fechaFin >= hoy`. Al editar, la fila
   * revertida (`fechaFin - N_anterior`) es el limite superior real, igual que
   * en la validacion del backend (spec INC-02, "Editar congelacion").
   */
  function validarRango(): string | null {
    if (!fechaInicio || !fechaFin) {
      return "Las fechas de inicio y fin son obligatorias.";
    }
    if (fechaFin < fechaInicio) {
      return "La fecha de fin no puede ser anterior a la fecha de inicio.";
    }
    if (fechaFin < hoy) {
      return "La fecha de fin no puede ser anterior a hoy.";
    }
    const finMaximo =
      modo === "editar" && pausa
        ? restarDiasCalendario(
            vigencia.fechaFin,
            diasInclusivos(pausa.fechaInicio, pausa.fechaFin)
          )
        : vigencia.fechaFin;
    if (fechaInicio < vigencia.fechaInicio || fechaFin > finMaximo) {
      return "El rango de congelación debe estar dentro de la vigencia.";
    }
    return null;
  }

  function validarMotivo(): string | null {
    const limpio = motivo.trim();
    if (modo !== "descongelar" && !limpio) return "El motivo es obligatorio.";
    if (limpio.length > 500) return "El motivo no puede exceder 500 caracteres.";
    return null;
  }

  async function guardar() {
    // Congelar y editar validan rango + motivo (ambos requeridos en el
    // contrato); descongelar solo valida el motivo opcional (si viaja).
    const errorRango = esRango ? validarRango() : null;
    if (errorRango) {
      setError(errorRango);
      return;
    }
    const errorMotivo = validarMotivo();
    if (errorMotivo) {
      setError(errorMotivo);
      return;
    }

    setError("");
    setSaving(true);
    try {
      let resultado: ResultadoPausa;
      if (modo === "congelar") {
        resultado = (await api.membresias.congelar(clienteId, membresiaId, {
          fechaInicio,
          fechaFin,
          motivo: motivo.trim(),
          version: vigencia.version,
        })) as unknown as ResultadoPausa;
      } else if (modo === "editar") {
        resultado = (await api.membresias.editarCongelacion(clienteId, membresiaId, {
          fechaInicio,
          fechaFin,
          motivo: motivo.trim(),
          version: vigencia.version,
        })) as unknown as ResultadoPausa;
      } else {
        const body: { version: number; motivo?: string } = {
          version: vigencia.version,
        };
        if (motivo.trim()) body.motivo = motivo.trim();
        resultado = (await api.membresias.descongelar(
          clienteId,
          membresiaId,
          body
        )) as unknown as ResultadoPausa;
      }
      onExito(resultado, modo);
    } catch (err) {
      const apiErr = err as ApiError;
      // La recuperacion de sesion es centralizada en `lib/api.ts`; aqui solo
      // se evita pintar un error que ya gestiona el flujo de sesion.
      if (apiErr.kind === "session_expired") return;
      setError(
        apiErr.message ||
          MENSAJES_CODIGO[apiErr.code ?? ""] ||
          "No se pudo completar la operación."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-near-black rounded-card p-5 mb-6 border border-gray-800">
      <h3 className="text-white font-medium mb-4">{TITULOS[modo]}</h3>

      {modo === "descongelar" ? (
        <p className="text-gray-400 text-sm mb-4">
          {`Se finalizará la pausa del ${formatFecha(pausa?.fechaInicio ?? "")} al ${formatFecha(pausa?.fechaFin ?? "")}. La fecha de vencimiento se ajustará por los días restantes de la pausa.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Fecha de inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <Input
            label="Fecha de fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1 mb-4">
        <label htmlFor="motivo-congelacion" className="block text-sm font-medium text-gray-300">
          Motivo{modo === "descongelar" ? " (opcional)" : ""}
        </label>
        <textarea
          id="motivo-congelacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={
            modo === "editar" ? "Cambio de viaje" : "Viaje de trabajo"
          }
          className="w-full px-4 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-colors"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <Button size="sm" onClick={guardar} loading={saving}>
          {BOTONES[modo]}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
