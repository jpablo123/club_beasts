/**
 * INC-09 (RED) — Edición de anamnesis deportiva (PATCH).
 * Criterios: AN-12, AN-23, AN-24, AN-25, AN-26, AN-27 + semántica de merge
 * (R3/C3a) + orden de errores PATCH (R7) del contrato API RATIFICADO
 * (spec INC-09, 2026-11-04). Sin DELETE (DEC-057: registro único sin ciclo
 * de vida).
 *
 * Contrato fijado por este RED (para el GREEN T9):
 *  - `PATCH /clientes/:clienteId/anamnesis` (solo DUENO, DEC-058): 200 con la
 *    vista DUENO. **Semántica de merge (R3/C3a, ENMIENDA C4)**: clave AUSENTE
 *    = conserva; clave presente con `null` o `""` = VACÍA el campo; clave con
 *    valor = valida y reemplaza. Estado re-derivado en cada guardado
 *    (degradación COMPLETA->PENDIENTE posible, AN-25). Trazabilidad renovada
 *    (`fechaActualizacion` + `actualizadoPorId` del actor que edita).
 *  - Contradicciones SI/NO validadas sobre el ESTADO FUSIONADO (post-404
 *    anamnesis) -> 400 si contradicción; un body solo consistente que choca con
 *    lo almacenado también es 400.
 *  - Orden de errores PATCH (R7): 401/403 -> 400 params -> 400 body (campos
 *    presentes + AN-26; primer error) -> 404 cliente -> 404 anamnesis
 *    (`ANAMNESIS_NO_ENCONTRADA`) -> 400 consistencia -> 200.
 *
 * FASE RED (2026-11-04): los endpoints de anamnesis NO existen (GREEN T9) y
 * los fixtures de registro pasan por POST (comportamiento ausente documentado
 * en `inc09-anamnesis-helpers.crearAnamnesisViaApi`).
 *
 * Restricciones INC00-QA-01/02: sin skips ni `only`, sin aserciones vacías.
 */
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import {
  MENSAJE_AN26,
  MENSAJE_404_ANAMNESIS,
  MENSAJE_404_CLIENTE,
  crearAnamnesisViaApi,
  crearAppAnamnesis,
  crearClienteUnico,
  crearSegundoDueno,
  headers,
  limpiarFixtures,
  loginDueno,
  loginRecepcionista,
  parseBody,
  payloadCompleto,
  primerErrorCanonico,
} from "./inc09-anamnesis-helpers";
import { anamnesisDuenoSchema } from "../../features/acceptance-criteria/HU-10-schemas";
import { guardarParcialAnamnesisSchema } from "../../features/acceptance-criteria/HU-11-schemas";

const PREFIJO = "9952";

let app: any;
let tokenDueno = "";
let userIdDueno = "";
let tokenRecep = "";

async function nuevoCliente() {
  return crearClienteUnico(PREFIJO);
}

function patchAnamnesis(token: string, clienteId: string, payload: unknown) {
  return app.inject({
    method: "PATCH",
    url: `/clientes/${clienteId}/anamnesis`,
    headers: headers(token),
    payload: payload as Record<string, unknown>,
  });
}

