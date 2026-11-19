"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import HistorialCliente from "@/components/HistorialCliente";
import { api } from "@/lib/api";

export default function PortalHistorialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clienteId, setClienteId] = useState<string>("");
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login-cliente");
    if (status === "authenticated") {
      api.portal.resumen().then((r: any) => setClienteId(r?.cliente?.id ?? "")).catch(() => {});
    }
  }, [status, router]);
  return (
    <div className="min-h-screen p-6">
      {clienteId && <HistorialCliente clienteId={clienteId} actor={false} />}
    </div>
  );
}
