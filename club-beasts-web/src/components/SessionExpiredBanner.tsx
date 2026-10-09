"use client";

import { useEffect, useState } from "react";
import {
  searchWithoutSessionNotice,
  sessionNoticeForSearch,
} from "@/lib/session-notice";

/**
 * Banner de sesión expirada en las pantallas de login (INC00-AUTH-02).
 *
 * La recuperación centralizada llega con `reason=session_expired`; aquí se
 * muestra el mensaje aprobado y se elimina el param con `history.replaceState`
 * para que un refresco no vuelva a mostrarlo, conservando el `callbackUrl` de
 * la pantalla original (INC00-AUTH-03).
 */
export default function SessionExpiredBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const search = window.location.search;
    const notice = sessionNoticeForSearch(search);
    if (!notice) return;

    setMessage(notice);

    const query = searchWithoutSessionNotice(search);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query}${window.location.hash}`
    );
  }, []);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-6 p-3 bg-royal/10 border border-royal/30 rounded-card text-sm text-royal-light"
    >
      {message}
    </div>
  );
}
