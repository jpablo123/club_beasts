import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = (session?.user as any)?.apiToken ?? null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_URL}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (networkErr: any) {
    throw new Error(
      `Error de red: no se pudo conectar con el servidor (${API_URL}). Verifique que el backend esté ejecutándose.`
    );
  }

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Error del servidor: ${res.status} ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || "Error en la solicitud");
  }

  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    loginCliente: (cedula: string, pin: string) =>
      fetchApi("/auth/login-cliente", {
        method: "POST",
        body: JSON.stringify({ cedula, pin }),
      }),
    resetPin: (clienteId: string, newPin: string) =>
      fetchApi("/auth/reset-pin", {
        method: "POST",
        body: JSON.stringify({ clienteId, newPin }),
      }),
  },
  clientes: {
    list: (params?: { search?: string; sedeId?: string; estado?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.sedeId) query.set("sedeId", params.sedeId);
      if (params?.estado) query.set("estado", params.estado);
      if (params?.page) query.set("page", String(params.page));
      return fetchApi(`/clientes?${query.toString()}`);
    },
    get: (id: string) => fetchApi(`/clientes/${id}`),
    create: (data: any) =>
      fetchApi("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      fetchApi(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
};
