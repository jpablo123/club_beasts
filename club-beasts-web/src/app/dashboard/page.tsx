"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Navbar, PageHeader } from "@/components";

export default function DashboardPage() {
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
    router.push("/login");
    return null;
  }

  const userRole = (session.user as any)?.role;

  const navLinks = [
    { label: "Clientes", href: "/clientes" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar links={navLinks} />

      <div className="pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-5">
          <PageHeader
            title="Dashboard"
            description={`Bienvenido, ${session.user?.name}`}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/clientes">
              <Card className="hover:border-royal/50 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-royal/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase">Clientes</h3>
                    <p className="text-sm text-gray-400">Gestionar clientes del gimnasio</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Card className="opacity-50 h-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-white uppercase">Rutinas</h3>
                  <p className="text-sm text-gray-400">Proximamente</p>
                </div>
              </div>
            </Card>

            <Card className="opacity-50 h-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-white uppercase">Nutricion</h3>
                  <p className="text-sm text-gray-400">Proximamente</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
