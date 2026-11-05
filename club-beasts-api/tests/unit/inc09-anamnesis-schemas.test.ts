/**
 * INC-09 (RED) — Contrato canónico de schemas de anamnesis (unit).
 * Criterios: AN-03 (secciones), AN-05 (obligatorios del envío completo —
 * ENMIENDA C4 R4: verificación a nivel de schema), AN-06 (enums), AN-07
 * (condicionales: ramas de ausencia a nivel de schema + contradicciones),
 * AN-08 (formato), AN-09 (límites DEC-059), AN-10 (multi-selects), AN-11
 * (contrato cerrado), AN-22 (estado derivado), AN-26 (guarda de body) y los
 * PINES de la ENMIENDA C4 DEC-055 (HU-10-schemas: 5 sensibles con `rh`).
 *
 * Estos tests fijan los schemas CANÓNICOS de
 * `features/acceptance-criteria/HU-09|HU-10|HU-11|HU-28-schemas.ts` (INC09-R08
 * anti-deriva): los tests de integración derivan de aquí sus mensajes y el
 * GREEN debe copiarlos sin cambios a `src/schemas/anamnesis.schema.ts`.
 *
 * Nota de fase: los schemas canónicos EXISTEN hoy (los generó el analista y la
 * ENMIENDA C4 de DEC-055 se aplicó en T2), por lo que estos tests están en
 * VERDE desde el RED: son la evidencia de la enmienda y la barrera de drift
 * para el GREEN. El rojo de comportamiento vive en los tests de integración
 * (endpoints inexistentes) y en los de web/E2E (pantallas inexistentes).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 */
import { describe, it, expect } from "vitest";
import {
  ANTECEDENTES_MEDICOS,
  CAMPOS_OBLIGATORIOS,
  DIAS_NO_ENTRENAMIENTO,
  NIVEL_ACTIVIDAD,
  SECCIONES_ANAMNESIS,
  SEXO,
  SI_NO,
  anamnesisCamposSchema,
  anamnesisConsistenteSchema,
  antecedentesMedicosBase,
  comidasPorDiaBase,
  cumpleCompletitud,
  diasNoEntrenamientoBase,
  edadBase,
  fechaNacimientoBase,
  registrarAnamnesisSchema,
  rhBase,
} from "../../features/acceptance-criteria/HU-09-schemas";
import {
  derivarEstadoAnamnesis,
  guardarParcialAnamnesisSchema,
} from "../../features/acceptance-criteria/HU-11-schemas";
import {
  CAMPOS_SENSIBLES,
  CLASIFICACION_CAMPOS,
  anamnesisDuenoSchema,
  anamnesisRecepcionSchema,
} from "../../features/acceptance-criteria/HU-10-schemas";
import {
  anamnesisClienteSeccionesSchema,
  anamnesisSinRegistroSchema,
} from "../../features/acceptance-criteria/HU-28-schemas";

/** Body COMPLETO consistente (25 propiedades; 18a=SI para que 18b aplique). */
const COMPLETO: Record<string, unknown> = {
  nombreCompleto: "Ana Maria Perez",
  numeroDocumento: "1020304050",
  sexo: "FEMENINO",
  rh: "O+",
  edad: 25,
  fechaNacimiento: "1998-04-12",
  lugarNacimiento: "Bogota D.C.",
  estadoCivil: "Soltero",
  direccionResidencia: "Calle 45 # 12-34",
  numeroContacto: "3001234567",
  correoElectronico: "ana@mail.com",
  practicaDeporte: "SI",
  cualDeporte: "Futbol",
  tiempoQuePractica: "3 anos",
  contactoEmergencia: "Maria Perez 3001112233",
  eps: "Nueva EPS",
  antecedentesMedicos: ["Alergias"],
  antecedentesFamiliares: "Diabetes en abuelos",
  enfermedadRelevante: "SI",
  cualEnfermedad: "Hipertension",
  objetivosEntrenamiento: "Ganar masa muscular",
  nivelActividad: "estoy bastante activo durante mi dia",
  diasNoEntrenamiento: ["lunes", "viernes"],
  horaAcostarse: "22:30",
  comidasPorDia: 3,
};

function primerError(resultado: ReturnType<typeof registrarAnamnesisSchema.safeParse>): string {
  if (resultado.success || !resultado.error) {
    throw new Error("se esperaba un error del schema canonico");
  }
  return resultado.error.errors[0].message as string;
}

