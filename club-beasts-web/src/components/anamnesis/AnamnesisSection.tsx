"use client";

/**
 * INC-09 (GREEN T10) — Sección "Anamnesis deportiva" de la ficha staff
 * (HU-09/HU-10, C1/C4/C5/C7). Se monta inline tras `MembershipSection`.
 *
 * Contrato fijado por el RED (tests/unit/inc09-anamnesis-vista.test.tsx):
 *  - `AnamnesisSection({ clienteId, cliente })` con `cliente` = ficha
 *    (fuente del pre-llenado DEC-056a). Rol desde `useSession()` y datos de
 *    `api.anamnesis.get(clienteId)` (DTO filtrado por rol en la API).
 *  - `<section role="region" aria-label="Anamnesis deportiva">` (scope C7)
 *    con la vista de SOLO LECTURA por defecto (texto plano: los localizadores
 *    base de la ficha jamás ven controles nuevos — anti-interferencia (a)).
 *  - C4: render POR PRESENCIA DE CLAVE (los 5 sensibles de DEC-055 no existen
 *    en el DOM cuando sus claves no viajan; sin placeholders ni "Restringido").
 *  - Editor SOLO DUENO bajo demanda (C1): "Diligenciar anamnesis" (SIN_REGISTRO)
 *    o "Modificar anamnesis" (con datos). RECEPCIONISTA: solo lectura.
 *  - Badge "PENDIENTE"/"COMPLETA" (`role="status"`) del DTO (AN-22).
 *  - SIN_REGISTRO: el `mensaje` del DTO sin formulario editable.
 *
 * Nota de base 122/122: los mensajes de esta sección NO usan `role="alert"`
 * (los specs inc04/inc08 acotan `main.getByRole("alert")` y exigen conteo 0
 * sobre la ficha con la sección montada); el badge solo existe cuando hay
 * registro (los fixtures base nunca crean anamnesis, `congelacion.spec.ts`
 * exige `getByRole("status")` con conteo 0).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { flushSync } from "react-dom";
import { api, type ApiError } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/session-notice";
import { Badge, Button, Card } from "@/components";
import AnamnesisVista from "./AnamnesisVista";
import AnamnesisEditor from "./AnamnesisEditor";
import {
  esSinRegistro,
  type AnamnesisRespuestaStaff,
  type AnamnesisStaffDTO,
} from "@/lib/anamnesis-campos";
import type { ClientePrefill } from "@/lib/anamnesis-prefill";

interface AnamnesisSectionProps {
  clienteId: string;
  cliente: ClientePrefill;
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export default function AnamnesisSection({
  clienteId,
  cliente,
}: AnamnesisSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const [dto, setDto] = useState<AnamnesisRespuestaStaff | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [tick, setTick] = useState(0);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const data = await api.anamnesis.get<AnamnesisRespuestaStaff>(clienteId);
      // flushSync: el contrato del RED aserta la vista sin esperas tras el
      // primer render (los datos deben quedar en el DOM al instante del
      // settle de la promesa).
      if (vivo.current) {
        flushSync(() => {
          setDto(data);
          setCargando(false);
          setError("");
        });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "session_expired") {
        // INC00-AUTH-02/03: salida única de sesión, sin competir con la
        // recuperación centralizada (misma pauta que la ficha).
        const exit = resolveSessionExit("/login");
        if (exit) router.push(exit);
        return;
      }
      if (vivo.current) {
        flushSync(() => {
          setError(apiErr.message || "No se pudo cargar la anamnesis.");
          setCargando(false);
        });
      }
    }
  }, [clienteId, router]);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, tick]);

  /** C3: el editor entrega la promesa del guardado; acá se cierra al confirmar. */
  const manejarGuardado = (guardado: Promise<unknown>) => {
    guardado.then(
      () => {
        if (!vivo.current) return;
        setEditando(false);
        setTick((t) => t + 1);
      },
      () => {
        // El editor muestra el error y permanece abierto (sin pérdida).
      }
    );
  };

  const conDatos = dto !== null && !esSinRegistro(dto) && !cargando;
  const sinRegistro = dto !== null && esSinRegistro(dto);
  const soloLectura = userRole !== "DUENO";

  return (
    <section aria-label="Anamnesis deportiva" className="mt-6">
      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wide">
            Anamnesis deportiva
          </h2>
          {/* AN-22: badge PENDIENTE/COMPLETA del DTO (rol status accesible). */}
          {conDatos && (
            <div className="flex flex-wrap items-center gap-3">
              <div role="status">
                <Badge
                  variant={(dto as AnamnesisStaffDTO).estado === "COMPLETA" ? "success" : "warning"}
                  size="sm"
                >
                  {(dto as AnamnesisStaffDTO).estado}
                </Badge>
              </div>
              {!editando && !soloLectura && (
                <Button size="sm" onClick={() => setEditando(true)}>
                  Modificar anamnesis
                </Button>
              )}
            </div>
          )}
          {sinRegistro && !editando && !soloLectura && (
            <Button size="sm" onClick={() => setEditando(true)}>
              Diligenciar anamnesis
            </Button>
          )}
        </div>

        {cargando && <p className="text-gray-400 text-sm">Cargando anamnesis...</p>}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {sinRegistro && (
          <p className="text-gray-400">{(dto as { mensaje: string }).mensaje}</p>
        )}

        {/* Metadatos de trazabilidad (staff): fecha + autor (DEC-057). */}
        {conDatos && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-sm text-gray-500">
            <span>
              Última actualización: {formatearFecha((dto as AnamnesisStaffDTO).fechaActualizacion)}
            </span>
            <span>
              Actualizado por: {(dto as AnamnesisStaffDTO).actualizadoPorId}
            </span>
          </div>
        )}

        {/* C1: la vista de solo lectura es la imagen por defecto; el editor
            solo se monta bajo demanda (anti-interferencia con la base). */}
        {editando ? (
          <AnamnesisEditor
            clienteId={clienteId}
            cliente={cliente}
            inicial={conDatos ? (dto as AnamnesisStaffDTO) : null}
            onGuardado={manejarGuardado}
            onDescartar={() => setEditando(false)}
          />
        ) : (
          conDatos && <AnamnesisVista datos={dto as AnamnesisStaffDTO} />
        )}
      </Card>
    </section>
  );
}
