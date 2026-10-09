# INC-02 - Congelacion de vigencias (HU-15)

## Estado

Estado actual: **ACEPTADO** (2026-10-08). Pipeline completo: LISTO -> RED (121 fallos / 127 tests nuevos, base 252/252 intacta) -> IMPLEMENTADO (migracion `20261008184627`, GREEN API 379/379 + web 147/147 + build PASS) -> VERIFICADO (E2E `congelacion.spec.ts` 5/5, bateria completa 30/30 x2) -> REVISADO (`code-reviewer` **sin hallazgos bloqueantes**) -> **ACEPTADO** con **+3.5 puntos certificados** (HU-15 4/4 = 2.0 + HU-12 b2 = 1.5; trazabilidad en seccion 8 de `docs/producto/auditoria-puntos-inc00.md`; `docs/producto/mvp.md` 26.5 -> 30). Evidencia completa en `evidencia.md`.

## Objetivo

Implementar el estado `CONGELADO` y la operacion de congelacion de vigencias sobre los servicios cubiertos por DEC-004, cerrando los 4 bullets de HU-15 y el bullet `muestra activa, vencida o congelada` de HU-12 (ambos cerrados en INC-02: HU-12 4/4, HU-15 4/4).

## Alcance incluido

- Modelado de congelacion: fecha inicio, fecha fin, motivo y actor; efecto sobre `fechaFin` de la vigencia.
- Reglas de negocio (a fijar en criterios, coherentes con DEC-005/DEC-006/DEC-007):
  - Congelar exige fecha de inicio, fecha de fin y motivo (HU-15 bullet 2).
  - Durante el rango congelado el estado calculado de la vigencia es `CONGELADO` (HU-15 bullet 3 y HU-12 bullet 2).
  - La fecha de vencimiento se extiende automaticamente por el tiempo congelado, en dias completos inclusivos y zona `America/Bogota` (HU-15 bullet 4).
- Permiso de congelar: `DUENO` y `RECEPCIONISTA` (actor de HU-15 + DEC-017).
- Auditoria de la operacion (actor, accion, fechas anteriores/nuevas), consistente con el patron ya aceptado en `INC00-MEM-04`.
- **Ampliacion DEC-024 (2026-10-08)**: operaciones de **descongelar** y **editar una congelacion**, con la regla de dias de DEC-024 (descontar solo los dias restantes de la pausa; editar recalcula por diferencia). Aporta 0 puntos (sin bullet HU-15); se especifica, prueba y revisa igual que el resto.
- **DEC-025**: durante la congelacion el cliente conserva el acceso; INC-02 no implementa ningun bloqueo por congelacion.
- API + UI: badge/estado `CONGELADO` en la seccion de membresias de la ficha y acciones de congelar, **descongelar** y **editar la congelacion** (DEC-024; ver contrato abajo).
- Pruebas (TDD/ATDD): unitarias de calculo de fechas/estado, integracion de API (validaciones, permisos, 409), E2E minimo del flujo de congelacion.
- Evidencia reproducible: `tsc`, `vitest` API, Gherkin si aplica, `vitest` web, `build`, `playwright`.

## Fuera de alcance

- Vigencias de personalizado y nutricion (HU-13/HU-14 -> INC-05). La congelacion se modela sobre el tipo de servicio, pero solo la vigencia GYM existe hoy; ver "Riesgo de alcance".
- HU-16 (propagacion de vencimiento a portal/recepcion/acceso) -> INC-03.
- Bloque 4 (recepcion, ingresos, portal) -> INC-03.
- Anamnesis, rutinas, planes, notificaciones.
- Constraint de solapamiento en Postgres (R-01/G13): no se incluye aqui; no depende de este incremento.

## Contrato API final (fijado 2026-10-08 por `backend-developer`)

### Endpoint

| Metodo | Path | Permiso | Exitos |
|---|---|---|---|
| `POST` | `/clientes/:clienteId/vigencias/:vigenciaId/congelar` | `fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])` (DEC-017) | `200` con la vigencia actualizada |

- **Sin prefijo `/api`**: el servidor registra las rutas sin prefijo global (`src/index.ts:23-25`; las rutas existentes son `/clientes/:clienteId/membresias-gym`, sin `/api`). El borrador de criterios escribia `/api/...`; ver "Ajustes pendientes de criterios" #1.
- **Path generico elegido sobre el subrecurso `/membresias-gym/:membresiaId/congelar`**, justificacion:
  1. **Reutilizacion HU-13 (INC-05) sin reescribir**: con el modelo unificado por `tipoServicio` (ver "Modelo de datos propuesto"), el mismo endpoint congela vigencias `GYM` y `PERSONALIZADO` hoy y servira tal cual cuando INC-05 cree vigencias de personalizado; el subrecurso `membresias-gym` obligaria a duplicar la ruta (y el handler) por tipo de servicio.
  2. El nombre del recurso (`vigencias`) es neutral respecto al servicio de DEC-004; `membresias-gym` haria mentir a la API cuando la fila congelada sea `PERSONALIZADO`.
  3. Alineado con el borrador de criterios y sus escenarios Gherkin (menos rework del analista).
  4. El `vigenciaId` es el mismo `id` de `MembresiaGym` (hoy no existe otro modelo de vigencia); el frontend puede usar el `membresiaId` de la ficha tal cual.
- **Ownership**: la vigencia debe existir y pertenecer al `clienteId` de la ruta; si no, `404 NOT_FOUND` (mismo patron que `editarMembresia`, sin filtrar la existencia del recurso ajeno).

### Body (schema Zod exacto)

```ts
// src/schemas/membresia.schema.ts (o modulo dedicado, misma convencion)
export const createCongelacionSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
    motivo: z
      .string({ required_error: "Motivo es requerido" })
      .min(1, "Motivo es requerido")
      .max(500, "Motivo no puede exceder 500 caracteres")
      .refine((valor) => valor.trim().length > 0, { message: "Motivo es requerido" }),
    version: z
      .number({ required_error: "Versión es requerida" })
      .int("Versión debe ser un entero")
      .positive("Versión debe ser positiva"),
  })
  .refine((data) => data.fechaInicio <= data.fechaFin, {
    message: "Fecha fin no puede ser anterior a fecha de inicio",
    path: ["fechaFin"],
  });
```

- `fechaRequerida` e `isValidDate` reutilizan los helpers de `src/schemas/membresia.schema.ts` (regex `YYYY-MM-DD` + calendario real).
- **`version` va en el body** (lock optimista), justificacion:
  1. Consistencia con el `PATCH` existente (`updateMembresiaSchema` ya exige `version`, patron INC00-MEM-03 aceptado).
  2. Protege a la UI: una ficha abierta con un snapshot obsoleto (p. ej. `fechaFin` ya extendida por otra congelacion) recibe `409 MEMBRESIA_CONFLICTO` en lugar de congelar/extensionar sobre datos viejos.
  3. Hace determinista el escenario de concurrencia (criterio escenario 20): dos peticiones que leyeron la misma `version` -> exactamente una 200 (la escritura condicional `updateMany where version = N` gana una sola vez); la otra, 409.
  4. El cliente **no** envia la nueva `fechaFin` de la vigencia: la calcula el servidor (HU-15 b4).
- **Regla post-Zod (no va en el schema porque `hoy` es dinamica)**: `fechaFin >= hoy` en `America/Bogota` (DEC-022 b); si `fechaFin < hoy`, la ruta/servicio responde `400 VALIDATION_ERROR` con mensaje `Fecha fin no puede ser anterior a hoy`. `fechaInicio` puede ser retroactivo mientras el rango siga abierto (DEC-022 b).

### Respuesta de exito (200)

Vigencia devuelta en el mismo estilo que el DTO de `toDTO` (GET/PATCH), extendido. Ejemplo exacto (feliz caso: vigencia `2026-01-01..2026-03-31`, congelacion `2026-02-01..2026-02-10`, N = 10):

```json
{
  "id": "clxyz...", "clienteId": "clabc...",
  "tipoServicio": "GYM",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-04-10",
  "fechaFinAnterior": "2026-03-31",
  "diasCongelados": 10,
  "estado": "CONGELADO",
  "version": 2,
  "createdAt": "...", "updatedAt": "...",
  "creadoPor": { "id": "...", "nombre": "..." },
  "actualizadoPor": { "id": "...", "nombre": "..." },
  "cambios": [
    { "id": "...", "accion": "CREACION", "version": 1, "fechaInicioAnterior": null, "fechaFinAnterior": null, "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-03-31", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." },
    { "id": "...", "accion": "CONGELACION", "version": 2, "motivo": "Viaje de trabajo", "congelacionInicio": "2026-02-01", "congelacionFin": "2026-02-10", "fechaInicioAnterior": "2026-01-01", "fechaFinAnterior": "2026-03-31", "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-04-10", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." }
  ],
  "congelacion": { "fechaInicio": "2026-02-01", "fechaFin": "2026-02-10", "motivo": "Viaje de trabajo", "diasCongelados": 10 }
}
```