function errorDeCampo(
  resultado: ReturnType<typeof registrarAnamnesisSchema.safeParse>,
  campo: string
): string | undefined {
  return resultado.error?.errors.find((e: any) => e.path[0] === campo)?.message as
    | string
    | undefined;
}

describe("AN-03 agrupación en secciones (S1-S4)", () => {
  it("la unión de las secciones contiene exactamente las 25 propiedades (11/3/6/5)", () => {
    const porSeccion = Object.entries(SECCIONES_ANAMNESIS).map(
      ([clave, seccion]) => [clave, [...(seccion as { campos: readonly string[] }).campos]] as const
    );
    expect(porSeccion.map(([_, campos]) => campos.length)).toEqual([11, 3, 6, 5]);

    const union = porSeccion.flatMap(([_, campos]) => campos);
    expect(new Set(union).size, "sin campos duplicados").toBe(25);
    expect(union.sort()).toEqual(Object.keys(COMPLETO).sort());
  });
});

describe("AN-05 obligatorios del envío completo (ENMIENDA C4 R4: a nivel de schema)", () => {
  const MENSAJES: Record<string, string> = {
    nombreCompleto: "Nombre completo es requerido",
    numeroDocumento: "Número de documento es requerido",
    sexo: "Sexo es requerido",
    rh: "RH es requerido",
    edad: "Edad es requerida",
    fechaNacimiento: "Fecha de nacimiento es requerida",
    lugarNacimiento: "Lugar de nacimiento es requerido",
    direccionResidencia: "Dirección de residencia es requerida",
    numeroContacto: "Número de contacto es requerido",
    contactoEmergencia: "Contacto de emergencia es requerido",
    eps: "EPS es requerida",
    enfermedadRelevante: "Enfermedad relevante es requerida",
    objetivosEntrenamiento: "Objetivos de entrenamiento es requerido",
    nivelActividad: "Nivel de actividad es requerido",
  };

  it("CAMPOS_OBLIGATORIOS son los 14 del Anexo", () => {
    expect([...CAMPOS_OBLIGATORIOS].sort()).toEqual(Object.keys(MENSAJES).sort());
  });

  for (const campo of Object.keys(MENSAJES)) {
    it(`sin ${campo} -> registrarAnamnesisSchema exige "${MENSAJES[campo]}"`, () => {
      const body = { ...COMPLETO };
      delete body[campo];
      const resultado = registrarAnamnesisSchema.safeParse(body);
      expect(resultado.success).toBe(false);
      expect(errorDeCampo(resultado, campo)).toBe(MENSAJES[campo]);
    });
  }

  it("el envío completo con los 25 campos valida", () => {
    expect(registrarAnamnesisSchema.safeParse(COMPLETO).success).toBe(true);
  });
});

describe("AN-07 condicionales SI/NO a nivel de schema", () => {
  it("rama ausente: 11=SI sin 12 -> 'Cual deporte es requerido cuando practica algún deporte'", () => {
    const body = { ...COMPLETO };
    delete body.cualDeporte;
    const resultado = registrarAnamnesisSchema.safeParse(body);
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "cualDeporte")).toBe(
      "Cual deporte es requerido cuando practica algún deporte"
    );
  });

  it("rama ausente: 18a=SI sin 18b -> 'Cual enfermedad es requerida cuando tiene enfermedad relevante'", () => {
    const body = { ...COMPLETO };
    delete body.cualEnfermedad;
    const resultado = registrarAnamnesisSchema.safeParse(body);
    expect(resultado.success).toBe(false);
    expect(errorDeCampo(resultado, "cualEnfermedad")).toBe(
      "Cual enfermedad es requerida cuando tiene enfermedad relevante"
    );
  });

  it("contradicción: 11=NO con 12 -> 400 'Cual deporte no aplica cuando no practica algún deporte'", () => {
    const resultado = anamnesisConsistenteSchema.safeParse({
      practicaDeporte: "NO",
      cualDeporte: "Futbol",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Cual deporte no aplica cuando no practica algún deporte"
    );
  });

  it("contradicción: 18a=NO con 18b -> 'Cual enfermedad no aplica cuando no tiene enfermedad relevante'", () => {
    const resultado = anamnesisConsistenteSchema.safeParse({
      enfermedadRelevante: "NO",
      cualEnfermedad: "Hipertension",
    });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Cual enfermedad no aplica cuando no tiene enfermedad relevante"
    );
  });
});

