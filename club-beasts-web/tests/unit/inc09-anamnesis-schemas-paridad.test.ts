/**
 * INC-09 (RED) — Paridad del espejo de validación web con el contrato canónico.
 * Criterio: C3 (espejo `src/lib/anamnesis-schemas.ts`) / INC09-R06 (drift).
 *
 * El web NO importa `features/` en producto (tsconfig/dependencias propias) y
 * no usa zod: la validación de UI es un ESPEJO de `HU-09-schemas.ts`. Este
 * test es la barrera anti-drift: compara el espejo contra el schema CANÓNICO
 * de `club-beasts-api/features/acceptance-criteria/HU-09-schemas.ts` (import
 * solo de TESTS, permitido; el import de producto sigue prohibido).
 *
 * Contrato fijado por este RED para `src/lib/anamnesis-schemas.ts` (GREEN T10):
 *   - exporta los literales EXACTOS del Anexo DEC-052:
 *       SEXO, SI_NO, ANTECEDENTES_MEDICOS, DIAS_NO_ENTRENAMIENTO, NIVEL_ACTIVIDAD
 *     (mismos arrays, mismo orden, misma capitalización literal).
 *   - exporta `MENSAJE_AN26: string` = "La anamnesis debe tener al menos un
 *     campo diligenciado" (HU-11, guarda de body del formulario).
 *   - exporta `validarCampo(campo: string, valor: unknown): string | null`:
 *     devuelve `null` si el valor es válido o está "sin diligenciar" (`null`,
 *     `""`, `undefined`) y el MISMO mensaje del schema canónico si no.
 *     Reglas por campo = las de la tabla canónica de HU-09 (formato, enums,
 *     límites y multi-selects). Las contradicciones SI/NO son multi-campo y se
 *     validan en API (el editor las evita limpiando los condicionales).
 *
 * FASE RED (2026-11-04): el espejo NO existe (GREEN T10). Los tests fallan por
 * COMPORTAMIENTO AUSENTE (módulo inexistente) con mensaje explícito.
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 *
 * ENMIENDA INC09-FIX-01 (2026-11-04) — corrección de fixture del RED (patrón C4):
 *   Causa: premisa incorrecta en el fixture, NO defecto de producto. El caso
 *   `["objetivosEntrenamiento", "Ganar"]` estaba en CASOS_INVALIDOS, pero el
 *   schema canónico usa `.min(5)` INCLUSIVO (`HU-09-schemas.ts:341-344`), por
 *   lo que "Ganar" (5 caracteres) es VÁLIDO y la premisa "el caso debe ser
 *   invalido en el canonico" fallaba (`expected null not to be null`) antes de
 *   comparar la paridad (que era correcta: espejo y canónico devolvían `null`).
 *   Corrección: se reemplaza el valor por `"Gana"` (4 caracteres), inválido con
 *   el mensaje canónico "Objetivos de entrenamiento debe tener entre 5 y 1000
 *   caracteres", conservando la intención del caso: cobrar la rama de longitud
 *   mínima de `objetivosEntrenamiento` como inválido.
 *   0 cambios de expectativa de paridad: mensajes, reglas y asserts intactos.
 */
import { describe, it, expect } from "vitest";

const RUTA_ESPEJO = "../../src/lib/anamnesis-schemas";
const RUTA_CANONICO = "../../../club-beasts-api/features/acceptance-criteria/HU-09-schemas";
const RUTA_CANONICO_HU11 = "../../../club-beasts-api/features/acceptance-criteria/HU-11-schemas";

async function importarEspejo(): Promise<any> {
  const ruta: string = RUTA_ESPEJO;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: falta el espejo de producto src/lib/anamnesis-schemas.ts " +
        "(validacion de UI, GREEN T10). Fallo de comportamiento ausente esperado."
    );
  }
}

async function importarCanonico(): Promise<any> {
  const ruta: string = RUTA_CANONICO;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: no se pudo importar el contrato canonico HU-09-schemas.ts " +
        "(entorno/fixture del RED, no comportamiento)."
    );
  }
}

async function importarCanonicoHu11(): Promise<any> {
  const ruta: string = RUTA_CANONICO_HU11;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: no se pudo importar el contrato canonico HU-11-schemas.ts."
    );
  }
}

/** Valor del primer error del schema canónico para un campo aislado. */
function mensajeCanonico(canonico: any, campo: string, valor: unknown): string | null {
  const resultado = canonico.anamnesisCamposSchema.safeParse({ [campo]: valor });
  if (resultado.success) return null;
  return resultado.error.errors[0].message as string;
}

/** [campo, valor] que deben validar igual en espejo y canónico. */
const CASOS_VALIDOS: Array<[string, unknown]> = [
  ["nombreCompleto", "Ana Maria Perez"],
  ["numeroDocumento", "1020304050"],
  ["sexo", "FEMENINO"],
  ["rh", "O+"],
  ["edad", 25],
  ["fechaNacimiento", "1998-04-12"],
  ["lugarNacimiento", "Bogota D.C."],
  ["estadoCivil", "Soltero"],
  ["direccionResidencia", "Calle 45 # 12-34"],
  ["numeroContacto", "3001234567"],
  ["correoElectronico", "ana@mail.com"],
  ["practicaDeporte", "SI"],
  ["cualDeporte", "Futbol"],
  ["tiempoQuePractica", "3 anos"],
  ["contactoEmergencia", "Maria Perez 3001112233"],
  ["eps", "Nueva EPS"],
  ["antecedentesMedicos", ["Alergias", "fuma"]],
  ["antecedentesMedicos", ["Ninguno"]],
  ["antecedentesFamiliares", "Diabetes en abuelos"],
  ["enfermedadRelevante", "NO"],
  ["cualEnfermedad", "Hipertension"],
  ["objetivosEntrenamiento", "Ganar masa muscular"],
  ["nivelActividad", "estoy bastante activo durante mi dia"],
  ["diasNoEntrenamiento", ["lunes", "miercoles"]],
  ["horaAcostarse", "22:30"],
  ["comidasPorDia", 3],
];

