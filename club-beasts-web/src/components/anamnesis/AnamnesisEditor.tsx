"use client";

/**
 * INC-09 (GREEN T10) — Formulario DUENO de la anamnesis deportiva (HU-09/HU-11).
 * Criterios C3 (guardado tolerante a parcial + espejo de validación), C3a/R3
 * (`null` explícito en campos vaciados; ausentes = conserva), C5 (banner
 * "Cambios sin guardar" + `beforeunload` + "Descartar cambios" con
 * `role="alertdialog"`), AN-07 (condicionales 12/18b se limpian con la
 * pregunta en "NO"), AN-10 ("Ninguno" exclusivo), AN-26 (al menos un campo
 * diligenciado) y DEC-056a (pre-llenado 1, 2, 9, 10 en creación).
 *
 * Contrato fijado por el RED (tests/unit/inc09-anamnesis-editor.test.tsx):
 *  - `AnamnesisEditor({ clienteId, cliente, inicial, onGuardado, onDescartar })`
 *    con `inicial` = datos existentes (edición) o `null` (creación, aplica
 *    `prellenarAnamnesisDesdeCliente`).
 *  - Payload C3a/R3: en EDICIÓN solo los campos CAMBIADOS respecto de
 *    `inicial` (con `null` EXPLÍCITO al vaciar uno diligenciado; los no
 *    tocados viajan AUSENTES = merge conserva); en CREACIÓN solo los
 *    diligenciados.
 *  - AN-26 en cliente: sin ningún campo diligenciado no llama a la API y
 *    muestra "La anamnesis debe tener al menos un campo diligenciado"
 *    (role="alert").
 *  - `onGuardado` se invoca de forma SÍNCRONA con la promesa del guardado
 *    (el RED lo aserta sin esperar la respuesta); la sección dueña decide
 *    cerrar/retomar con ese resultado. El error de API se muestra acá.
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/session-notice";
import { Button, Input, Select } from "@/components";
import MultiSelectCheckboxes from "./MultiSelectCheckboxes";
import { prellenarAnamnesisDesdeCliente, type ClientePrefill } from "@/lib/anamnesis-prefill";
import {
  CAMPOS_ANAMNESIS,
  CONDICIONALES,
  CAMPOS_SENSIBLES,
  HINTS_CAMPOS,
  type CampoAnamnesis,
  type ClaveAnamnesis,
  type AnamnesisDatos,
  type ValorAnamnesis,
} from "@/lib/anamnesis-campos";
import {
  MENSAJE_AN26,
  SECCIONES_ANAMNESIS,
  esSinDiligenciar,
  validarCampo,
  type SeccionAnamnesis,
} from "@/lib/anamnesis-schemas";

type ValorForm = string | string[];
type EstadoForm = Record<ClaveAnamnesis, ValorForm>;

interface AnamnesisEditorProps {
  clienteId: string;
  cliente: ClientePrefill;
  /** Datos existentes (edición) o `null` (creación con pre-llenado DEC-056a). */
  inicial: AnamnesisDatos | null;
  /** Se invoca de forma síncrona con la promesa del guardado (POST/PATCH). */
  onGuardado: (guardado: Promise<unknown>) => void;
  onDescartar: () => void;
}

function idDeEtiqueta(etiqueta: string): string {
  return etiqueta.toLowerCase().replace(/\s+/g, "-");
}

function diligenciado(valor: ValorForm): boolean {
  return Array.isArray(valor) ? valor.length > 0 : valor !== "";
}

function aValorForm(tipo: CampoAnamnesis["tipo"], valor: ValorAnamnesis): ValorForm {
  if (tipo === "multi") {
    return Array.isArray(valor) ? [...valor] : [];
  }
  if (esSinDiligenciar(valor)) return "";
  return String(valor);
}

