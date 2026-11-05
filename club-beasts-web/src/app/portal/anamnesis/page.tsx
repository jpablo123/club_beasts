"use client";

/**
 * INC-09 (GREEN T10) — `/portal/anamnesis`: anamnesis deportiva del cliente
 * (HU-28 / C2 / NAV-AN-01..04 / NAV-AN-09).
 *
 * Contrato fijado por el RED (tests/e2e/inc09-anamnesis-portal.spec.ts):
 *  - URL propia (NAV-AN-03: la recarga conserva la vista; el atras no expone
 *    datos ajenos). NO porta el efecto `repararUrlDelPortal` del /portal.
 *  - Entrada: link "Mi anamnesis" en `/portal` (fuera de `<nav>`), pintado
 *    solo con servicio vigente (DEC-060).
 *  - Vista SOLO LECTURA agrupada en las 4 secciones S1-S4 del Anexo + badge
 *    `estado` + `fechaActualizacion` (SIN `actualizadoPorId`, DEC-041).
 *  - SIN_REGISTRO: `role="alert"` con el mensaje literal del contrato.
 *  - Guardas (PIN obligatoria intacta): `debeCambiarPin` -> redirect `/portal`;
 *    DEC-060: `sinMembresiaActiva` -> deriva al aviso DEC-051 en `/portal`
 *    (sin datos de anamnesis: ni siquiera se consulta).
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge, Card, Navbar, PageHeader } from "@/components";
import AnamnesisVista from "@/components/anamnesis/AnamnesisVista";
import { api, type ApiError, type PortalResumen } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import {
  esSinRegistro,
  type AnamnesisDatos,
  type AnamnesisPortalDTO,
  type AnamnesisRespuestaPortal,
} from "@/lib/anamnesis-campos";

export default function PortalAnamnesisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dto, setDto] = useState<AnamnesisRespuestaPortal | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const debeCambiarPin = Boolean(
    (session?.user as { debeCambiarPin?: boolean } | undefined)?.debeCambiarPin
  );

  // Guarda PIN (sin bypass): con el cambio obligatorio pendiente el portal es
  // el único destino; la anamnesis se deriva a /portal (PIN intacta).
  useEffect(() => {
    if (status !== "authenticated" || !debeCambiarPin) return;
    router.replace("/portal");
  }, [status, debeCambiarPin, router]);

  useEffect(() => {
    if (status !== "authenticated" || debeCambiarPin) return;
    let activo = true;
    (async () => {
      try {
        // DEC-060 (NAV-AN-09): la puerta de servicio vigente corre ANTES de
        // consultar la anamnesis (con `sinMembresiaActiva` jamás se piden ni
        // se pintan datos) y deriva al aviso DEC-051 de /portal.
        const resumen = (await api.portal.resumen()) as unknown as PortalResumen;
        if (!activo) return;
        if (resumen.sinMembresiaActiva) {
          router.replace("/portal");
          return;
        }
        const datos = await api.portal.anamnesis<AnamnesisRespuestaPortal>();
        if (!activo) return;
        setDto(datos);
        setError("");
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.kind === "session_expired") {
          // INC00-AUTH-02/03: salida única al login del cliente.
          const exit = resolveSessionExit("/login-cliente");
          if (exit) router.push(exit);
          return;
        }
        if (activo) setError(apiErr.message || "No se pudo cargar tu anamnesis.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [status, debeCambiarPin, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-near-black">
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-400">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    const exit = resolveSessionExit("/login-cliente");
    if (exit) router.push(exit);
    return null;
  }

  const conDatos = dto !== null && !esSinRegistro(dto);
  const sinRegistro = dto !== null && esSinRegistro(dto);
  // Vista agrupada S1-S4 (HU28-AN-30): las secciones viajan ya agrupadas.
  const datosPlanos: AnamnesisDatos = conDatos
    ? Object.values((dto as AnamnesisPortalDTO).secciones).reduce<AnamnesisDatos>(
        (acc, seccion) => ({ ...acc, ...seccion }),
        {}
      )
    : {};

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar showAuth={false} />

      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          <PageHeader title="Mi anamnesis" description="Anamnesis deportiva registrada" />

          <Card padding="lg" className="mt-6">
            <section aria-label="Anamnesis deportiva">
              {cargando && <p className="text-gray-400 text-sm">Cargando anamnesis...</p>}

              {error && (
                <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-card">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* NAV-AN-02 / HU28-AN-32: mensaje claro, sin formulario. */}
              {sinRegistro && (
                <div role="alert" className="p-3 bg-dark-surface border border-gray-800 rounded-card">
                  <p className="text-gray-400">
                    {(dto as { mensaje: string }).mensaje}
                  </p>
                </div>
              )}

              {conDatos && (
                <>
                  {/* HU28-AN-33: estado + última actualización, sin datos de staff. */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div role="status">
                      <Badge
                        variant={
                          (dto as AnamnesisPortalDTO).estado === "COMPLETA"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {(dto as AnamnesisPortalDTO).estado}
                      </Badge>
                    </div>
                    <span className="text-gray-500 text-sm">
                      Última actualización: {(dto as AnamnesisPortalDTO).fechaActualizacion}
                    </span>
                  </div>
                  <AnamnesisVista datos={datosPlanos} />
                </>
              )}
            </section>
          </Card>

          <div className="mt-6">
            <Link
              href="/portal"
              className="text-sm text-gray-400 hover:text-royal transition-colors"
            >
              Volver al portal
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