describe("AN-22 estado derivado (derivarEstadoAnamnesis / cumpleCompletitud)", () => {
  it("0 faltantes -> COMPLETA", () => {
    expect(derivarEstadoAnamnesis(COMPLETO as any)).toBe("COMPLETA");
    expect(cumpleCompletitud(COMPLETO as any)).toBe(true);
  });

  it("falta 1 obligatorio -> PENDIENTE", () => {
    const body = { ...COMPLETO };
    delete body.eps;
    expect(derivarEstadoAnamnesis(body as any)).toBe("PENDIENTE");
  });

  it("11=SI sin 12 -> PENDIENTE; con 12 -> COMPLETA", () => {
    const sin12 = { ...COMPLETO };
    delete sin12.cualDeporte;
    expect(derivarEstadoAnamnesis(sin12 as any)).toBe("PENDIENTE");
    expect(derivarEstadoAnamnesis(COMPLETO as any)).toBe("COMPLETA");
  });

  it("18a=SI sin 18b -> PENDIENTE", () => {
    const body = { ...COMPLETO };
    delete body.cualEnfermedad;
    expect(derivarEstadoAnamnesis(body as any)).toBe("PENDIENTE");
  });
});

describe("AN-26 guarda de body (guardarParcialAnamnesisSchema)", () => {
  it("body {} -> 'La anamnesis debe tener al menos un campo diligenciado'", () => {
    const resultado = guardarParcialAnamnesisSchema.safeParse({});
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "La anamnesis debe tener al menos un campo diligenciado"
    );
  });

  it("solo claves vacías (null / \"\") -> mismo error", () => {
    for (const body of [{ estadoCivil: "" }, { estadoCivil: null }, { eps: null, estadoCivil: "" }]) {
      const resultado = guardarParcialAnamnesisSchema.safeParse(body);
      expect(resultado.success).toBe(false);
      expect(primerError(resultado)).toBe(
        "La anamnesis debe tener al menos un campo diligenciado"
      );
    }
  });

  it("1 campo diligenciado -> válido (ausencias toleradas)", () => {
    expect(
      guardarParcialAnamnesisSchema.safeParse({ estadoCivil: "Soltero" }).success
    ).toBe(true);
    expect(
      guardarParcialAnamnesisSchema.safeParse({ objetivosEntrenamiento: "Ganar" }).success
    ).toBe(true);
  });
});

describe("AN-06 enums exactos del Anexo", () => {
  it("todos los literales de sexo/SI_NO pasan; las variantes fallan", () => {
    for (const sexo of SEXO) {
      expect(anamnesisCamposSchema.safeParse({ sexo }).success).toBe(true);
    }
    for (const valor of ["M", "femenino", "Femenino", "F"]) {
      const resultado = anamnesisCamposSchema.safeParse({ sexo: valor });
      expect(resultado.success).toBe(false);
      expect(primerError(resultado)).toBe("Sexo debe ser FEMENINO o MASCULINO");
    }
    for (const siNo of SI_NO) {
      expect(anamnesisCamposSchema.safeParse({ practicaDeporte: siNo }).success).toBe(true);
    }
  });

  it("los 8 antecedentes pasan; 'asma' -> mensaje del Anexo", () => {
    for (const antecedente of ANTECEDENTES_MEDICOS) {
      expect(
        anamnesisCamposSchema.safeParse({ antecedentesMedicos: [antecedente] }).success
      ).toBe(true);
    }
    const resultado = anamnesisCamposSchema.safeParse({ antecedentesMedicos: ["asma"] });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Antecedentes médicos contiene un valor no permitido"
    );
  });

  it("los 5 días pasan; 'sabado' y 'Miercoles' fallan", () => {
    for (const dia of DIAS_NO_ENTRENAMIENTO) {
      expect(
        anamnesisCamposSchema.safeParse({ diasNoEntrenamiento: [dia] }).success
      ).toBe(true);
    }
    for (const valor of [["sabado"], ["Miercoles"]]) {
      const resultado = anamnesisCamposSchema.safeParse({ diasNoEntrenamiento: valor });
      expect(resultado.success).toBe(false);
      expect(primerError(resultado)).toBe(
        "Días que no puede entrenar contiene un valor no permitido"
      );
    }
  });

  it("los 4 niveles de actividad pasan; paráfrasis falla", () => {
    for (const nivel of NIVEL_ACTIVIDAD) {
      expect(anamnesisCamposSchema.safeParse({ nivelActividad: nivel }).success).toBe(true);
    }
    const resultado = anamnesisCamposSchema.safeParse({ nivelActividad: "muy activo" });
    expect(resultado.success).toBe(false);
    expect(primerError(resultado)).toBe(
      "Nivel de actividad debe ser una de las opciones permitidas"
    );
  });
});

