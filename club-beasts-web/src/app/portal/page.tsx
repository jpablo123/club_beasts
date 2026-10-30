"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Navbar, PageHeader } from "@/components";
import EstadoAccesoBadge from "@/components/EstadoAccesoBadge";
import ChangePinForm from "@/components/ChangePinForm";
import { api, type ApiError, type PortalResumen } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import {
  holdSessionTraffic,
  releaseSessionTraffic,
  waitForSessionTrafficIdle,
} from "@/lib/session-traffic";

export default function PortalPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  // Marca el tramo en el que el flag `debeCambiarPin` se esta persistiendo:
  // ver el comentario dentro del efecto del resumen.
  const pinChangeInProgress = useRef(false);

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
    // Mientras persiste el flag `debeCambiarPin` (flujo de cambio de PIN
    // obligatorio) no se refresca el resumen. Motivo (E2E
    // `cambio-pin-obligatorio.spec.ts`): Auth.js re-firma y re-emite la
    // cookie de sesion en CADA respuesta de `GET /api/auth/session`, y
    // `fetchApi` emite una de esas lecturas por llamada. Un refresco aqui
    // lanzado durante el POST del `update()` genera una lectura con la
    // cookie vieja cuyo seguimiento por el canal de difusion aterriza
    // DESPUES del `update()` y devuelve el flag a `true` (misma clase de
    // carrera que GAP-009 en el cierre de sesion). El resumen ya esta
    // cargado y el PIN no altera esos datos: con el flujo en curso se
    // conserva el dato en memoria y no se emite trafico de sesion.
    if (pinChangeInProgress.current) return;
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

  // INC-06 (matriz de navegacion: URL directa / recarga / atras sin bucles):
  // el portal SOLO se pinta en /portal. Tras un back/forward, el `popstate`
  // puede llegar antes de la hidratacion y perderse: el documento queda
  // pintando el portal con la URL de la entrada anterior (p. ej.
  // /login-cliente) y el redirect del middleware nunca llega a aplicarse
  // (URL y DOM desincronizados). Aqui se recompone la URL con un UNICO
  // `router.replace("/portal")`; sin bucle: al quedar la URL en /portal la
  // guarda deja de actuar. No compite con la salida por sesion (`!session`
  // mas abajo): solo corre con sesion autenticada.
  useEffect(() => {
    if (status !== "authenticated") return;
    const repararUrlDelPortal = () => {
      if (window.location.pathname !== "/portal") {
        router.replace("/portal");
      }
    };
    // Cubre el popstate perdido antes de la hidratacion (ya no hay evento).
    repararUrlDelPortal();
    window.addEventListener("popstate", repararUrlDelPortal);
    window.addEventListener("pageshow", repararUrlDelPortal);
    return () => {
      window.removeEventListener("popstate", repararUrlDelPortal);
      window.removeEventListener("pageshow", repararUrlDelPortal);
    };
  }, [status, router]);


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

  // El estado de exito se entra solo con `pinChangeSuccess` (y no exigiendo
  // que `debeCambiarPin` siga siendo true): con el `update()` ya persistido,
  // la sesion del cliente puede --y debe-- quedar en false, y la pantalla
  // "PIN Actualizado" debe mostrarse igual. Mismos textos y mismos estados
  // que siempre; se gana determinismo (antes parpadeaba o no se llegaba a
  // ver dependiendo de cuando aterrizaba la lectura tardia de sesion).
  if (pinChangeSuccess) {
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
                {/* INC-07 (INC07-NAV-04, C2): CTA como <a href> NATIVO (no
                    next/link): la URL actual ya es /portal y una navegacion
                    client-side a la misma URL no remonta el componente (la
                    tarjeta de exito seguiria pintandose). El <a> nativo fuerza
                    el remontaje completo, cumple "href real, navegable sin JS,
                    Tab" y no toca la carrera update(). Fuera de <nav> (C3). */}
                <a
                  href="/portal"
                  className="inline-block mt-4 text-sm text-gray-400 hover:text-royal transition-colors"
                >
                  Ir a mi portal
                </a>
              </div>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (debeCambiarPin) {
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
              onSuccess={async () => {
                // Auth.js re-firma y re-emite la cookie de sesion en CADA
                // respuesta de `GET /api/auth/session` (el mismo riesgo que
                // GAP-009 en el cierre de sesion): una lectura aun en vuelo
                // aterriza DESPUES del `update()` y devuelve la cookie --y el
                // estado del cliente-- a `debeCambiarPin: true`, repintando el
                // formulario aunque el PIN ya cambio (la carrera del E2E
                // `cambio-pin-obligatorio.spec.ts`).
                //
                // La compuerta de trafico (`session-traffic.ts`) drena esas
                // lecturas, pero RETIENE tambien el POST del `update` (mismo
                // path `/api/auth/session`), asi que no puede sostenerse
                // durante la escritura. Con el refresco del resumen suspendido
                // (ver `pinChangeInProgress` en el efecto) la unica fuente de
                // lecturas durante la escritura desaparece; el drenaje previo
                // cubre las lecturas heredadas del cambio de PIN y se repite
                // "drenar -> escribir" un numero acotado de veces por
                // robustez, sin depender del timing del navegador.
                pinChangeInProgress.current = true;
                const MAX_INTENTOS_ESCRITURA = 3;
                for (let intento = 0; intento < MAX_INTENTOS_ESCRITURA; intento++) {
                  holdSessionTraffic();
                  try {
                    await waitForSessionTrafficIdle();
                  } finally {
                    releaseSessionTraffic();
                  }
                  await update({
                    user: { ...session.user, debeCambiarPin: false },
                  });
                }
                // El estado de exito entra solo con el flag ya persistido:
                // entrar antes permitia navegar con el POST aun en vuelo.
                setPinChangeSuccess(true);
              }}
            />
            {/* INC-07 (INC07-NAV-03, C3): link de regreso FUERA de <nav>
                (dentro de <nav> vive el logo del Navbar, que tambien es
                a[href="/"]) y debajo del ChangePinForm (orden de Tab tras el
                boton). El link no modifica sesion ni flag: navegar fuera y
                volver a /portal repinta el formulario (guarda
                `debeCambiarPin` intacta, sin bypass). */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-royal transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // INC-06 (DEC-048 / DEC-051 PEND-03(a)): sin ninguna membresia activa el
  // aviso de activar membresia REEMPLAZA el contenido del portal a pantalla
  // completa (solo Navbar + tarjeta central con el copy de PEND-01; sin
  // tarjetas de estado/rutina/plan/identidad). El flag sale del resumen
  // (R3: booleano top-level unico) y solo entra aqui cuando es true: con
  // `false` o campo ausente el pintado del portal queda intacto (regresion
  // INC06-ACC-07). El flujo de cambio de PIN obligatorio (arriba) y el logout
  // (`signOut -> /login-cliente`) se conservan intactos (INC06-ACC-07 y matriz
  // de navegacion). Accesibilidad INC06-ACC-06: `role="alert"` con el copy
  // completo y el titulo como heading (estructura semantica).
  if (resumen?.sinMembresiaActiva) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar showAuth={false} />
        <div className="pt-24 pb-12">
          <div className="max-w-md mx-auto px-5">
            <Card padding="lg">
              <div role="alert">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white uppercase mb-3">
                  No tienes una membresia activa
                </h1>
                <p className="text-gray-400">
                  Contacta recepcion para activar tu membresia y volver a acceder
                </p>
              </div>
              <div className="mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/login-cliente" })}
                >
                  Cerrar sesion
                </Button>
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
