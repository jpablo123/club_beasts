"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { recoverSession } from "@/lib/session-recovery";

/**
 * Recuperación proactiva: si el token de la API ya venció localmente, se
 * delega al coordinador centralizado (`src/lib/session-recovery.ts`) para que
 * comparta el mismo single-flight que el 401 del cliente HTTP.
 */
export default function SessionRecovery() {
  const { data: session, status } = useSession();
  const recovered = useRef(false);

  useEffect(() => {
    if (recovered.current) return;
    if (status !== "authenticated") return;

    const user = session?.user as
      | { apiToken?: string; apiTokenExpiresAt?: number }
      | undefined;

    if (!user?.apiToken || !user.apiTokenExpiresAt) return;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds >= user.apiTokenExpiresAt) {
      recovered.current = true;
      void recoverSession(user.apiToken);
    }
  }, [session, status]);

  return null;
}
