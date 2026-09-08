"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Button, Navbar, PageHeader } from "@/components";

export default function PortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    router.push("/login-cliente");
    return null;
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