- `fechaFin` = fecha extendida; `fechaFinAnterior` = valor antes de esta operacion; `diasCongelados = N = (cFin - cInicio) + 1` (dias completos inclusivos, `America/Bogota`, DEC-005/DEC-006); `fechaFinNueva = fechaFinAnterior + N` dias calendario.
- `estado` es el **calculado** con la nueva precedencia (ver "Modelo de datos propuesto"): `CONGELADO` si `hoy ∈ [cInicio, cFin]`; si el rango es futuro, la vigencia conserva `PROGRAMADA`/`ACTIVA` (`CONGELADO` no se persiste, se calcula). Los tests de happy path usan un rango que cubre hoy para esperar `estado: "CONGELADO"` en esta respuesta.
- `version` = version incrementada (N -> N+1).
- `cambios` incluye la fila `CONGELACION` recien escrita (auditoria visible en el historial, HU15-C06).
- `tipoServicio` y los campos `motivo`/`congelacionInicio`/`congelacionFin` de las filas `CONGELACION` en `cambios` se agregan tambien al DTO de `GET /clientes/:clienteId/membresias-gym` y del `PATCH` (extension retrocompatible; ver "Modelo de datos propuesto").

### Tabla completa de errores

| Status | `code` | Condicion | Mensaje `error` |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `fechaInicio` ausente o vacia | `Fecha de inicio es requerida` |
| 400 | `VALIDATION_ERROR` | `fechaFin` ausente o vacia | `Fecha fin es requerida` |
| 400 | `VALIDATION_ERROR` | `motivo` ausente, vacio o solo espacios | `Motivo es requerido` |
| 400 | `VALIDATION_ERROR` | `motivo` > 500 caracteres | `Motivo no puede exceder 500 caracteres` |
| 400 | `VALIDATION_ERROR` | fecha con formato/calendario invalido | `Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)` / `Fecha fin debe ser una fecha válida (YYYY-MM-DD)` |
| 400 | `VALIDATION_ERROR` | `fechaFin` < `fechaInicio` | `Fecha fin no puede ser anterior a fecha de inicio` |
| 400 | `VALIDATION_ERROR` | `version` ausente, no entera o no positiva | `Versión es requerida` / `Versión debe ser un entero` / `Versión debe ser positiva` |
| 400 | `VALIDATION_ERROR` | `fechaFin` de la congelacion < hoy (post-Zod) | `Fecha fin no puede ser anterior a hoy` |
| 401 | `AUTH_TOKEN_MISSING` | sin token (preHandler) | `Token de autenticación requerido.` |
| 401 | `AUTH_TOKEN_INVALID` | token invalido | `Token de autenticación inválido.` |
| 401 | `AUTH_TOKEN_EXPIRED` | token expirado | `Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.` |
| 403 | `AUTH_FORBIDDEN` | rol fuera de `DUENO`/`RECEPCIONISTA` (p. ej. `CLIENTE`); el texto "403 FORBIDDEN" del encargo corresponde al codigo real de la convencion `src/plugins/auth.ts:59-62` | `No tienes permisos para realizar esta acción.` |
| 404 | `NOT_FOUND` | vigencia inexistente o perteneciente a otro cliente | `Membresía no encontrada` |
| 409 | `MEMBRESIA_CONFLICTO` | `version` del body != `version` actual, o carrera perdida (`updateMany` count != 1 / P2002 en la fila de cambio) | `Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.` |
| 409 | `CONGELACION_NO_PERMITIDA` | `tipoServicio` de la vigencia = `NUTRICION` (DEC-023) | `La congelación no está permitida para este tipo de servicio` |
| 409 | `MEMBRESIA_VENCIDA` | vigencia `VENCIDA` (`hoy > fechaFin` de la vigencia; DEC-022) | `No se puede congelar una membresía vencida` |
| 409 | `CONGELACION_NO_PERMITIDA` | rango `[fechaInicio, fechaFin]` no contenido en `[fechaInicio, fechaFin]` de la vigencia (DEC-022 a) | `El rango de congelación debe estar dentro de la vigencia` |
| 409 | `MEMBRESIA_SOLAPADA` | solape del rango con otra congelacion existente de la misma vigencia (DEC-008) | `Las fechas se solapan con un período existente` |
| 409 | `MEMBRESIA_SOLAPADA` | la extension de `fechaFin` haria solapar la vigencia con un periodo **posterior** del mismo cliente (DEC-008); no se congela ni se extiende nada (atomico) | `Las fechas se solapan con un período existente` |