async function getAnamnesis(token: string, clienteId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/anamnesis`,
    headers: headers(token),
  });
  return { res, body: parseBody(res) };
}

/** Mensaje esperado del PRIMER error del schema canónico (INC09-R08). */
function mensajeEsperado(payload: Record<string, unknown>): string {
  return primerErrorCanonico(guardarParcialAnamnesisSchema, payload);
}

beforeAll(async () => {
  const creado = await crearAppAnamnesis();
  app = creado.app;
  const dueno = await loginDueno(app);
  tokenDueno = dueno.token;
  userIdDueno = dueno.userId;
  tokenRecep = (await loginRecepcionista(app)).token;
});

afterAll(async () => {
  await app.close();
  await limpiarFixtures(PREFIJO);
});

describe("AN-12 actualizacion sin duplicado (DEC-057)", () => {
  it("PATCH de un campo -> 200 vista DUENO; GET refleja el cambio", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      comidasPorDia: 5,
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(anamnesisDuenoSchema.safeParse(body).success, "vista DUENO valida").toBe(true);
    expect(body.comidasPorDia).toBe(5);

    const { body: despues } = await getAnamnesis(tokenDueno, cliente.id);
    expect(despues.comidasPorDia).toBe(5);
    expect(despues.clienteId).toBe(cliente.id);
  });

  it("la trazabilidad se renueva con el actor que edita y fecha >= previa", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());
    const { body: antes } = await getAnamnesis(tokenDueno, cliente.id);

    const dueno2 = await crearSegundoDueno(app);
    const res = await patchAnamnesis(dueno2.token, cliente.id, {
      objetivosEntrenamiento: "Mejorar resistencia",
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.actualizadoPorId).toBe(dueno2.userId);
    expect(Date.parse(body.fechaActualizacion)).toBeGreaterThanOrEqual(
      Date.parse(antes.fechaActualizacion)
    );
  });
});

describe("R3/C3a semántica de merge", () => {
  it("clave ausente conserva el valor previo", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      comidasPorDia: 7,
    });
    expect(res.statusCode).toBe(200);
    const { body } = await getAnamnesis(tokenDueno, cliente.id);
    expect(body.comidasPorDia).toBe(7);
    // Conservados: los campos no enviados no cambian.
    expect(body.nombreCompleto).toBe("Ana Maria Perez");
    expect(body.rh).toBe("O+");
    expect(body.antecedentesMedicos).toEqual(["Alergias"]);
    expect(body.diasNoEntrenamiento).toEqual(["lunes", "viernes"]);
  });

  it("clave presente con null VACIA el campo", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      tiempoQuePractica: null,
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(200);
    const { body } = await getAnamnesis(tokenDueno, cliente.id);
    expect(body.tiempoQuePractica).toBeNull();
  });

  it('clave presente con "" VACIA el campo', async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      estadoCivil: "",
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(200);
    const { body } = await getAnamnesis(tokenDueno, cliente.id);
    expect(body.estadoCivil).toBeNull();
  });

  it("clave presente con valor invalida y reemplaza (400 sin tocar lo almacenado)", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());
    const payload = { edad: 200 };

    const res = await patchAnamnesis(tokenDueno, cliente.id, payload);
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(mensajeEsperado(payload));

    const { body } = await getAnamnesis(tokenDueno, cliente.id);
    expect(body.edad).toBe(25);
  });
});

describe("AN-25 degradación COMPLETA -> PENDIENTE (rec (a))", () => {
  it("PATCH con null en un obligatorio sobre COMPLETA -> 200 PENDIENTE", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      eps: null,
      nombreCompleto: "Ana Maria Perez",
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estado).toBe("PENDIENTE");
    expect(body.eps).toBeNull();
  });

  it('PATCH con "" en un obligatorio sobre COMPLETA -> 200 PENDIENTE', async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      contactoEmergencia: "",
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estado).toBe("PENDIENTE");
    expect(body.contactoEmergencia).toBeNull();
  });
});

describe("AN-23 retomar y completar (PENDIENTE -> COMPLETA) + AN-27 sin pérdida", () => {
  it("el segundo guardado completa y conserva los valores previos", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      objetivosEntrenamiento: "Ganar masa muscular",
      antecedentesFamiliares: "Diabetes en abuelos",
    });

    const res = await patchAnamnesis(tokenDueno, cliente.id, payloadCompleto());
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estado).toBe("COMPLETA");
    // AN-27: lo guardado antes sobrevive salvo lo enviado explícitamente.
    expect(body.antecedentesFamiliares).toBe("Diabetes en abuelos");
  });

  it("AN-27: GET de PENDIENTE devuelve exactamente lo guardado + metadatos", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, {
      nombreCompleto: "Ana Maria Perez",
      practicaDeporte: "SI",
      cualDeporte: "Futbol",
    });

    const { res, body } = await getAnamnesis(tokenDueno, cliente.id);
    expect(res.statusCode).toBe(200);
    expect(body.estado).toBe("PENDIENTE");
    expect(body.nombreCompleto).toBe("Ana Maria Perez");
    expect(body.practicaDeporte).toBe("SI");
    expect(body.cualDeporte).toBe("Futbol");
    expect(body.clienteId).toBe(cliente.id);
    expect(body.actualizadoPorId).toBe(userIdDueno);
    expect(Number.isNaN(Date.parse(body.fechaActualizacion))).toBe(false);
  });
});

describe("AN-26 guarda de body del PATCH", () => {
  it("body {} -> 400 con el mensaje literal AN-26", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {});
    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_AN26);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("body solo de limpiezas (null / \"\") -> 400 AN-26", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      tiempoQuePractica: null,
      estadoCivil: "",
    });
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(MENSAJE_AN26);
  });

  it("body con 1 campo diligenciado -> 200", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, { comidasPorDia: 2 });
    expect(res.statusCode).toBe(200);
    expect(parseBody(res).comidasPorDia).toBe(2);
  });
});

describe("contradicciones SI/NO sobre el ESTADO FUSIONADO (R3)", () => {
  it("PATCH practicaDeporte=NO con cualDeporte almacenado -> 400", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto()); // cualDeporte: "Futbol"

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      practicaDeporte: "NO",
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(400);
    const fusionado = { practicaDeporte: "NO", cualDeporte: "Futbol" };
    expect(parseBody(res).error).toBe(mensajeEsperado(fusionado));
  });

  it("PATCH enfermedadRelevante=NO con cualEnfermedad almacenada -> 400", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto()); // cualEnfermedad: "Hipertension"

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      enfermedadRelevante: "NO",
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(400);
    const fusionado = { enfermedadRelevante: "NO", cualEnfermedad: "Hipertension" };
    expect(parseBody(res).error).toBe(mensajeEsperado(fusionado));
  });

  it("edicion legitima de la condicional: cualEnfermedad con 18a=SI almacenado -> 200", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(
      app,
      tokenDueno,
      cliente.id,
      payloadCompleto({ cualEnfermedad: "Hipertension" })
    );

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      cualEnfermedad: "Hipertension severa",
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.cualEnfermedad).toBe("Hipertension severa");
    expect(body.enfermedadRelevante).toBe("SI");
  });

  it("vaciar la condicional aplicable no contradice: 11=SI y cualDeporte=null -> 200 PENDIENTE", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      cualDeporte: null,
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.cualDeporte).toBeNull();
    expect(body.estado).toBe("PENDIENTE"); // 11=SI sin 12 aplicable
  });
});

describe("R7 — orden de errores del PATCH (primer paso que aplica responde)", () => {
  it("sin token -> 401", async () => {
    const cliente = await nuevoCliente();
    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/anamnesis`,
      payload: { comidasPorDia: 3 },
    });
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("RECEPCIONISTA -> 403 (preHandler) antes que body y antes que 404", async () => {
    const res = await patchAnamnesis(tokenRecep, "id-fantasma-inc09-p", {});
    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
  });

  it("400 params ANTES de 400 body: id invalido + body {} -> 400 sin el mensaje AN-26", async () => {
    const res = await patchAnamnesis(tokenDueno, "z".repeat(40), {});
    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).not.toBe(MENSAJE_AN26);
  });

  it("400 body ANTES de 404 cliente: body {} + cliente inexistente -> 400 AN-26", async () => {
    const res = await patchAnamnesis(tokenDueno, "id-fantasma-inc09-q", {});
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(MENSAJE_AN26);
  });

  it("400 body ANTES de 404 cliente: campo invalido + cliente inexistente -> 400", async () => {
    const res = await patchAnamnesis(tokenDueno, "id-fantasma-inc09-r", { edad: 200 });
    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(mensajeEsperado({ edad: 200 }));
  });

  it("404 cliente ANTES de 404 anamnesis: cliente inexistente -> Cliente no encontrado", async () => {
    const res = await patchAnamnesis(tokenDueno, "id-fantasma-inc09-s", {
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_404_CLIENTE);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("404 anamnesis ANTES de 400 consistencia: cliente sin anamnesis + body contradictorio -> ANAMNESIS_NO_ENCONTRADA", async () => {
    const cliente = await nuevoCliente();
    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      practicaDeporte: "NO",
      cualDeporte: "Futbol",
    });
    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.error).toBe(MENSAJE_404_ANAMNESIS);
    expect(body.code).toBe("ANAMNESIS_NO_ENCONTRADA");
  });

  it("400 consistencia sobre el fusionado DESPUES de los 404", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, {
      practicaDeporte: "NO",
      comidasPorDia: 3,
    });
    expect(res.statusCode).toBe(400);
  });

  it("200 al final de la escalera con body valido y registro existente", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await patchAnamnesis(tokenDueno, cliente.id, { comidasPorDia: 4 });
    expect(res.statusCode).toBe(200);
  });
});

describe("DEC-057 sin DELETE", () => {
  it("DELETE /clientes/:id/anamnesis no existe (404)", async () => {
    const cliente = await nuevoCliente();
    await crearAnamnesisViaApi(app, tokenDueno, cliente.id, payloadCompleto());

    const res = await app.inject({
      method: "DELETE",
      url: `/clientes/${cliente.id}/anamnesis`,
      headers: headers(tokenDueno),
    });
    expect(res.statusCode).toBe(404);
  });
});
