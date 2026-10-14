"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Button, Navbar, PageHeader } from "@/components";
import EstadoAccesoBadge from "@/components/EstadoAccesoBadge";
import ChangePinForm from "@/components/ChangePinForm";
import { api, type ApiError, type PortalResumen } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";

export default function PortalPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // INC-03 / INC03-POR-01..07: el portal consume `GET /portal/resumen`.
  // Identidad, estado de acceso, vencimiento y congelacion salen del
  // backend (nunca de la sesion ni de un texto fijo: fin del hardcode
  // "Activo" que era el gap INC03-VEN-03).
  const [resumen, setResumen] = useState<PortalResumen | null>(null);
  const [errorResumen, setErrorResumen] = useState("");
  const [cargandoResumen, setCargandoResumen] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      // Sin sesion no queda ningun dato privado en memoria de la pantalla.
      setResumen(null);
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const data = (await api.portal.resumen()) as unknown as PortalResumen;
        if (vivo) {
          setResumen(data);
          setErrorResumen("");
        }
      } catch (err) {
        // INC03-POR-05: un fallo de lectura no cierra la sesion; se pinta
        // en la zona de error y se ofrece reintento.
        if (vivo) {
          setErrorResumen(
            (err as ApiError).message ||
              "No se pudo cargar tu informacion de acceso."
          );
        }
      } finally {
        if (vivo) setCargandoResumen(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [status]);


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
    // INC00-AUTH-03 (hallazgo B2): si la recuperación centralizada ya está
    // manejando la salida no competimos con su navegación (perderíamos el
    // callbackUrl); si no está en curso, salimos hacia /login-cliente
    // conservando esta pantalla como retorno.
    const exit = resolveSessionExit("/login-cliente");
    if (exit) router.push(exit);
    return null;
  }

  const debeCambiarPin = (session.user as { debeCambiarPin?: boolean }).debeCambiarPin;

  if (debeCambiarPin && !pinChangeSuccess) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar showAuth={false} />
        <div className="pt-24 pb-12">
          <div className="max-w-md mx-auto px-5">
            <PageHeader
              title="Mi Portal"
              description={`Bienvenido, ${session.user?.name}`}
            />
            <ChangePinForm
              onSuccess={() => {
                setPinChangeSuccess(true);
                update({ user: { ...session.user, debeCambiarPin: false } });
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (pinChangeSuccess && debeCambiarPin) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar showAuth={false} />
        <div className="pt-24 pb-12">
          <div className="max-w-md mx-auto px-5">
            <PageHeader
              title="Mi Portal"
              description={`Bienvenido, ${session.user?.name}`}
            />
            <Card padding="lg" className="mt-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase mb-2">
                  PIN Actualizado
                </h3>
                <p className="text-gray-400 text-sm">
                  Tu PIN ha sido cambiado correctamente. Ya puedes acceder a todas las funcionalidades.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar showAuth={false} />

      <div className="pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-5">
          <PageHeader
            title="Mi Portal"
            description={`Bienvenido, ${session.user?.name}`}
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login-cliente" })}
              >
                Cerrar sesion
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="lg">
              <h3 className="text-xl font-display font-bold text-white uppercase mb-4">
                Mi Informacion
              </h3>
              {errorResumen ? (
                <div role="alert" className="p-3 rounded-card bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{errorResumen}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.location.reload()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : !resumen ? (
                <p className="text-gray-400">Cargando...</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Nombre</p>
                    <p className="text-white">
                      {resumen.cliente.nombres} {resumen.cliente.apellidos}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cedula</p>
                    <p className="text-white font-mono">{resumen.cliente.cedula}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Sede</p>
                    <p className="text-white">{resumen.cliente.sede.nombre}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card padding="lg">
              <h3 className="text-xl font-display font-bold text-white uppercase mb-4">
                Estado de acceso
              </h3>
              {!resumen ? (
                errorResumen ? null : <p className="text-gray-400">Cargando...</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <EstadoAccesoBadge estado={resumen.estadoAccesoGym} size="md" />
                    {resumen.estadoAccesoGym === "VENCIDA" && (
                      <span className="text-red-400 text-sm font-medium">
                        Sin acceso al gimnasio
                      </span>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Fecha de vencimiento</p>
                      {resumen.fechaVencimiento ? (
                        <p className="text-white font-mono">{resumen.fechaVencimiento}</p>
                      ) : (
                        <p className="text-gray-500">Sin fecha de vencimiento</p>
                      )}
                    </div>
                    {resumen.congelacion && (
                      <div>
                        <p className="text-sm text-gray-400">Congelacion</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono">
                            {resumen.congelacion.fechaInicio}
                          </p>
                          <span className="text-gray-500">a</span>
                          <p className="text-white font-mono">
                            {resumen.congelacion.fechaFin}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>

            <Card padding="lg">
              <h3 className="text-xl font-display font-bold text-white uppercase mb-4">
                Mi Rutina
              </h3>
              <p className="text-gray-400">Tu rutina activa aparecera aqui.</p>
            </Card>

            <Card padding="lg" className="md:col-span-2">
              <h3 className="text-xl font-display font-bold text-white uppercase mb-4">
                Plan Nutricional
              </h3>
              <p className="text-gray-400">Tu plan nutricional personalizado estara disponible proximamente.</p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