describe("AN-08 formato (DEC-059: regex RH, fechas, horas)", () => {
  it("los 8 tipos de sangre del regex RH pasan; el resto falla", () => {
    for (const rh of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
      expect(rhBase.safeParse(rh).success, `RH ${rh}`).toBe(true);
    }
    for (const rh of ["X", "cero positivo", "A", "AB0", "o+ "]) {
      const resultado = rhBase.safeParse(rh);
      expect(resultado.success, `RH ${rh}`).toBe(false);
      expect(resultado.error?.errors[0].message).toBe(
        "RH debe ser un tipo de sangre válido (A+, A-, B+, B-, AB+, AB-, O+, O-)"
      );
    }
    // Vacío cae en la guarda de requerido, no en el regex.
    expect(rhBase.safeParse("").error?.errors[0].message).toBe("RH es requerido");
  });

  it("fechaNacimiento: real y no futura pasa; formato/futura/inexistente fallan", () => {
    expect(fechaNacimientoBase.safeParse("1998-04-12").success).toBe(true);
    expect(fechaNacimientoBase.safeParse("12/04/1998").success).toBe(false);
    expect(fechaNacimientoBase.safeParse("2030-01-01").error?.errors[0].message).toBe(
      "Fecha de nacimiento no puede ser futura"
    );
    expect(fechaNacimientoBase.safeParse("1998-02-30").success).toBe(false);
  });
});

describe("AN-09 valores límite (DEC-059: edad 13..100, comidas 1..12)", () => {
  it("edad: 13 y 100 pasan; 12 y 101 fallan con el mensaje del rango", () => {
    expect(edadBase.safeParse(13).success).toBe(true);
    expect(edadBase.safeParse(100).success).toBe(true);
    for (const edad of [12, 101]) {
      const resultado = edadBase.safeParse(edad);
      expect(resultado.success).toBe(false);
      expect(resultado.error?.errors[0].message).toBe("Edad debe estar entre 13 y 100");
    }
  });

  it("comidas: 1 y 12 pasan; 0 y 13 fallan con el mensaje del rango", () => {
    expect(comidasPorDiaBase.safeParse(1).success).toBe(true);
    expect(comidasPorDiaBase.safeParse(12).success).toBe(true);
    for (const comidas of [0, 13]) {
      const resultado = comidasPorDiaBase.safeParse(comidas);
      expect(resultado.success).toBe(false);
      expect(resultado.error?.errors[0].message).toBe(
        "Comidas al día debe estar entre 1 y 12"
      );
    }
  });
});

describe("AN-10 multi-selects: 'Ninguno' exclusivo y sin repetidos", () => {
  it("['Ninguno'] solo pasa; combinado falla con su mensaje", () => {
    expect(antecedentesMedicosBase.safeParse(["Ninguno"]).success).toBe(true);
    const combinado = antecedentesMedicosBase.safeParse(["Ninguno", "fuma"]);
    expect(combinado.success).toBe(false);
    expect(combinado.error?.errors[0].message).toBe(
      "Ninguno no se puede combinar con otros antecedentes médicos"
    );
  });

  it("repetidos fallan con su mensaje (16 y 21)", () => {
    const repetidos = antecedentesMedicosBase.safeParse(["fuma", "fuma"]);
    expect(repetidos.success).toBe(false);
    expect(repetidos.error?.errors[0].message).toBe(
      "Antecedentes médicos no puede tener valores repetidos"
    );
    const dias = diasNoEntrenamientoBase.safeParse(["lunes", "lunes"]);
    expect(dias.success).toBe(false);
    expect(dias.error?.errors[0].message).toBe(
      "Días que no puede entrenar no puede tener valores repetidos"
    );
  });
});

describe("AN-11 contrato cerrado (strict)", () => {
  it("clave desconocida rechaza el objeto", () => {
    expect(anamnesisCamposSchema.safeParse({ peso: 80 }).success).toBe(false);
    expect(anamnesisCamposSchema.safeParse({ estado: "COMPLETA" }).success).toBe(false);
    expect(anamnesisCamposSchema.safeParse(COMPLETO).success).toBe(true);
  });
});

