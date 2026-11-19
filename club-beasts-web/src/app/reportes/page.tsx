"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, Button, Navbar, PageHeader } from "@/components";
import { api } from "@/lib/api";

export default function ReportesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conteos, setConteos] = useState<any>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      api.sedes.conteos().then(setConteos).catch(() => setConteos(null));
    }
  }, [status, router]);

  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await api.notificaciones.enviar();
      setResultado(r);
    } catch {
      setResultado({ error: true });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-near-black text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <PageHeader title="Reportes" />
        <div className="grid gap-4 md:grid-cols-3">
          {conteos?.sedes?.map((s: any) => (
            <Card key={s.id}>
              <h3 className="font-display text-xl">{s.nombre}</h3>
              <p>Activos: {s.activos}</p>
              <p>Vencidos: {s.vencidos}</p>
              <p>Congelados: {s.congelados}</p>
              <p>Ingresos hoy: {s.ingresosHoy}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar avisos"}
          </Button>
          {resultado && (
            <pre className="mt-4 text-sm">{JSON.stringify(resultado, null, 2)}</pre>
          )}
        </div>
      </main>
    </div>
  );
}
