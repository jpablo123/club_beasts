"use client";

import { SessionProvider } from "next-auth/react";
import SessionRecovery from "@/components/SessionRecovery";
import RouteAnnouncerNormalize from "@/components/RouteAnnouncerNormalize";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionRecovery />
      <RouteAnnouncerNormalize />
      {children}
    </SessionProvider>
  );
}