function estadoInicial(
  inicial: AnamnesisDatos | null,
  cliente: ClientePrefill
): EstadoForm {
  const base: Record<string, ValorForm> = {};
  const prefill = prellenarAnamnesisDesdeCliente(cliente);
  for (const campo of CAMPOS_ANAMNESIS) {
    if (inicial) {
      base[campo.clave] = aValorForm(campo.tipo, inicial[campo.clave]);
    } else if (campo.clave === "nombreCompleto") {
      base[campo.clave] = prefill.nombreCompleto;
    } else if (campo.clave === "numeroDocumento") {
      base[campo.clave] = prefill.numeroDocumento;
    } else if (campo.clave === "numeroContacto") {
      base[campo.clave] = prefill.numeroContacto;
    } else if (campo.clave === "correoElectronico") {
      base[campo.clave] = prefill.correoElectronico ?? "";
    } else {
      base[campo.clave] = aValorForm(campo.tipo, null);
    }
  }
  return base as EstadoForm;
}

function iguales(a: ValorForm, b: ValorForm): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

/** Valor del payload (C3a): multi como `string[]`, numéricos como `number`. */
function aValorPayload(
  campo: CampoAnamnesis,
  valor: ValorForm
): string | number | string[] {
  if (campo.tipo === "multi") return [...(valor as string[])];
  if (campo.tipo === "numero") return Number(valor);
  return valor as string;
}

