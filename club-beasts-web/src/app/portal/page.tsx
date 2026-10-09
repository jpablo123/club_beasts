"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Button, Navbar, PageHeader } from "@/components";
import ChangePinForm from "@/components/ChangePinForm";
import { resolveSessionExit } from "@/lib/session-recovery";

export default function PortalPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

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
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Nombre</p>
                  <p className="text-white">{session.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Estado</p>
                  <p className="text-emerald-400">Activo</p>
                </div>
              </div>
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
