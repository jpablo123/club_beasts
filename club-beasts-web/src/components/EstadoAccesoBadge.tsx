import Badge from "./Badge";

/**
 * Etiquetas en espanol del estado de acceso del gimnasio (INC-03, CONF-04).
 *
 * La API siempre devuelve el enum (`ACTIVA`, `VENCIDA`, `PROGRAMADA`,
 * `CONGELADO`, `SIN_VIGENCIA`); aqui solo se traduce a rotulo visible con un
 * color coherente. Ninguna pantalla debe mostrar un texto de estado fijo
 * (el hardcode "Activo" del portal era el gap INC03-VEN-03).
 */
export type EstadoAccesoGym =
  | "ACTIVA"
  | "VENCIDA"
  | "PROGRAMADA"
  | "CONGELADO"
  | "SIN_VIGENCIA";

export const ETIQUETA_ESTADO_ACCESO: Record<EstadoAccesoGym, string> = {
  ACTIVA: "Activo",
  VENCIDA: "Vencido",
  PROGRAMADA: "Programado",
  CONGELADO: "Congelado",
  SIN_VIGENCIA: "Sin vigencia",
};

/** Verde activo, rojo vencido, ambar programado, azul congelado, gris sin vigencia. */
const VARIANTES: Record<
  EstadoAccesoGym,
  "success" | "danger" | "warning" | "royal" | "gray"
> = {
  ACTIVA: "success",
  VENCIDA: "danger",
  PROGRAMADA: "warning",
  CONGELADO: "royal",
  SIN_VIGENCIA: "gray",
};

export function etiquetaEstadoAcceso(estado: string): string {
  return ETIQUETA_ESTADO_ACCESO[estado as EstadoAccesoGym] ?? estado;
}

interface EstadoAccesoBadgeProps {
  /** Enum calculado por el backend (`estadoAccesoGym`). */
  estado: string;
  size?: "sm" | "md";
  className?: string;
}

export default function EstadoAccesoBadge({
  estado,
  size = "sm",
  className = "",
}: EstadoAccesoBadgeProps) {
  const variante = VARIANTES[estado as EstadoAccesoGym] ?? "gray";
  return (
    <Badge variant={variante} size={size} className={className}>
      {etiquetaEstadoAcceso(estado)}
    </Badge>
  );
}