export default function AnamnesisEditor({
  clienteId,
  cliente,
  inicial,
  onGuardado,
  onDescartar,
}: AnamnesisEditorProps) {
  const router = useRouter();
  const [valores, setValores] = useState<EstadoForm>(() =>
    estadoInicial(inicial, cliente)
  );
  // Línea base del diff C3a (creación: pre-llenado; edición: `inicial`).
  const base = useRef<EstadoForm>(estadoInicial(inicial, cliente));
  const [errores, setErrores] = useState<Partial<Record<ClaveAnamnesis, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const vivo = useRef(true);
  // NAV-F-03b: nodos para la gestión de foco del alertdialog de descarte.
  const disparadorDescarteRef = useRef<HTMLButtonElement>(null);
  const dialogoDescarteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const sucio = CAMPOS_ANAMNESIS.some(
    (campo) => !iguales(valores[campo.clave], base.current[campo.clave])
  );

  // C5: aviso nativo al recargar/cerrar mientras haya cambios sin guardar.
  // Se suspende durante el guardado para no bloquear la salida por sesión
  // (NAV-AN-05: el 401 debe poder navegar al login sin diálogo).
  useEffect(() => {
    if (!sucio || guardando) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio, guardando]);

  // NAV-F-03b: al abrir el alertdialog el foco inicial entra al propio diálogo
  // (contenedor con `tabIndex={-1}`, sin alterar el orden de tabulación de los
  // botones); al cerrar, el foco regresa al disparador "Descartar cambios".
  useEffect(() => {
    if (!confirmarDescarte) return;
    dialogoDescarteRef.current?.focus();
    return () => {
      const disparador = disparadorDescarteRef.current;
      if (disparador?.isConnected) disparador.focus();
    };
  }, [confirmarDescarte]);

  const cambiar = (clave: ClaveAnamnesis, valor: ValorForm) => {
    setValores((prev) => {
      const siguiente: EstadoForm = { ...prev, [clave]: valor };
      // AN-07: la pregunta en "NO" limpia su condicional (evita el 400).
      const dependiente = CONDICIONALES[clave];
      if (dependiente && valor === "NO") {
        siguiente[dependiente] = Array.isArray(prev[dependiente]) ? [] : "";
      }
      return siguiente;
    });
    setErrores((prev) => ({ ...prev, [clave]: undefined }));
    setErrorGeneral("");
  };

  const onCampo =
    (clave: ClaveAnamnesis) => (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      cambiar(clave, evento.target.value);

  const onMulti = (clave: ClaveAnamnesis) => (valor: string[]) =>
    cambiar(clave, valor);

  const armarPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    for (const campo of CAMPOS_ANAMNESIS) {
      const actual = valores[campo.clave];
      const anterior = base.current[campo.clave];
      if (inicial) {
        // C3a/R3 (edición): solo lo CAMBIADO. Vaciado -> `null` explícito;
        // lo no tocado viaja AUSENTE (el merge lo conserva).
        if (iguales(actual, anterior)) continue;
        payload[campo.clave] = diligenciado(actual)
          ? aValorPayload(campo, actual)
          : null;
      } else if (diligenciado(actual)) {
        // Creación: solo los diligenciados (el pre-llenado cuenta).
        payload[campo.clave] = aValorPayload(campo, actual);
      }
    }
    return payload;
  };

  const manejarError = (err: unknown) => {
    const apiErr = err as ApiError;
    if (!vivo.current) return;
    setGuardando(false);
    if (apiErr.kind === "session_expired") {
      // Patrón de la ficha (INC00-AUTH-02/03): sin `router.push` suelto que
      // compita con la recuperación centralizada ni pierda el callbackUrl.
      setErrorGeneral(apiErr.message || SESSION_EXPIRED_MESSAGE);
      const exit = resolveSessionExit("/login");
      if (exit) router.push(exit);
      return;
    }
    setErrorGeneral(apiErr.message || "Error al guardar la anamnesis.");
  };

  const aplicarCambios = () => {
    setErrorGeneral("");
    // AN-26 (HU-11): al menos un campo diligenciado en el formulario.
    const diligenciados = CAMPOS_ANAMNESIS.filter((campo) =>
      diligenciado(valores[campo.clave])
    );
    if (diligenciados.length === 0) {
      setErrorGeneral(MENSAJE_AN26);
      return;
    }
    // "Lo presente se valida siempre" (AN-23) con el espejo del canónico.
    const nuevosErrores: Partial<Record<ClaveAnamnesis, string>> = {};
    for (const campo of diligenciados) {
      const mensaje = validarCampo(
        campo.clave,
        aValorPayload(campo, valores[campo.clave])
      );
      if (mensaje) nuevosErrores[campo.clave] = mensaje;
    }
    if (Object.values(nuevosErrores).some(Boolean)) {
      setErrores(nuevosErrores);
      return;
    }
    const payload = armarPayload();
    setGuardando(true);
    const guardado = inicial
      ? api.anamnesis.update(clienteId, payload)
      : api.anamnesis.create(clienteId, payload);
    // C3 (contrato del RED): `onGuardado` se dispara en el click con la
    // promesa del guardado; la sección dueña cierra/retoma con su resultado.
    onGuardado(guardado);
    guardado.then(
      () => {
        if (vivo.current) setGuardando(false);
      },
      manejarError
    );
  };

  return (
    <div>
      {/* C5: banner de cambios sin guardar (mientras el formulario está sucio). */}
      {sucio && (
        <div role="status" className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-card">
          <p className="text-amber-400 text-sm">Cambios sin guardar</p>
        </div>
      )}

      {/* AN-26 / errores de guardado (rol alert accesible). */}
      {errorGeneral && (
        <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-card">
          <p className="text-red-400 text-sm">{errorGeneral}</p>
        </div>
      )}

      <div className="space-y-6">
        {(Object.keys(SECCIONES_ANAMNESIS) as SeccionAnamnesis[]).map((claveSeccion) => {
          const seccion = SECCIONES_ANAMNESIS[claveSeccion];
          return (
            <div key={claveSeccion}>
              <h3 className="font-display text-lg font-bold text-white uppercase tracking-wide mb-3">
                {seccion.titulo}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CAMPOS_ANAMNESIS.filter((campo) =>
                  (seccion.campos as readonly string[]).includes(campo.clave)
                ).map((campo) => (
                  <div
                    key={campo.clave}
                    className={
                      campo.tipo === "textoLargo" || campo.tipo === "multi"
                        ? "sm:col-span-2"
                        : undefined
                    }
                  >
                    {campo.tipo === "multi" ? (
                      <MultiSelectCheckboxes
                        etiqueta={campo.etiqueta}
                        opciones={campo.opciones ?? []}
                        valor={valores[campo.clave] as string[]}
                        onChange={onMulti(campo.clave)}
                      />
                    ) : campo.tipo === "textoLargo" ? (
                      <div className="space-y-1">
                        <label
                          htmlFor={idDeEtiqueta(campo.etiqueta)}
                          className="block text-sm font-medium text-gray-300"
                        >
                          {campo.etiqueta}
                        </label>
                        <textarea
                          id={idDeEtiqueta(campo.etiqueta)}
                          value={valores[campo.clave] as string}
                          onChange={onCampo(campo.clave)}
                          rows={campo.filas ?? 2}
                          className="w-full px-4 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-colors"
                        />
                        {errores[campo.clave] && (
                          <p className="text-sm text-red-400">{errores[campo.clave]}</p>
                        )}
                      </div>
                    ) : campo.tipo === "select" ? (
                      <Select
                        label={campo.etiqueta}
                        value={valores[campo.clave] as string}
                        onChange={onCampo(campo.clave)}
                        error={errores[campo.clave]}
                        options={[
                          { value: "", label: "Selecciona..." },
                          ...(campo.opciones ?? []).map((opcion) => ({
                            value: opcion,
                            label: opcion,
                          })),
                        ]}
                      />
                    ) : (
                      <Input
                        label={campo.etiqueta}
                        type={
                          campo.tipo === "numero"
                            ? "number"
                            : campo.tipo === "fecha"
                              ? "date"
                              : campo.tipo === "hora"
                                ? "time"
                                : "text"
                        }
                        min={campo.min}
                        max={campo.max}
                        value={valores[campo.clave] as string}
                        onChange={onCampo(campo.clave)}
                        error={errores[campo.clave]}
                      />
                    )}
                    <p className="text-xs text-gray-400 mt-1">{HINTS_CAMPOS[campo.clave]}</p>
                    {CAMPOS_SENSIBLES.includes(campo.clave) && (
                      <p className="text-xs text-amber-400 mt-1">Informacion confidencial</p>
                    )}
                    {campo.clave === "cualDeporte" &&
                      valores.practicaDeporte === "NO" &&
                      (valores.cualDeporte as string) !== "" && (
                        <p className="text-xs text-red-400 mt-1">Contradiccion: el campo 12 no aplica si no practica deporte.</p>
                      )}
                    {campo.clave === "cualEnfermedad" &&
                      valores.enfermedadRelevante === "NO" &&
                      (valores.cualEnfermedad as string) !== "" && (
                        <p className="text-xs text-red-400 mt-1">Contradiccion: el campo 18b no aplica si no hay enfermedad.</p>
                      )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 pt-6">
        <Button type="button" onClick={aplicarCambios} loading={guardando}>
          Aplicar cambios
        </Button>
        <Button
          type="button"
          variant="secondary"
          ref={disparadorDescarteRef}
          onClick={() => setConfirmarDescarte(true)}
        >
          Descartar cambios
        </Button>
      </div>

      {/* C5 (NAV-AN-06): confirmación inline accesible del descarte. */}
      {confirmarDescarte && (
        <div
          ref={dialogoDescarteRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-label="Descartar cambios"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 focus:outline-none"
        >
          <div className="max-w-md w-full bg-dark-surface border border-gray-700 rounded-card p-6">
            <p className="text-white mb-4">
              ¿Descartar los cambios? Se perderá lo que hayas diligenciado.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setConfirmarDescarte(false);
                  onDescartar();
                }}
              >
                Si, descartar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmarDescarte(false)}
              >
                Seguir editando
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