/** [campo, valor] inválidos: el espejo debe emitir EXACTAMENTE el mensaje canónico. */
const CASOS_INVALIDOS: Array<[string, unknown]> = [
  ["nombreCompleto", "An"],
  ["nombreCompleto", "Ana3"],
  ["numeroDocumento", "CC1020"],
  ["numeroDocumento", "12345"],
  ["sexo", "M"],
  ["sexo", "femenino"],
  ["rh", "X"],
  ["rh", "cero positivo"],
  ["edad", 12],
  ["edad", 101],
  ["fechaNacimiento", "12/04/1998"],
  ["fechaNacimiento", "2030-01-01"],
  ["lugarNacimiento", "@@"],
  ["estadoCivil", "casado2"],
  ["direccionResidencia", "Calle @%"],
  ["numeroContacto", "30012a4567"],
  ["correoElectronico", "ana@mail"],
  ["practicaDeporte", "Si"],
  ["cualDeporte", "F"],
  ["tiempoQuePractica", "x".repeat(101)],
  ["contactoEmergencia", "Mar"],
  ["eps", "@"],
  ["antecedentesMedicos", ["asma"]],
  ["antecedentesMedicos", ["Ninguno", "fuma"]],
  ["antecedentesMedicos", ["fuma", "fuma"]],
  ["antecedentesFamiliares", "x".repeat(501)],
  ["enfermedadRelevante", "no se"],
  ["cualEnfermedad", "H"],
  // ENMIENDA INC09-FIX-01: "Ganar" (5 chars) es VÁLIDO porque el canónico usa
  // min(5) inclusivo; "Gana" (4 chars) cubre la rama de longitud mínima como
  // inválido con el mensaje canónico. Premisa del fixture, no del producto.
  ["objetivosEntrenamiento", "Gana"],
  ["nivelActividad", "muy activo"],
  ["diasNoEntrenamiento", ["sabado"]],
  ["diasNoEntrenamiento", ["lunes", "lunes"]],
  ["horaAcostarse", "10:30 pm"],
  ["comidasPorDia", 0],
  ["comidasPorDia", 13],
];

describe("paridad espejo web ↔ schema canónico (INC09-R06/C3)", () => {
  it("los literales del Anexo son idénticos (mismo orden y capitalización)", async () => {
    const espejo = await importarEspejo();
    const canonico = await importarCanonico();
    for (const literal of [
      "SEXO",
      "SI_NO",
      "ANTECEDENTES_MEDICOS",
      "DIAS_NO_ENTRENAMIENTO",
      "NIVEL_ACTIVIDAD",
    ] as const) {
      expect([...espejo[literal]], `literal ${literal}`).toEqual([...canonico[literal]]);
    }
  });

  it("MENSAJE_AN26 coincide con la guarda de body del canónico", async () => {
    const espejo = await importarEspejo();
    const canonicoHu11 = await importarCanonicoHu11();
    const resultado = canonicoHu11.guardarParcialAnamnesisSchema.safeParse({});
    expect(resultado.success).toBe(false);
    expect(espejo.MENSAJE_AN26).toBe(resultado.error.errors[0].message);
    expect(espejo.MENSAJE_AN26).toBe(
      "La anamnesis debe tener al menos un campo diligenciado"
    );
  });

  for (const [campo, valor] of CASOS_VALIDOS) {
    it(`validarCampo(${campo}, ${JSON.stringify(valor)}) -> null`, async () => {
      const espejo = await importarEspejo();
      const canonico = await importarCanonico();
      expect(mensajeCanonico(canonico, campo, valor), "el caso debe ser valido en el canonico").toBeNull();
      expect(espejo.validarCampo(campo, valor)).toBeNull();
    });
  }

  for (const [campo, valor] of CASOS_INVALIDOS) {
    it(`validarCampo(${campo}, ${JSON.stringify(valor)}) -> mensaje del canonico`, async () => {
      const espejo = await importarEspejo();
      const canonico = await importarCanonico();
      const esperado = mensajeCanonico(canonico, campo, valor);
      expect(esperado, "el caso debe ser invalido en el canonico").not.toBeNull();
      expect(espejo.validarCampo(campo, valor)).toBe(esperado);
    });
  }

  it("sin diligenciar (null / \"\" / undefined) nunca produce error en el espejo", async () => {
    const espejo = await importarEspejo();
    for (const campo of ["rh", "edad", "antecedentesMedicos", "horaAcostarse"]) {
      for (const vacio of [null, "", undefined]) {
        expect(espejo.validarCampo(campo, vacio), `${campo}=${JSON.stringify(vacio)}`).toBeNull();
      }
    }
  });
});