describe("ENMIENDA C4 (DEC-055): 5 sensibles con rh — pines anti-drift", () => {
  it("CAMPOS_SENSIBLES son exactamente los 5 de DEC-055", () => {
    expect([...CAMPOS_SENSIBLES]).toEqual([
      "rh",
      "antecedentesMedicos",
      "antecedentesFamiliares",
      "enfermedadRelevante",
      "cualEnfermedad",
    ]);
  });

  it("CLASIFICACION_CAMPOS marca SENSIBLE exactamente esos 5 (rh incluido)", () => {
    const sensibles = Object.entries(CLASIFICACION_CAMPOS)
      .filter(([_, clasificacion]) => clasificacion === "SENSIBLE")
      .map(([campo]) => campo)
      .sort();
    expect(sensibles).toEqual([...CAMPOS_SENSIBLES].sort());
    expect(CLASIFICACION_CAMPOS.rh).toBe("SENSIBLE");
    expect(CLASIFICACION_CAMPOS.contactoEmergencia).toBe("OPERATIVA");
    expect(CLASIFICACION_CAMPOS.eps).toBe("OPERATIVA");
  });

  it("anamnesisRecepcionSchema omite exactamente las 5 claves (20/25 props)", () => {
    const salida = anamnesisRecepcionSchema.parse({
      ...COMPLETO,
      clienteId: "c1",
      estado: "COMPLETA",
      fechaActualizacion: "2026-11-04T10:00:00.000Z",
      actualizadoPorId: "u1",
    });
    for (const clave of CAMPOS_SENSIBLES) {
      expect(salida, `RECEP sin ${clave}`).not.toHaveProperty(clave);
    }
    expect(Object.keys(salida)).toHaveLength(24); // 20 props + 4 metadatos
    expect(salida.nombreCompleto).toBe("Ana Maria Perez");
  });

  it("anamnesisDuenoSchema conserva los 5 sensibles (25 props + 4 metadatos)", () => {
    const salida = anamnesisDuenoSchema.parse({
      ...COMPLETO,
      clienteId: "c1",
      estado: "COMPLETA",
      fechaActualizacion: "2026-11-04T10:00:00.000Z",
      actualizadoPorId: "u1",
    });
    expect(Object.keys(salida)).toHaveLength(29);
    for (const clave of CAMPOS_SENSIBLES) {
      expect(salida, `DUENO con ${clave}`).toHaveProperty(clave);
    }
    expect(salida.rh).toBe("O+");
  });
});

describe("HU-28: vista por secciones SIN actualizadoPorId (DEC-041)", () => {
  it("anamnesisClienteSeccionesSchema agrupa 11/3/6/5 y omite actualizadoPorId", () => {
    const secciones: Record<string, Record<string, unknown>> = {};
    for (const [clave, seccion] of Object.entries(SECCIONES_ANAMNESIS)) {
      const campos = (seccion as { campos: readonly string[] }).campos;
      secciones[clave] = Object.fromEntries(campos.map((campo) => [campo, COMPLETO[campo]]));
    }
    const salida = anamnesisClienteSeccionesSchema.parse({
      clienteId: "c1",
      estado: "COMPLETA",
      fechaActualizacion: "2026-11-04T10:00:00.000Z",
      secciones,
    });
    expect(salida).not.toHaveProperty("actualizadoPorId");
    expect(Object.keys(salida.secciones.S1)).toHaveLength(11);
    expect(Object.keys(salida.secciones.S2)).toHaveLength(3);
    expect(Object.keys(salida.secciones.S3)).toHaveLength(6);
    expect(Object.keys(salida.secciones.S4)).toHaveLength(5);
    expect(salida.secciones.S1.rh).toBe("O+");
  });

  it("anamnesisSinRegistroSchema exige estado SIN_REGISTRO y mensaje", () => {
    expect(
      anamnesisSinRegistroSchema.safeParse({
        estado: "SIN_REGISTRO",
        mensaje: "Aun no hay una anamnesis registrada para este cliente.",
      }).success
    ).toBe(true);
    expect(anamnesisSinRegistroSchema.safeParse({ estado: "COMPLETA", mensaje: "x" }).success).toBe(
      false
    );
  });
});