- Codigos nuevos que se agregan al mapa `RESPUESTAS_ERROR` de `src/routes/membresia.ts`: `MEMBRESIA_VENCIDA` y `CONGELACION_NO_PERMITIDA`; la ampliacion DEC-024 agrega ademas `CONGELACION_INEXISTENTE` (ver secciones "Descongelar" y "Editar congelacion"). `VALIDATION_ERROR`, `NOT_FOUND`, `MEMBRESIA_SOLAPADA` y `MEMBRESIA_CONFLICTO` ya existen y se reutilizan con su mensaje actual (ambos casos de solape comparten el mensaje existente; un `code` = un unico mensaje en el mapa).
- Se **elimina** el codigo `CONGELACION_SOLAPADA` del borrador de criterios: el solape entre congelaciones usa `MEMBRESIA_SOLAPADA` (ver "Ajustes pendientes de criterios" #3).

### Orden de evaluacion de errores (deterministico)

1. `401`/`403` (preHandler `authenticateRoles`).
2. `400` por schema Zod (params y body: formato, fin<inicio, motivo, version) y despues la regla post-Zod `fechaFin >= hoy`.
3. `404` (vigencia inexistente o de otro cliente).
4. `409` en este orden:
   1. `MEMBRESIA_CONFLICTO` (version desactualizada; patron INC00-MEM-03: se evalua junto a la carga, antes que las reglas de negocio).
   2. `CONGELACION_NO_PERMITIDA` (tipo `NUTRICION`).
   3. `MEMBRESIA_VENCIDA` (estado de la vigencia).
   4. `CONGELACION_NO_PERMITIDA` (rango no contenido).
   5. `MEMBRESIA_SOLAPADA` (solape con otra congelacion) y despues `MEMBRESIA_SOLAPADA` (choque de la extension con periodo posterior).

### Descongelar (ampliacion DEC-024)

Contrato fijado 2026-10-08 por `backend-developer`. **Sustituye al parrafo anterior "No existe `POST .../descongelar` ..."**: DEC-024 aprobo incluir `descongelar` y `editar congelacion` en INC-02 (cierre del abierto #7 de los criterios; 0 puntos por DEC-016, alcance de producto). DEC-025: el cliente **conserva el acceso** durante la pausa, por lo que estas operaciones solo afectan `fechaFin`, el estado calculado y la auditoria; **no tocan acceso, portal ni bloqueos** (el bloqueo por vencimiento es HU-16/INC-03 y por `INACTIVO` es HU-08/INC-04).

#### Endpoint y permisos

| Metodo | Path | Permiso | Exito |
|---|---|---|---|
| `POST` | `/clientes/:clienteId/vigencias/:vigenciaId/descongelar` | `fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])` (DEC-017, mismo preHandler que congelar) | `200` con la vigencia actualizada |

- **Mismo path base que congelar** (sin prefijo `/api`, ver "Endpoint"): reutiliza la justificacion HU-13/INC-05 y el mismo ownership (la vigencia debe existir y pertenecer al `clienteId` de la ruta; si no, `404 NOT_FOUND`, mismo patron que `editarMembresia`).
- **Accion `POST`, no `DELETE`**: la fila `CONGELACION` no se borra (el historial es inmutable, `HU15-C06`); la operacion agrega una fila `DESCONGELACION` y muta `fechaFin` dentro de la misma transaccion, igual que congelar. Ademas, `DELETE` en REST implicaria eliminar el sub-recurso de pausa, que sigue existiendo en el historial.
- **Un solo endpoint por accion**, coherente con `POST .../congelar`: el path nombra la accion sobre el estado de pausa, no una coleccion.

#### Body (schema Zod exacto)

```ts
// src/schemas/membresia.schema.ts (o modulo dedicado, misma convencion)
export const descongelarSchema = z.object({
  motivo: z
    .string({ required_error: "Motivo es requerido" })
    .min(1, "Motivo es requerido")
    .max(500, "Motivo no puede exceder 500 caracteres")
    .refine((valor) => valor.trim().length > 0, { message: "Motivo es requerido" })
    .optional(),
  version: z
    .number({ required_error: "Versión es requerida" })
    .int("Versión debe ser un entero")
    .positive("Versión debe ser positiva"),
});
```

- **`motivo` va OPCIONAL: decision de este contrato**, justificada frente a `src/routes/membresia.ts`:
  1. En `src/routes/membresia.ts` no hay ninguna referencia a `motivo`: la unica exigencia vive en `createCongelacionSchema` (invocado por la ruta de congelar) y viene del bullet b2 de HU-15 ("La congelacion **requiere** fecha de inicio, fecha de fin y motivo"), que habla de **congelar**. **DEC-024 no exige motivo para descongelar**, de modo que hacerlo requerido inventaria una clase 400 sin decision de Producto que la respalde.
  2. El mapa `RESPUESTAS_ERROR` (`src/routes/membresia.ts:19-43`) no tiene ninguna entrada por `motivo`: todos sus fallos son `400 VALIDATION_ERROR` devuelto por Zod en la ruta. Un campo opcional no agrega ninguna rama de error nueva al mapa.
  3. El modelo ya lo admite: `MembresiaGymCambio.motivo` es `String?` y las filas `CREACION`/`EDICION` lo dejan `null`; una fila `DESCONGELACION` con `motivo: null` no necesita columna nueva.
  4. Si el campo **viaja**, aplica la misma regla que en congelar (1-500 y no vacio tras trim, mismos mensajes), siguiendo el patron de `updateMembresiaSchema` (`src/schemas/membresia.schema.ts:48-60`): *opcional, pero si viene no puede ser invalido* (`""` o solo espacios cuando viaja -> `400 VALIDATION_ERROR` "Motivo es requerido", la misma rama Zod).
- **`version` va en el body** por las mismas razones que en congelar (lock optimista INC00-MEM-03): protege a una ficha con snapshot obsoleto (p. ej. otra operacion ya cambio `fechaFin` o la `version`) y hace determinista la carrera (la escritura condicional `updateMany where version = N` gana una sola vez; la pierde, 409 `MEMBRESIA_CONFLICTO`).
- **Sin fechas en el body**: `hoy` y los dias a devolver los calcula el servidor (DEC-024), igual que congelar calcula la nueva `fechaFin`.

#### Respuesta de exito (200)

Mismo DTO de `toDTO` (GET/PATCH) extendido que congelar. Ejemplo exacto: vigencia `2026-01-01..2026-03-31`, congelacion `2026-02-01..2026-02-10` ya aplicada (`fechaFin: 2026-04-10`, `version: 2`), `hoy = 2026-02-05` (pausa en curso); se descongela sin `motivo`:

```json
{
  "id": "clxyz...", "clienteId": "clabc...",
  "tipoServicio": "GYM",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-04-04",
  "fechaFinAnterior": "2026-04-10",
  "diasDevueltos": 6,
  "estado": "ACTIVA",
  "version": 3,
  "createdAt": "...", "updatedAt": "...",
  "creadoPor": { "id": "...", "nombre": "..." },
  "actualizadoPor": { "id": "...", "nombre": "..." },
  "cambios": [
    { "id": "...", "accion": "CREACION", "version": 1, "fechaInicioAnterior": null, "fechaFinAnterior": null, "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-03-31", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." },
    { "id": "...", "accion": "CONGELACION", "version": 2, "motivo": "Viaje de trabajo", "congelacionInicio": "2026-02-01", "congelacionFin": "2026-02-10", "fechaInicioAnterior": "2026-01-01", "fechaFinAnterior": "2026-03-31", "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-04-10", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." },
    { "id": "...", "accion": "DESCONGELACION", "version": 3, "motivo": null, "congelacionInicio": "2026-02-01", "congelacionFin": "2026-02-10", "fechaInicioAnterior": "2026-01-01", "fechaFinAnterior": "2026-04-10", "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-04-04", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." }
  ],
  "congelacion": null
}
```

- `diasDevueltos = max(0, cFin - max(hoy, cInicio) + 1)` = `(2026-02-10 - 2026-02-05) + 1 = 6`; `fechaFin = fechaFinAnterior - diasDevueltos` (formula completa en "Regla de dias de la ampliacion (DEC-024)").
- Los dias ya consumidos (`N - diasDevueltos = 10 - 6 = 4`) **permanecen descontados** en `fechaFin` (DEC-024). No llevan campo propio: `N` vive en la fila `CONGELACION` previa y `diasConsumidos = N - diasDevueltos` es derivable (tambien `diasDevueltos = fechaFinAnterior - fechaFinNueva` de la fila `DESCONGELACION`, sin columna nueva).
- `estado` se recalcula sobre la nueva `fechaFin` con la precedencia normal, **sin** pausa vigente (`CONGELADO` deja de aplicar): en el ejemplo, `ACTIVA`.
- `congelacion: null`: no queda pausa vigente tras la operacion.
- `version` = N -> N+1; `cambios` incluye la fila `DESCONGELACION` recien escrita (auditoria visible en el historial). Si la peticion envio `motivo`, se guarda en esa fila.

#### Tabla de errores

| Status | `code` | Condicion | Mensaje `error` |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `version` ausente, no entera o no positiva | `Versión es requerida` / `Versión debe ser un entero` / `Versión debe ser positiva` |
| 400 | `VALIDATION_ERROR` | `motivo` presente y ausente/vacio/solo espacios | `Motivo es requerido` |
| 400 | `VALIDATION_ERROR` | `motivo` presente y > 500 caracteres | `Motivo no puede exceder 500 caracteres` |
| 401 | `AUTH_TOKEN_MISSING` | sin token (preHandler) | `Token de autenticación requerido.` |
| 401 | `AUTH_TOKEN_INVALID` | token invalido | `Token de autenticación inválido.` |
| 401 | `AUTH_TOKEN_EXPIRED` | token expirado | `Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.` |
| 403 | `AUTH_FORBIDDEN` | rol fuera de `DUENO`/`RECEPCIONISTA` (p. ej. `CLIENTE`) | `No tienes permisos para realizar esta acción.` |
| 404 | `NOT_FOUND` | vigencia inexistente o perteneciente a otro cliente | `Membresía no encontrada` |
| 409 | `MEMBRESIA_CONFLICTO` | `version` del body != `version` actual, o carrera perdida (`updateMany` count != 1 / P2002) | `Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.` |
| 409 | `CONGELACION_NO_PERMITIDA` | `tipoServicio` de la vigencia = `NUTRICION` (DEC-023) | `La congelación no está permitida para este tipo de servicio` |
| 409 | `MEMBRESIA_VENCIDA` | vigencia `VENCIDA` (`hoy > fechaFin` de la fila; DEC-022) | `No se puede congelar una membresía vencida` (mensaje existente: un `code` = un unico mensaje en `RESPUESTAS_ERROR`; si Producto quiere un texto generico, se cambia el mensaje unico y afecta a congelar tambien) |
| 409 | `CONGELACION_INEXISTENTE` | **no hay congelacion vigente** (nunca se congeló, ya fue descongelada, o `hoy > congelacionFin`) | `No hay una congelación vigente en esta membresía` |
| 409 | `MEMBRESIA_SOLAPADA` | **No aplica en descongelar** (ver nota) | - |

- **`CONGELACION_INEXISTENTE` (409) es el codigo nuevo de la ampliacion.** Justificacion:
  1. **Nombre**: sigue el prefijo `CONGELACION_*` ya usado por `CONGELACION_NO_PERMITIDA` (namespace de errores propios de la sub-coleccion de pausa, faciles de localizar en `RESPUESTAS_ERROR`) y describe literalmente la condicion: no existe una congelacion vigente que operar.
  2. **409 y no 404**: la *vigencia* si existe y supero el chequeo de ownership; lo que falta es un **estado** del recurso, y la convencion del mapa `RESPUESTAS_ERROR` clasifica como 409 todos los rechazos por estado (`MEMBRESIA_CONFLICTO`, `MEMBRESIA_SOLAPADA`, `MEMBRESIA_VENCIDA`). El `404 NOT_FOUND` de `membresia.ts:23-27` esta reservado al mensaje `Membresía no encontrada`, que no aplica aqui; reutilizarlo obligaria a dos mensajes distintos para un mismo `code` o a un mensaje engañoso.
  3. **Alternativas descartadas**: `NOT_FOUND` con otro mensaje (mezcla "id inexistente/ajeno" con "sin pausa activa" en la misma rama) y `CONGELACION_NO_PERMITIDA` (ya significa "una regla de negocio lo prohiebe": tipo o rango; no "no hay pausa").
- **`MEMBRESIA_SOLAPADA` no se evalua en descongelar**: la operacion solo **decrementa** `fechaFin`, y decrementar nunca crea un solape (DEC-008 ademas permite gaps). La fila queda documentada para que el analista no invente el caso.

#### Orden de evaluacion de errores (deterministico)

1. `401`/`403` (preHandler `authenticateRoles`).
2. `400` por schema Zod (params y body: `version`, `motivo` si viaja). **No hay regla post-Zod de fechas** porque el body no trae fechas.
3. `404` (vigencia inexistente o de otro cliente).
4. `409` en este orden:
   1. `MEMBRESIA_CONFLICTO` (version desactualizada; patron INC00-MEM-03, junto a la carga y antes que las reglas de negocio).
   2. `CONGELACION_NO_PERMITIDA` (tipo `NUTRICION`).
   3. `MEMBRESIA_VENCIDA` (estado de la vigencia).
   4. `CONGELACION_INEXISTENTE` (no hay congelacion vigente).
- Los tres primeros 409 son los **mismos guards de congelar en el mismo orden** (paridad: toda operacion de pausa exige `version` vigente, tipo congelable y vigencia no vencida); el guard nuevo (`CONGELACION_INEXISTENTE`) va despues porque presupone que la vigencia ya supero los guards compartidos.

### Editar congelacion (ampliacion DEC-024)

#### Endpoint y permisos

| Metodo | Path | Permiso | Exito |
|---|---|---|---|
| `PATCH` | `/clientes/:clienteId/vigencias/:vigenciaId/congelacion` | `fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])` (DEC-017) | `200` con la vigencia actualizada |

Justificacion del metodo y del path:

1. **`PATCH` = modificacion de un recurso existente**: es el verbo del unico endpoint de edicion ya aceptado en `src/routes/membresia.ts:138-184` (`PATCH /clientes/:clienteId/membresias-gym/:membresiaId` con `updateMembresiaSchema` + `version`), asi que la ampliacion reutiliza verbo, convencion de body con lock optimista (INC00-MEM-03) y el mismo manejo de errores (`RESPUESTAS_ERROR`).
2. **`POST .../congelar` codifica la accion que crea la pausa; `PATCH .../congelacion` codifica la edicion del sub-recurso** (singular `congelacion` = la pausa vigente). Un `POST .../editar` no expresa "modificar lo existente" (y violaria la semantica de POST sobre un subrecurso de accion); un `PUT` implicaria reemplazo total del recurso, cuando el body es la modificacion del rango mas sus efectos sobre la vigencia (auditoria + `version`).
3. **Mismo prefijo `/clientes/:clienteId/vigencias/:vigenciaId`**: mismas razones que congelar (reutilizacion HU-13/INC-05 por `tipoServicio`, `vigenciaId` = `id` de `MembresiaGym`, ownership 404 identico).
4. **El recurso es unico por vigencia**: solo puede haber una pausa vigente (garantiza el solape DEC-008 al crearla), por lo que el path no necesita un `congelacionId` adicional.

#### Body (schema Zod exacto)

```ts
// misma forma, campos, mensajes y regla post-Zod que congelar:
// una sola fuente de validacion de "rango de pausa"
export const updateCongelacionSchema = createCongelacionSchema;
// body: { fechaInicio, fechaFin, motivo, version }  (los 4 requeridos)
```

- **Los cuatro campos requeridos, incluido `motivo`**: editar **redeclara** el rango de la pausa y escribe una fila nueva de auditoria (`EDICION_CONGELACION`); HU-15 b2 exige motivo para declarar un rango de pausa y DEC-024 describe la edicion como "revertir el N anterior, aplicar el nuevo", es decir, una nueva declaracion del mismo rango. Queda explicita la asimetria justificada: **congelar y editar declaran un rango -> `motivo` obligatorio (mismo schema y mismos mensajes)**; **descongelar termina la pausa -> `motivo` opcional (DEC-024 no lo exige)**.
- **Regla post-Zod adicional identica a congelar**: `fechaFin >= hoy` en `America/Bogota` (DEC-022 b) -> `400 VALIDATION_ERROR` `Fecha fin no puede ser anterior a hoy`. Editar a un rango ya consumido no tiene sentido operativo y no esta contemplado por la formula de DEC-024.
- **`version` va en el body**, por las mismas 4 razones que en congelar (lock optimista INC00-MEM-03).
- **El cliente no envia `fechaFin` de la vigencia ni el N**: el servidor revierte `N_anterior` y aplica `N_nuevo` (ver formula).

#### Respuesta de exito (200)

Ejemplo exacto: misma vigencia y congelacion del ejemplo anterior (`fechaFin: 2026-04-10`, `version: 2`, N = 10), `hoy = 2026-02-05`; se edita el rango a `2026-02-01..2026-02-20` (N_nuevo = 20) con motivo `Cambio de viaje`:

```json
{
  "id": "clxyz...", "clienteId": "clabc...",
  "tipoServicio": "GYM",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-04-20",
  "fechaFinAnterior": "2026-04-10",
  "diasCongelados": 20,
  "diasCongeladosAnterior": 10,
  "estado": "CONGELADO",
  "version": 3,
  "createdAt": "...", "updatedAt": "...",
  "creadoPor": { "id": "...", "nombre": "..." },
  "actualizadoPor": { "id": "...", "nombre": "..." },
  "cambios": [
    { "id": "...", "accion": "CREACION", "version": 1, "fechaInicioAnterior": null, "fechaFinAnterior": null, "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-03-31", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." },
    { "id": "...", "accion": "CONGELACION", "version": 2, "motivo": "Viaje de trabajo", "congelacionInicio": "2026-02-01", "congelacionFin": "2026-02-10", "fechaInicioAnterior": "2026-01-01", "fechaFinAnterior": "2026-03-31", "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-04-10", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." },
    { "id": "...", "accion": "EDICION_CONGELACION", "version": 3, "motivo": "Cambio de viaje", "congelacionInicio": "2026-02-01", "congelacionFin": "2026-02-20", "fechaInicioAnterior": "2026-01-01", "fechaFinAnterior": "2026-04-10", "fechaInicioNueva": "2026-01-01", "fechaFinNueva": "2026-04-20", "actor": { "id": "...", "nombre": "..." }, "createdAt": "..." }
  ],
  "congelacion": { "fechaInicio": "2026-02-01", "fechaFin": "2026-02-20", "motivo": "Cambio de viaje", "diasCongelados": 20 }
}
```

- Aritmetica verificable: `fechaFin = fechaFinAnterior - N_anterior + N_nuevo` = `2026-04-10 - 10 + 20 = 2026-04-20`; `diasCongelados = N_nuevo` (nuevo N) y `diasCongeladosAnterior = N_anterior` (N revertido, para que la UI y los criterios verifiquen la diferencia sin reconstruir la fila previa; el rango anterior completo vive en la fila `CONGELACION`).
- `estado` se calcula con el **rango nuevo** (ejemplo: `hoy = 2026-02-05 ∈ [2026-02-01, 2026-02-20]` -> `CONGELADO`).
- `congelacion` refleja el rango vigente **editado**.
- `version` = N -> N+1; `cambios` incluye la fila `EDICION_CONGELACION` recien escrita.
- **Rango identico al actual**: `N_nuevo = N_anterior` -> `fechaFin` sin cambio; igualmente `200` (escribe auditoria y `version` + 1; no hay codigo de "sin cambios" en `RESPUESTAS_ERROR`).

#### Tabla de errores

| Status | `code` | Condicion | Mensaje `error` |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `fechaInicio` ausente o vacia | `Fecha de inicio es requerida` |
| 400 | `VALIDATION_ERROR` | `fechaFin` ausente o vacia | `Fecha fin es requerida` |
| 400 | `VALIDATION_ERROR` | `motivo` ausente, vacio o solo espacios | `Motivo es requerido` |
| 400 | `VALIDATION_ERROR` | `motivo` > 500 caracteres | `Motivo no puede exceder 500 caracteres` |
| 400 | `VALIDATION_ERROR` | fecha con formato/calendario invalido | `Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)` / `Fecha fin debe ser una fecha válida (YYYY-MM-DD)` |
| 400 | `VALIDATION_ERROR` | `fechaFin` < `fechaInicio` | `Fecha fin no puede ser anterior a fecha de inicio` |
| 400 | `VALIDATION_ERROR` | `version` ausente, no entera o no positiva | `Versión es requerida` / `Versión debe ser un entero` / `Versión debe ser positiva` |
| 400 | `VALIDATION_ERROR` | `fechaFin` del rango nuevo < hoy (post-Zod) | `Fecha fin no puede ser anterior a hoy` |
| 401 | `AUTH_TOKEN_MISSING` | sin token (preHandler) | `Token de autenticación requerido.` |
| 401 | `AUTH_TOKEN_INVALID` | token invalido | `Token de autenticación inválido.` |
| 401 | `AUTH_TOKEN_EXPIRED` | token expirado | `Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.` |
| 403 | `AUTH_FORBIDDEN` | rol fuera de `DUENO`/`RECEPCIONISTA` | `No tienes permisos para realizar esta acción.` |
| 404 | `NOT_FOUND` | vigencia inexistente o perteneciente a otro cliente | `Membresía no encontrada` |
| 409 | `MEMBRESIA_CONFLICTO` | `version` del body != `version` actual, o carrera perdida | `Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.` |
| 409 | `CONGELACION_NO_PERMITIDA` | `tipoServicio` de la vigencia = `NUTRICION` (DEC-023) | `La congelación no está permitida para este tipo de servicio` |
| 409 | `MEMBRESIA_VENCIDA` | vigencia `VENCIDA` (`hoy > fechaFin` de la fila; DEC-022) | `No se puede congelar una membresía vencida` (mensaje existente, ver nota en Descongelar) |
| 409 | `CONGELACION_INEXISTENTE` | **no hay congelacion vigente** (nunca se congeló, ya fue descongelada, o `hoy > congelacionFin`) | `No hay una congelación vigente en esta membresía` |
| 409 | `CONGELACION_NO_PERMITIDA` | rango nuevo no contenido en `[fechaInicio, fechaFin - N_anterior]` (la fila revertida; DEC-022 a) | `El rango de congelación debe estar dentro de la vigencia` |
| 409 | `MEMBRESIA_SOLAPADA` | el rango nuevo solapa con **otra** congelacion de la vigencia (distinta de la editada; DEC-008) | `Las fechas se solapan con un período existente` |
| 409 | `MEMBRESIA_SOLAPADA` | la nueva `fechaFin` (`fechaFin - N_anterior + N_nuevo`) choca con un periodo **posterior** del mismo cliente (DEC-008); no se edita nada (atomico) | `Las fechas se solapan con un período existente` |

- `CONGELACION_INEXISTENTE`, `MEMBRESIA_VENCIDA` y `CONGELACION_NO_PERMITIDA` son los mismos codigos/mensajes del contrato de congelar (un `code` = un unico mensaje en `RESPUESTAS_ERROR`).

#### Orden de evaluacion de errores (deterministico)

1. `401`/`403` (preHandler `authenticateRoles`).
2. `400` por schema Zod (params y body: formato, fin<inicio, motivo, version) y despues la regla post-Zod `fechaFin >= hoy`.
3. `404` (vigencia inexistente o de otro cliente).
4. `409` en este orden:
   1. `MEMBRESIA_CONFLICTO` (version desactualizada; patron INC00-MEM-03).
   2. `CONGELACION_NO_PERMITIDA` (tipo `NUTRICION`).
   3. `MEMBRESIA_VENCIDA` (estado de la vigencia).
   4. `CONGELACION_INEXISTENTE` (no hay congelacion vigente que editar).
   5. `CONGELACION_NO_PERMITIDA` (rango nuevo no contenido en la fila **revertida**).
   6. `MEMBRESIA_SOLAPADA` (solape con otra congelacion) y despues `MEMBRESIA_SOLAPADA` (choque de la nueva `fechaFin` con periodo posterior).
- **Clave de la edicion: primero se revierte `N_anterior` en memoria y con la fila revertida se ejecutan las MISMAS reglas de congelar sobre el rango nuevo**, luego se aplica `N_nuevo` (ver formula). Asi la contencion se evalua contra `[fechaInicio, fechaFin - N_anterior]`, el solape ignora la propia pausa y el choque con periodo posterior usa `fechaFin - N_anterior + N_nuevo`.

## Regla de dias de la ampliacion (DEC-024) - formula verificable

Fuentes: `hoy = getTodayBogota()` (`America/Bogota`, DEC-005); dias completos inclusivos (DEC-006). Toda la aritmetica es sobre **fechas de calendario**, nunca sobre strings.

```text
diasInclusivos(inicio, fin) = diasCalendario(fin - inicio) + 1            // N del rango

// "congelacion vigente" = la ULTIMA fila de la secuencia de pausa de la vigencia
// (orden por `version`, unica por membresia gracias a @@unique([membresiaId, version]))
// es CONGELACION o EDICION_CONGELACION, y su congelacionFin cumple: hoy <= congelacionFin.
// Si la ultima fila es DESCONGELACION, o hoy > congelacionFin, NO hay congelacion vigente.

descongelar(vigencia, hoy):
  N         := diasInclusivos(pausa.congelacionInicio, pausa.congelacionFin)
  restantes := max(0, diasInclusivos(max(hoy, pausa.congelacionInicio), pausa.congelacionFin))
             // == max(0, finRango - max(hoy, inicioRango) + 1)
  if restantes == 0:
      -> 409 CONGELACION_INEXISTENTE          // pausa terminada: no hay dias que devolver
  fechaFin' := vigencia.fechaFin - restantes
             // invariante: restantes <= N y vigencia.fechaFin >= (base + N), luego fechaFin' >= fechaInicio
  escribir fila DESCONGELACION (version+1, rango de la pausa, motivo?) +
  vigencia.updateMany(where version = N, fechaFin = fechaFin', version = N+1)
      -> 200 { fechaFin', fechaFinAnterior, diasDevueltos = restantes, estado, version = N+1, cambios, congelacion: null }

editar(vigencia, rangoNuevo, motivo, hoy):
  N_anterior := diasInclusivos(pausa.congelacionInicio, pausa.congelacionFin)
  N_nuevo    := diasInclusivos(rangoNuevo.inicio, rangoNuevo.fin)
  fechaFinRev := vigencia.fechaFin - N_anterior         // revertir ANTES de validar (en memoria)
  // con la fila revertida se ejecutan las MISMAS reglas de congelar sobre rangoNuevo:
  //   rangoNuevo ⊆ [vigencia.fechaInicio, fechaFinRev]        -> 409 CONGELACION_NO_PERMITIDA
  //   sin solape con otras pausas (distinta de la editada)     -> 409 MEMBRESIA_SOLAPADA
  //   (fechaFinRev + N_nuevo) sin choque con periodo posterior -> 409 MEMBRESIA_SOLAPADA
  fechaFin' := fechaFinRev + N_nuevo                    // == vigencia.fechaFin - N_anterior + N_nuevo
  escribir fila EDICION_CONGELACION (version+1, rangoNuevo, motivo) + updateMany
      -> 200 { fechaFin', fechaFinAnterior, diasCongelados = N_nuevo,
               diasCongeladosAnterior = N_anterior, estado, version = N+1, cambios, congelacion }
```

**La formula de DEC-024 y su caso de pausa futura.** DEC-024 fija `decremento = max(0, finRango - hoy + 1)` ("los dias de la pausa que faltaban por transcurrir"). Esa expresion es literal cuando la pausa esta **en curso** (`hoy ∈ [inicio, fin]`). Aplicada tal cual a una pausa **futura** (`hoy < inicio`) contaria los dias entre hoy y el inicio, que nunca se pausaron, y restaria **mas de N** (dejaria `fechaFin` por debajo de su valor sin congelacion). La formula **total**, equivalente a DEC-024 en pausa en curso y verificable en los tres estados, es:

`decremento = max(0, finRango - max(hoy, inicioRango) + 1)`

- `hoy < inicio` (futura) -> `finRango - inicio + 1 = N` (devuelve la extension completa).
- `inicio <= hoy <= finRango` (en curso) -> `finRango - hoy + 1` (formula literal de DEC-024).
- `hoy > finRango` (terminada) -> `0` (no hay dias que devolver).

Esta generalizacion es la unica lectura que permite **cancelar una pausa futura** sin corromper `fechaFin`; no cambia la regla de DEC-024, la vuelve total sobre los tres estados (ver "Riesgos" del informe de cierre: conviene ratificarla con Producto).

### Casos limite (fijos para el RED)

| # | Caso | Condicion | Efecto en `fechaFin` / dias | Respuesta |
|---|---|---|---|---|
| 1 | Pausa futura (`hoy < inicio`) | todos los dias estan por transcurrir | `diasDevueltos = N` -> `fechaFin - N` (revierte la extension completa) | `200` |
| 2 | Pausa en curso (`inicio <= hoy <= fin`) | formula literal DEC-024 | `diasDevueltos = fin - hoy + 1` -> `fechaFin - restantes`; los `N - restantes` dias consumidos **permanecen descontados** | `200` |
| 3 | Pausa ya terminada (`hoy > fin`) | `restantes = max(0, ...) = 0` | ninguno | **`409 CONGELACION_INEXISTENTE`** (no hay pausa vigente; un `200` sin cambios solo confundiria a la UI) |
| 4 | Descongelar dos veces | tras la 1a, la ultima fila de la secuencia es `DESCONGELACION` | ninguno | `409 MEMBRESIA_CONFLICTO` si no se recarga la `version`; **`409 CONGELACION_INEXISTENTE`** con la `version` correcta |
| 5 | Editar antes de consumir dias (pausa futura) | la extension se aplico por adelantado al congelar | `fechaFin - N_anterior + N_nuevo` (se revierten los `N_anterior` completos) | `200` |
| 6 | Editar despues de consumir dias (pausa en curso) | misma formula: al congelar se extendieron los `N_anterior` **completos**, por lo que se revierten completos aunque `hoy` este dentro del rango | `fechaFin - N_anterior + N_nuevo`. Ejemplo esperado (no es bug): vigencia `2026-01-01..2026-03-31`, pausa `2026-02-01..2026-02-10` (N = 10 -> `2026-04-10`), `hoy = 2026-02-08`, editar a `2026-02-08..2026-02-09` (N' = 2) -> `2026-04-10 - 10 + 2 = 2026-04-02` | `200` (o `400` si el nuevo `fechaFin < hoy`) |
| 7 | Editar al mismo rango | `N' = N` | `fechaFin` sin cambio; escribe auditoria y `version` + 1 | `200` |

> Los dias consumidos solo se descuentan en **descongelar** (DEC-024); **editar** siempre recalcula por diferencia completa (DEC-024). `test-engineer` debe fijar estos valores numericos en el RED para que un "arreglo" posterior no altere la formula.

## Modelo de datos propuesto (fijado 2026-10-08)

**Recomendacion unica: extender `MembresiaGymCambio` (acciones `CONGELACION`, `DESCONGELACION` y `EDICION_CONGELACION` + campos de rango/motivo) y agregar `tipoServicio` a `MembresiaGym`.** No se crea tabla `Congelacion`.

```prisma
model MembresiaGym {
  // ... campos actuales sin cambios ...
  tipoServicio String @default("GYM") // GYM | PERSONALIZADO | NUTRICION (DEC-004)
}

model MembresiaGymCambio {
  // ... campos actuales sin cambios ...
  accion              String  // CREACION | EDICION | CONGELACION | DESCONGELACION | EDICION_CONGELACION
  motivo              String? // CONGELACION y EDICION_CONGELACION: 1-500, requerido (HU-15 b2);
                              // DESCONGELACION: opcional, puede quedar null (DEC-024);
                              // CREACION | EDICION: null
  congelacionInicio   String? // YYYY-MM-DD, rango de la pausa: CONGELACION (creado),
                              // EDICION_CONGELACION (rango nuevo), DESCONGELACION (rango revertido)
  congelacionFin      String? // YYYY-MM-DD, idem congelacionInicio
}
```

**Acciones de la ampliacion DEC-024 (sin columnas nuevas)**: `DESCONGELACION` y `EDICION_CONGELACION` reutilizan `motivo`, `congelacionInicio`, `congelacionFin`, `fechaFinAnterior`/`fechaFinNueva`, `actor` y `version`; todo lo numerico de la formula es derivable de las filas del historial: `N` = dias inclusivos del rango (`congelacionInicio..congelacionFin`) de la fila de pausa; `diasDevueltos = fechaFinAnterior - fechaFinNueva` (fila `DESCONGELACION`); `diasConsumidos = N - diasDevueltos`; en `EDICION_CONGELACION`, `N_anterior` = dias inclusivos del rango de la fila de pausa **previa** y `N_nuevo` = dias inclusivos del rango de la propia fila (`fechaFinNueva - fechaFinAnterior = N_nuevo - N_anterior`). **La migracion estimada no cambia.**

**Determinacion de "congelacion vigente"** (necesaria para `409 CONGELACION_INEXISTENTE`): ultima fila de la secuencia de pausa de la vigencia, ordenada por `version` (unica por membresia por `@@unique([membresiaId, version])`, asi el orden es determinista sin depender de `createdAt`):

- `CONGELACION` o `EDICION_CONGELACION` **y** `hoy <= congelacionFin` -> **vigente** (descongelable y editable).
- `DESCONGELACION`, o `hoy > congelacionFin` -> **no vigente** -> `409 CONGELACION_INEXISTENTE` para descongelar y para editar.

Justificacion (por que extender y no tabla nueva):

1. **Historial unico**: `HU15-C06` exige la accion `CONGELACION` visible en el historial de cambios de la vigencia (el `cambios` del DTO de GET/PATCH). Con tabla nueva habria que fusionar dos fuentes en el DTO y en cada lectura.
2. **Lock optimista reutilizado**: la restriccion `@@unique([membresiaId, version])` es el arbitro de concurrencia ya aceptado (INC00-MEM-03/04); la congelacion escribe su fila de cambio con `version` N+1 y actualiza la vigencia con `updateMany` condicional sobre `version` -> exactamente una escritura gana; la pierde recibe `MEMBRESIA_CONFLICTO`.
3. **Sin redundancia**: una fila por operacion concentra rango + motivo + fechas anteriores/nuevas; una tabla `Congelacion` duplicaria el rango respecto a la fila de auditoria y exigiria sincronizar ambas dentro de la transaccion.
4. **Reutilizacion HU-13 (INC-05)**: con `tipoServicio` en la misma fila de vigencia, la auditoria y el endpoint sirven a `PERSONALIZADO` sin migracion ni ruta nueva; si INC-05 decidiera un modelo aparte para personalizado, las reglas puras (contencion del rango, calculo de N, precedencia de estado) se extraen como funciones parametrizables del servicio y se reutilizan sin reescribirlas.

**Rechazo de NUTRICION (DEC-023)**: un unico punto de decision en el servicio, por ejemplo `TIPOS_CONGELABLES: ReadonlySet<"GYM" | "PERSONALIZADO"> = new Set(["GYM", "PERSONALIZADO"])`; si `!TIPOS_CONGELABLES.has(vigencia.tipoServicio)` -> `409 CONGELACION_NO_PERMITIDA`. En INC-05 se agrega (o no) un tipo al set segun DEC-023 sin tocar el flujo.

**Estado calculado**: `calcularEstado` pasa a aceptar los rangos de congelacion de la vigencia y aplicar precedencia: si `hoy ∈ [cInicio, cFin]` -> `CONGELADO` (prevalece sobre `PROGRAMADA`/`ACTIVA`/`VENCIDA`); si no, el calculo actual sobre `fechaInicio`/`fechaFin` (ya extendida). `CONGELADO` es un estado calculado, **no** se persiste. Fuera de rango, la vigencia vuelve al calculo normal (HU15-C03).

**`version` de la vigencia: SI incrementa (N -> N+1)** en cada congelacion aceptada. Justificacion: la congelacion muta `fechaFin` de la fila; si no incrementara, un `PATCH` con una `version` anterior a la congelacion pasaria el chequeo de `editarMembresia` y pisaria la `fechaFin` extendida, borrando silenciosamente la extension. Incrementarla mantiene un unico arbitro de escrituras sobre la fila y da el "version incrementada" que exige `HU15-C06`. Cada doble congelacion consecutiva suma N1+N2 exactamente una vez (extension aplicada dentro de la transaccion, sin duplicar dias).

**Migracion Prisma estimada** (no se ejecuta en este incremento de documentacion; tarea de `database-admin`): un solo archivo nuevo, nombre sugerido `prisma/migrations/20261009000000_add_congelacion_hu15/migration.sql`:

- `ALTER TABLE "MembresiaGym" ADD COLUMN "tipoServicio" TEXT NOT NULL DEFAULT 'GYM';` (las filas existentes quedan `GYM` sin rewrite de datos).
- `ALTER TABLE "MembresiaGymCambio" ADD COLUMN "motivo" TEXT;` + `"congelacionInicio" TEXT;` + `"congelacionFin" TEXT;` (nullable; se llenan en las filas de pausa `CONGELACION`, `EDICION_CONGELACION` y `DESCONGELACION`; la ampliacion DEC-024 no agrega mas columnas).

Compatible con SQLite (dev) y PostgreSQL (prod): `ADD COLUMN` con default escalar es portable; el datasource del schema es SQLite hoy (`prisma/schema.prisma:5-8`).

## Fixtures y datos de prueba (fijado 2026-10-08; F8..F11 por la ampliacion DEC-024)

Todos los fixtures se crean en el SQLite aislado por ejecucion (DEC-012) con limpieza automatica y fechas **dinamicas relativas a `getTodayBogota()`** (DEC-013); nada usa fechas de calendario fijas (ver nota Gherkin al final).

| # | Fixture | Como se crea | Para que prueba |
|---|---|---|---|
| F1 | Cliente + vigencia GYM `ACTIVA` que abarca hoy | Seed/API existente: `fechaInicio = hoy - 30`, `fechaFin = hoy + 30` (patron de `membresia-estado.test.ts` / `membresia.spec.ts`) | Happy path: congelar `[hoy - 2, hoy + 7]` -> N = 10, `fechaFin = hoy + 40`, `estado: "CONGELADO"` |
| F2 | Vigencia `PERSONALIZADO` `ACTIVA` | **Directa en BD** (no hay API hasta INC-05): `prisma.membresiaGym.create` con `tipoServicio: "PERSONALIZADO"`, `fechaInicio = hoy - 30`, `fechaFin = hoy + 30`, `version: 1`, `creadoPorId`/`actualizadoPorId` de un usuario del seed (DEC-013) | Camino PERSONALIZADO reutilizable de DEC-023: 200 sobre el mismo endpoint |
| F3 | Vigencia `NUTRICION` | Directa en BD: `tipoServicio: "NUTRICION"`, rango que abarque hoy | `409 CONGELACION_NO_PERMITIDA` (rechazo explicito DEC-023) |
| F4 | Vigencia `VENCIDA` | Directa en BD o API: `fechaFin = hoy - 10` | `409 MEMBRESIA_VENCIDA` |
| F5 | Periodo posterior contiguo | Segunda vigencia GYM del mismo cliente con `fechaInicio = (fechaFin extendida) + 1` | `409 MEMBRESIA_SOLAPADA` por choque de la extension con periodo posterior (sin cambios persistidos) |
| F6 | Congelacion previa | Doble llamada a la API (disjunta, con gap de 1 dia) o fila directa `MembresiaGymCambio` `accion: "CONGELACION"` + extension ya aplicada | Solape entre congelaciones (`409 MEMBRESIA_SOLAPADA`), gap permitido y doble extension N1+N2 |
| F7 | Vigencia con congelacion que cubre hoy en estado base `VENCIDA` | **Solo fixture directa en BD** (la API no permite congelar una vigencia vencida): fila `CONGELACION` con rango que cubre hoy sobre una vigencia con `fechaFin < hoy` | Precedencia de `calcularEstado`: `CONGELADO` prevalece sobre `VENCIDA` (prueba unitaria del calculo, no del endpoint) |
| F8 | **Pausa en curso** (base de la ampliacion DEC-024) | Doble llamada a la API sobre F1: `congelar [hoy - 2, hoy + 7]` (N = 10, `fechaFin = hoy + 40`, `version` 2) | `descongelar` en curso: `diasDevueltos = (hoy + 7) - hoy + 1 = 8`, `fechaFin = hoy + 32`, dias consumidos = 2; `editar` con revert `10` + aplicar `N` nuevo |
| F9 | **Pausa futura** | Doble llamada a la API sobre F1: `congelar [hoy + 5, hoy + 14]` (N = 10, extension aplicada, `hoy < inicio`) | `descongelar` de pausa futura devuelve los **10 dias completos** (caso limite 1 de la formula); `editar` antes de consumir dias (caso limite 5) |
| F10 | **Pausa ya descongelada** | F8 + `POST .../descongelar` (o fila directa `DESCONGELACION`) | doble `descongelar` y `editar` -> `409 CONGELACION_INEXISTENTE` (caso limite 4) |
| F11 | **Pausa terminada por calendario** | **Solo fixture directa en BD** (la API no deja crear un rango con `fechaFin < hoy`, regla post-Zod): fila `CONGELACION` `[hoy - 20, hoy - 10]` con extension N = 11 ya aplicada | `descongelar` y `editar` -> `409 CONGELACION_INEXISTENTE` (restantes = 0, caso limite 3) |

- **Nota ampliacion**: F1 **sin congelar** sirve para el caso "nunca congelada" -> `editar`/`descongelar` responden `409 CONGELACION_INEXISTENTE`.

**Nota para el RED**: los escenarios Gherkin borrados con fechas fijas (`2026-01-01..2026-03-31`, etc.) deben traducirse a fechas dinamicas relativas a hoy; con fecha de ejecucion real (p. ej. 2026-10-08) esas fechas fijas cairian en `VENCIDA` y romperian los escenarios. `test-engineer` los traduce al trasladarlos a `features/*.feature`.

## Criterios de aceptacion

Los criterios oficiales se generan en `club-beasts-api/features/acceptance-criteria/HU-15-criterios-aceptacion.md` (G14). Correspondencia prevista con los bullets de HU-15 y HU-12:

| ID provisional | Bullets que cubre |
|---|---|
| INC02-CON-01 | HU-15 b1: congelar los 3 tipos de servicio segun DEC-004 (ver Riesgo de alcance) |
| INC02-CON-02 | HU-15 b2: exige fecha inicio, fecha fin y motivo |
| INC02-CON-03 | HU-15 b3 + HU-12 b2: estado `CONGELADO` calculado y visible |
| INC02-CON-04 | HU-15 b4: extension automatica de `fechaFin` por el tiempo congelado |
| INC02-CON-05 | Permisos: `DUENO`/`RECEPCIONISTA` pueden congelar; `CLIENTE` 403 (DEC-017) |
| INC02-CON-06 | Auditoria de la operacion de congelacion |
| INC02-CON-07 | Ampliacion DEC-024: `descongelar` con la regla de dias (0 puntos, DEC-016) -> criterio `HU15-C07` |
| INC02-CON-08 | Ampliacion DEC-024: `editar congelacion` (revertir N y aplicar N nuevo; 0 puntos) -> criterio `HU15-C08` |

> Los criterios oficiales de la ampliacion (`HU15-C07`/`HU15-C08`) los crea `acceptance-criteria-analyst` a partir de la seccion "Ajustes pendientes de criterios (ampliacion DEC-024)"; no suman puntos (DEC-024/DEC-016).

## Riesgo de alcance (RESUELTO - DEC-023, 2026-10-08)

Decision del Producto: la congelacion aplica a **membresia gym y servicio personalizado**; **nutricion queda fuera de alcance**. Consecuencias para este incremento:

- `HU15-C01` se cierra con alcance enmendado (GYM + PERSONALIZADO); el escenario de nutricion se elimina o marca `@fuera-de-alcance` en `HU-15-criterios-aceptacion.md` (tarea del analista).
- La implementacion debe ser **reutilizable por tipo de servicio** para que INC-05 (HU-13) no reescriba la regla; el camino PERSONALIZADO debe poder probarse en INC-02 con fixture de BD (DEC-013), aunque las vigencias de personalizado se creen por API recien en INC-05.
- NUTRICION: rechazado explicitamente (409/403 `CONGELACION_NO_PERMITIDA`) para que el limite sea una regla, no un hueco.
- Riesgo heredado a INC-05: HU-14 b2 pide estado "congelado" de nutricion (ver DEC-023).

## Reglas de rango adoptadas (DEC-022)

- No se congela una vigencia `VENCIDA` -> 409 (confirmado por Producto).
- Rango contenido en la vigencia -> si no, 409 `CONGELACION_NO_PERMITIDA`.
- `fechaFin` de la congelacion hoy o futura; `fechaInicio` puede ser retroactivo si el rango sigue abierto.
- Extension de `fechaFin` = dias del rango, completos e inclusivos, `America/Bogota`.

## Ajustes pendientes de criterios (para `acceptance-criteria-analyst`)

Incompatibilidades detectadas en lectura entre `HU-15-criterios-aceptacion.md` / `HU-15-schemas.ts` (borrador del analista, no editado aqui) y el contrato final de este spec. El analista debe aplicar estos cambios antes del RED; ninguno toca la esencia de los criterios `HU15-C01..C06`, solo paths, codigos y coberturas. **No se edita el archivo de criterios desde este documento.**

| # | Incompatibilidad | Contrato final (fuente) | Cambio exigido al analista |
|---|---|---|---|
| 1 | Los criterios escriben el path con prefijo `/api` (`POST /api/clientes/:clienteId/vigencias/:vigenciaId/congelar`), pero el servidor registra rutas sin prefijo | `/clientes/:clienteId/vigencias/:vigenciaId/congelar` (`src/index.ts:23-25`) | Quitar `/api` del path en la tabla de contrato, cobertura de ramas y escenarios Gherkin |
| 2 | El body de `createCongelacionSchema` y el criterio `HU15-C02` no incluyen `version` | Body `{ fechaInicio, fechaFin, motivo, version }` (lock optimista INC00-MEM-03, ver contrato) | Agregar `version` (requerida, entero positivo) al schema y a las validaciones de campo/escenarios |
| 3 | Los criterios usan el codigo `CONGELACION_SOLAPADA` (escenario 16, tabla A, enum de `congelacionErrorSchema`) | El solape entre congelaciones usa `MEMBRESIA_SOLAPADA` (reutiliza el codigo existente) | Eliminar `CONGELACION_SOLAPADA` del enum; el escenario 16 y la tabla A esperan `MEMBRESIA_SOLAPADA` |
| 4 | Vigencia `VENCIDA` responde `CONGELACION_NO_PERMITIDA` (escenario 13, tabla A, transiciones) | Nuevo codigo `MEMBRESIA_VENCIDA` (409) | Agregar `MEMBRESIA_VENCIDA` al enum de errores y cambiar escenario 13, tabla A y tabla de transiciones para que la rama VENCIDA espere `MEMBRESIA_VENCIDA` |
| 5 | El orden de evaluacion de los 409 de los criterios no coincide con el contrato (no evaluan `version`; evaluan rango antes que estado) | Orden del contrato: version -> tipo NUTRICION -> VENCIDA -> rango contenido -> solapes | Actualizar la nota de orden y la tabla A al orden fijado en el contrato |
| 6 | `HU15-C01` y el `Scenario Outline` de los 3 tipos esperan 200 para `NUTRICION` ("ningun tipo puede devolver tipo no soportado") | DEC-023: `NUTRICION` se rechaza con `409 CONGELACION_NO_PERMITIDA`; `GYM` y `PERSONALIZADO` dan 200 (PERSONALIZADO via fixture F2) | Reescribir `HU15-C01` y el outline: `GYM` -> 200, `PERSONALIZADO` -> 200 (fixture directa BD), `NUTRICION` -> 409 `CONGELACION_NO_PERMITIDA` |
| 7 | Abierto #6 de los criterios propone admitir rango retroactivo `cFin < hoy` | DEC-022 b lo prohibe: `fechaFin` de la congelacion hoy o futura; se rechaza como `400 VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy" | Cerrar el abierto #6; agregar la clase invalida `fechaFin < hoy` a la particion de equivalencia y a los 400 del escenario de validacion |
| 8 | El schema de respuesta `congelacionResponseSchema` no incluye `cambios` ni `tipoServicio` a nivel de vigencia | La respuesta 200 es el DTO completo + `fechaFinAnterior` + `diasCongelados` + `congelacion` (ver contrato) | Agregar `cambios` (historial con la fila `CONGELACION`) y `tipoServicio` al schema de respuesta |
| 9 | Escenario 25 ("Precedencia sobre VENCIDA: fixture VENCIDA + rango que cubre hoy -> CONGELADO") y escenario 27 (`NUTRICION` -> 200) no son alcanzables via API | La API no permite congelar `VENCIDA` (409) ni `NUTRICION` (409); solo existen por fixture directa en BD | Marcar el escenario 25 como prueba de `calcularEstado` (fixture F7, no endpoint); el escenario 27 se reescribe segun #6 |
| 10 | El Background y varios escenarios Gherkin usan fechas de calendario fijas (`2026-01-01..2026-03-31`) | Los fixtures del spec son dinamicos relativos a hoy en `America/Bogota` | Dejar los Gherkin como borrador semantico; `test-engineer` traduce a fechas dinamicas en el RED (los criterios ya lo anticipan) |

## Ajustes pendientes de criterios (ampliacion DEC-024)

Lista de trabajo para `acceptance-criteria-analyst` (tarea 11 de `tareas.md`) sobre
`club-beasts-api/features/acceptance-criteria/HU-15-criterios-aceptacion.md` y
`HU-15-schemas.ts`. **No se edita ninguno de esos archivos desde este documento.** Los criterios
`HU15-C01..C06` no cambian en su esencia; lo que sigue es contrato y alcance de la ampliacion.

1. **Paths nuevos** (sin prefijo `/api`, mismo criterio que el ajuste #1): agregar a la tabla de
   contrato, la cobertura de ramas y el Gherkin `POST
   /clientes/:clienteId/vigencias/:vigenciaId/descongelar` y `PATCH
   /clientes/:clienteId/vigencias/:vigenciaId/congelacion`, con preHandler
   `["DUENO", "RECEPCIONISTA"]` (DEC-017) y ownership `404 NOT_FOUND` identico al de congelar.
2. **Bodies**: descongelar `{ version }` con `motivo` **opcional** (si viaja: 1-500 y no vacio;
   `""`/solo espacios o >500 -> 400 `VALIDATION_ERROR` con los mensajes existentes); editar
   `{ fechaInicio, fechaFin, motivo, version }` con los cuatro **requeridos** (reutiliza
   `createCongelacionSchema`: mismos mensajes + regla post-Zod `fechaFin >= hoy` -> 400
   `Fecha fin no puede ser anterior a hoy`). `version` en ambos por lock optimista INC00-MEM-03.
3. **Codigos nuevos**: `409 CONGELACION_INEXISTENTE` con mensaje `No hay una congelación vigente
   en esta membresía` (condicion: ultima fila de la secuencia de pausa no es activa o
   `hoy > congelacionFin`) en los enums de errores, las tablas de decision y los mensajes
   exactos. Reutilizar `MEMBRESIA_VENCIDA` y `CONGELACION_NO_PERMITIDA` con sus mensajes
   actuales (un `code` = un unico mensaje en `RESPUESTAS_ERROR`).
4. **Orden de evaluacion** de las dos operaciones (spec, secciones "Descongelar" y "Editar
   congelacion"): 401/403 -> 400 (Zod; ademas `fechaFin >= hoy` en editar) -> 404 -> 409:
   `MEMBRESIA_CONFLICTO` -> `CONGELACION_NO_PERMITIDA` (tipo) -> `MEMBRESIA_VENCIDA` ->
   `CONGELACION_INEXISTENTE` -> (solo editar) `CONGELACION_NO_PERMITIDA` (rango contenido en la
   fila revertida) -> `MEMBRESIA_SOLAPADA` (solape con otra pausa) ->
   `MEMBRESIA_SOLAPADA` (choque con periodo posterior). `MEMBRESIA_SOLAPADA` **no aplica** a
   descongelar.
5. **Formula DEC-024** (seccion "Regla de dias de la ampliacion (DEC-024) - formula
   verificable"): `diasDevueltos = max(0, finRango - max(hoy, inicioRango) + 1)` (0 -> 409;
   pausa futura -> N completo) y editar `fechaFin = fechaFin - N_anterior + N_nuevo`.
   Escenarios exigidos con valores numericos fijados en el RED: pausa futura, en curso, ya
   terminada, doble descongelar, editar antes y despues de consumir dias, rango identico
   (fixtures F8..F11).
6. **DEC-025 (sin bloqueo de acceso)**: dejar explicito en criterios y Gherkin que durante
   `CONGELADO` el cliente **conserva el acceso** al gimnasio y al portal; INC-02 no implementa
   ningun bloqueo por congelacion (vencimiento -> HU-16/INC-03; `INACTIVO` -> HU-08/INC-04). El
   estado `CONGELADO` no se usa para denegar ingreso ni en el portal.
7. **Cerrar abiertos #7 y #8**: #7 -> resuelto por **DEC-024** + el contrato de este spec
   (eliminar la frase "Descongelar / editar congelacion: fuera de alcance / no existe
   `POST .../descongelar`"); #8 -> resuelto por **DEC-025** (no hay bloqueo de acceso). Ambos
   pasan de "Pendientes" a "Resueltos" citando la decision.
8. **Criterios nuevos `HU15-C07` (descongelar) y `HU15-C08` (editar congelacion)**: 0 puntos
   (DEC-024/DEC-016); sin tocar la trazabilidad de puntos de `HU15-C01..C06` ni el conteo de
   HU-15/HU-12.

## Agentes responsables

| Area | Agente |
|---|---|
| Criterios ISTQB + schemas | acceptance-criteria-analyst |
| Modelo de datos y migracion | database-admin |
| Tests RED | test-engineer |
| API y reglas de negocio | backend-developer |
| UI de congelacion | frontend-developer |
| Verificacion completa | test-engineer |
| Revision | code-reviewer |
| Puntos aceptados | Orquestador (avance.md + auditoria) |

## Evidencia requerida

Igual que INC-00/INC-01: comando, fecha y salida resumida para API `tsc`/`vitest`, Gherkin si aplica, web `tsc`/`vitest`/`build`, Playwright, estado de migraciones y revision con hallazgos cerrados o riesgos residuales.
