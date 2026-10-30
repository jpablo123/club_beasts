# Criterios de Aceptación - HU-15: Congelación de vigencias

> Generado por `acceptance-criteria-analyst` (Modo CREAR) el 2026-10-08. Prerequisito **G14** de
> `docs/producto/auditoria-puntos-inc00.md` ("sin criterios escritos no se puntua").
> Incremento: `docs/incrementos/INC-02-congelacion-hu-15/`.
> Fuentes: `historias-usuario-gimnasio.md:251-264` (4 bullets), `INC-02/spec.md`, DEC-004, DEC-005,
> DEC-006, DEC-007, DEC-008, DEC-016, DEC-017.
> Schemas: `HU-15-schemas.ts` (mismo directorio).
>
> **Refactorización 2026-10-08 (Modo REFACTORIZAR)**: alineación con **DEC-023** (alcance de la
> congelación: GYM + PERSONALIZADO, nutrición fuera de alcance), **DEC-022** (reglas de rango) y
> nomenclatura de códigos de error del código existente (`src/routes/membresia.ts`,
> `src/lib/errors.ts`). Ver sección **"Alcance enmendado"**. `HU15-C02..C06` no cambian en su
> esencia.
>
> **Alineación con el contrato final de INC-02 (2026-10-08, Modo REFACTORIZAR)**: se aplican los
> **10 ajustes** de la sección "Ajustes pendientes de criterios" de
> `docs/incrementos/INC-02-congelacion-hu-15/spec.md` (#1 path sin prefijo `/api`; #2 `version`
> en el body; #3 `CONGELACION_SOLAPADA` → `MEMBRESIA_SOLAPADA`; #4 rama `MEMBRESIA_VENCIDA`;
> #5 orden de evaluación fijado; #6 `HU15-C01`/outline con `NUTRICION` → 409; #7 `fechaFin < hoy`
> → 400 `VALIDATION_ERROR`; #8 `cambios` + `tipoServicio` en la respuesta; #9 precedencia
> `CONGELADO`/`VENCIDA` como prueba de `calcularEstado` con fixture F7; #10 Gherkin como borrador
> semántico con fechas dinámicas). Las ambigüedades abiertas **#9, #10 y #12** del informe
> anterior quedan cerradas (ver "Abiertos / decisiones pendientes").
>
> **Ampliación DEC-024 + DEC-025 (2026-10-08, Modo CREAR + REFACTORIZAR)**: el Producto amplió
> INC-02 con **DEC-024** (operaciones `descongelar` y `editar congelación`; **0 puntos HU-15 —
> sin bullet; alcance de producto**, DEC-016: se especifica, prueba y revisa igual) y **DEC-025**
> (durante la congelación el cliente **conserva el acceso**; cierra el abierto **#8**). Se
> aplican los **8 ajustes** de la sección "Ajustes pendientes de criterios (ampliacion
> DEC-024)" del spec INC-02: **#1** paths nuevos sin prefijo `/api` (`POST
> .../vigencias/:vigenciaId/descongelar`, `PATCH .../vigencias/:vigenciaId/congelacion`);
> **#2** bodies con `version` (`{ version, motivo? }` / `{ fechaInicio, fechaFin, motivo,
> version }`); **#3** código nuevo **409 `CONGELACION_INEXISTENTE`**; **#4** orden de
> evaluación determinista de las dos operaciones; **#5** fórmula de días DEC-024 verificable +
> casos límite con fixtures F8..F11; **#6** DEC-025 sin bloqueo de acceso; **#7** abiertos
> **#7** (DEC-024) y **#8** (DEC-025) cerrados; **#8** criterios nuevos `HU15-C07`/`HU15-C08`
> (**0 puntos**, sin tocar la trazabilidad de `HU15-C01..C06`). Contrato fuente:
> `INC-02/spec.md`, secciones "Descongelar", "Editar congelacion", "Regla de dias de la
> ampliacion (DEC-024) - formula verificable" y "Fixtures" (F8..F11).
>
> **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: **DEC-023 queda enmendada** —
> `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`, es decir **NUTRICION también es
> congelable** (200). Todos los literales de este documento que fijaban el alcance
> pre-DEC-042 (solo `GYM` + `PERSONALIZADO`; `NUTRICION` → 409
> `CONGELACION_NO_PERMITIDA` por tipo) quedan **enmendados sin borrar ningún criterio,
> fila, rama ni escenario**: la guarda por tipo **se conserva como guarda genérica**
> (aplica a tipos fuera de `TIPOS_CONGELABLES`; con el enum actual es **inalcanzable vía
> API**; sigue existiendo en `src/services/membresia.service.ts`) y el 409
> `CONGELACION_NO_PERMITIDA` por **rango no contenido** (DEC-022 a) **no cambia**. La
> enmienda es de **regresión del G14 de HU-15**: **no altera trazabilidad ni conteo de
> puntos** de HU-15. Salvedad C4 de `INC05-CONF-06`.

## Resumen

Operación de congelación sobre una vigencia de servicio: el usuario (`DUENO` o `RECEPCIONISTA`,
DEC-017) pausa temporalmente el servicio indicando fecha de inicio, fecha de fin y motivo. El
sistema pasa el estado calculado de la vigencia a `CONGELADO` durante el rango y extiende
automáticamente `fechaFin` por la cantidad de días congelados (días completos, extremos
inclusivos, zona `America/Bogota`). La operación queda auditada.

> **Ampliación (DEC-024/DEC-025, 0 puntos HU-15)**: el alcance de INC-02 incluye además
> **descongelar** (`HU15-C07`, descontar solo los días restantes de la pausa) y **editar la
> congelación** (`HU15-C08`, revertir `N_anterior` y aplicar `N_nuevo`), y fija que durante la
> congelación el **cliente conserva el acceso** (DEC-025, expectativa en `HU15-C03`); ninguna
> de las tres operaciones bloquea acceso ni portal.

## Trazabilidad bullet -> criterio (DEC-016: fraccionable, sin duplicar puntos)

| # | Bullet de HU-15 (`historias-usuario-gimnasio.md`) | ID criterio | ID en spec INC-02 | ¿Cerrable por separado? | Estado del criterio |
|---|---|---|---|---|---|
| b1 | "El sistema permite congelar membresia gym, personalizado o nutricion." | `HU15-C01` | INC02-CON-01 | Sí | **Alcance enmendado 2 veces: DEC-023 (2026-10-08) → GYM y PERSONALIZADO → 200, NUTRICION → 409 `CONGELACION_NO_PERMITIDA`; enmendado 2026-10-20 por DEC-042 (INC-05 C4) → los 3 tipos (`GYM`, `PERSONALIZADO`, `NUTRICION`) → 200** — DEC-023 queda enmendada (`TIPOS_CONGELABLES` con los 3); la guarda 409 por tipo se conserva genérica e inalcanzable con el enum actual (ver "Alcance enmendado") — ABIERTO (RED/GREEN pendientes) |
| b2 | "La congelacion requiere fecha de inicio, fecha de fin y motivo." | `HU15-C02` | INC02-CON-02 | Sí | Abierto (RED/GREEN pendientes) |
| b3 | "Durante la congelacion el estado cambia a congelado." | `HU15-C03` | INC02-CON-03 | Sí | Abierto |
| b4 | "La fecha de vencimiento se extiende automaticamente por el tiempo congelado." | `HU15-C04` | INC02-CON-04 | Sí | Abierto |
| Encabezado HU ("Como dueno o recepcionista") + DEC-017 | Permisos de la operación | `HU15-C05` | INC02-CON-05 | Sí | Abierto (regla ya decidida: DEC-017) |
| Alcance del spec INC-02 (auditoría de la operación, patrón INC00-MEM-04) | Auditoría de la congelación | `HU15-C06` | INC02-CON-06 | Sí | Abierto (sin bullet de HU: criterio de incremento, no de HU; ver "No duplicado") |
| **Sin bullet en HU-15** (ampliación **DEC-024**, 2026-10-08) | Descongelar con la regla de días de DEC-024 | `HU15-C07` | INC02-CON-07 | **N/A — 0 puntos HU-15** (alcance de producto, DEC-016) | Abierto (RED/GREEN pendientes; cierra abierto #7) |
| **Sin bullet en HU-15** (ampliación **DEC-024**, 2026-10-08) | Editar congelación (revertir `N_anterior`, aplicar `N_nuevo`) | `HU15-C08` | INC02-CON-08 | **N/A — 0 puntos HU-15** (alcance de producto, DEC-016) | Abierto (RED/GREEN pendientes; cierra abierto #7) |

> **Nota de conteo**: los puntos de HU-15 se miden sobre sus **4 bullets** (`HU15-C01..C04`).
> `HU15-C05` y `HU15-C06` son criterios exigidos por el spec del incremento (permisos y
> auditoría); su cierre es condición para declarar completo el incremento, no suma bullets de HU.
>
> **Nota de conteo (ampliación DEC-024)**: `HU15-C07` y `HU15-C08` son **0 puntos HU-15**
> (**sin bullet**; alcance DEC-024 / DEC-016: se especifica, prueba y revisa igual que el
> resto). **No tocan la trazabilidad ni el conteo de `HU15-C01..C06`** (HU-15 2 puntos por sus
> 4 bullets + HU-12 b2 1.5) ni el de HU-12.
>
> **Nota DEC-025 (0 puntos, sin bullet)**: durante una congelación vigente el **CLIENTE
> conserva el acceso** —expectativa verificable en `HU15-C03`, ver su sección "Resultado
> observable"—; INC-02 no implementa ningún bloqueo por congelación. **Cierra el abierto #8.**

## Contrato API final (fijado 2026-10-08 por `backend-developer` en `INC-02/spec.md`)

| Endpoint | Body | Éxito | Errores esperados |
|---|---|---|---|
| `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` (genérico, DEC-004; **sin prefijo `/api`**: el servidor registra rutas sin prefijo global, `src/index.ts:23-25`) | `{ fechaInicio, fechaFin, motivo, version }` | **200** con la vigencia actualizada: `tipoServicio`, `fechaFin` extendida, `fechaFinAnterior`, `diasCongelados`, `estado: "CONGELADO"` (calculado), `version` incrementada, `creadoPor`/`actualizadoPor`/`createdAt`/`updatedAt`, historial `cambios` (incluye la fila `CONGELACION`) y bloque `congelacion` | 400 `VALIDATION_ERROR`, 401 `AUTH_TOKEN_MISSING/INVALID/EXPIRED`, 403 `AUTH_FORBIDDEN`, 404 `NOT_FOUND`, 409 `MEMBRESIA_CONFLICTO`, 409 `CONGELACION_NO_PERMITIDA`, 409 `MEMBRESIA_VENCIDA`, 409 `MEMBRESIA_SOLAPADA` |
| Alcance del endpoint | - | Vigencias `GYM`, `PERSONALIZADO` y `NUTRICION` (**DEC-042**: `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`; DEC-023 enmendada) — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)** | Tipo fuera de `TIPOS_CONGELABLES` → 409 `CONGELACION_NO_PERMITIDA` (**guarda genérica**; pre-DEC-042 aplicaba a `NUTRICION` — antes: "guard exigido y probado en INC-02", ver abierta #12; con el enum actual ninguna vigencia legítima la alcanza) |
| **`POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar`** (ampliación **DEC-024**; **sin prefijo `/api`**, mismo path base que congelar; preHandler `fastify.authenticateRoles(["DUENO","RECEPCIONISTA"])` (DEC-017); ownership idéntico → 404) | `{ version }` con **`motivo` opcional** (si viaja: 1-500 y no vacío tras trim; `""`/solo espacios o >500 → 400 con los mensajes existentes) — **acción `POST`, no `DELETE`**: la fila `CONGELACION` no se borra (historial inmutable, `HU15-C06`) | **200** con la vigencia: `fechaFin` reducida, `fechaFinAnterior`, **`diasDevueltos`**, `estado` recalculado **sin pausa vigente**, `version` N→N+1, `cambios` con la fila **`DESCONGELACION`**, **`congelacion: null`** | 400 `VALIDATION_ERROR` (`version`; `motivo` **si viaja**), 401 `AUTH_TOKEN_*`, 403 `AUTH_FORBIDDEN`, 404 `NOT_FOUND`, 409 `MEMBRESIA_CONFLICTO`, 409 `CONGELACION_NO_PERMITIDA` (tipo — guarda genérica; **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: `NUTRICION` ya no cae aquí), 409 `MEMBRESIA_VENCIDA`, **409 `CONGELACION_INEXISTENTE`** (nuevo). **No evalúa `MEMBRESIA_SOLAPADA`** (decrementar nunca crea solape, DEC-008) |
| **`PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion`** (ampliación **DEC-024**; **sin prefijo `/api`**; mismo preHandler y ownership; recurso único por vigencia → sin `congelacionId`) | **`{ fechaInicio, fechaFin, motivo, version }` — los 4 requeridos** (reutiliza `createCongelacionSchema`: mismos mensajes + regla post-Zod `fechaFin ≥ hoy` → 400 `Fecha fin no puede ser anterior a hoy`; `version` por lock optimista INC00-MEM-03; el cliente **no** envía `fechaFin` de la vigencia ni el N) | **200**: **`fechaFin' = fechaFin − N_anterior + N_nuevo`**, `fechaFinAnterior`, `diasCongelados = N_nuevo`, **`diasCongeladosAnterior = N_anterior`**, `estado` calculado con el **rango nuevo**, `version` N→N+1, `cambios` con la fila **`EDICION_CONGELACION`**, `congelacion` con el rango editado. **Rango idéntico (`N' = N`) → igualmente 200** (escribe auditoría y `version` + 1) | 400 `VALIDATION_ERROR` (los mismos 8 de congelar, incluida la regla post-Zod `fechaFin ≥ hoy`), 401, 403, 404, 409 `MEMBRESIA_CONFLICTO`, 409 `CONGELACION_NO_PERMITIDA` (tipo — guarda genérica; con DEC-042 `NUTRICION` ya no cae aquí — **y** rango nuevo no contenido en la fila **revertida**), 409 `MEMBRESIA_VENCIDA`, **409 `CONGELACION_INEXISTENTE`**, 409 `MEMBRESIA_SOLAPADA` (solape con otra pausa) y 409 `MEMBRESIA_SOLAPADA` (choque de la nueva `fechaFin` con periodo posterior) |

- **Ownership**: la vigencia debe existir y pertenecer al `clienteId` de la ruta; si no →
  404 `NOT_FOUND` (mismo patrón que `editarMembresia`, sin filtrar la existencia del recurso
  ajeno).
- **Nomenclatura de códigos** (idéntica a `src/routes/membresia.ts:19-43` y `src/lib/errors.ts`,
  salvo indicación):

  | Código | Status | Uso en HU-15 |
  |---|---|---|
  | `VALIDATION_ERROR` | 400 | Body/params mal formados o campos requeridos ausentes (`HU15-C02`) **y regla post-Zod `fechaFin ≥ hoy`** |
  | `AUTH_TOKEN_MISSING/INVALID/EXPIRED` | 401 | Sin token / token inválido / token expirado (`HU15-C05`) |
  | `AUTH_FORBIDDEN` | 403 | Rol `CLIENTE` (`HU15-C05`; código real en `src/plugins/auth.ts:59-62`) |
  | `NOT_FOUND` | 404 | Vigencia inexistente o de otro cliente |
  | `MEMBRESIA_CONFLICTO` | 409 | `version` del body ≠ versión actual de la vigencia, o carrera perdida (lock optimista INC00-MEM-03) |
  | `CONGELACION_NO_PERMITIDA` | 409 | Tipo fuera de `TIPOS_CONGELABLES` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: pre-DEC-042 era servicio `NUTRICION` según DEC-023; hoy los 3 tipos son congelables y la guarda queda genérica, inalcanzable vía API con el enum actual) **o** rango `[fechaInicio, fechaFin]` no contenido en la vigencia (DEC-022 a — **sin cambio**) |
  | `MEMBRESIA_VENCIDA` | 409 | Vigencia en estado `VENCIDA` (DEC-022, confirmada por Producto) |
  | `MEMBRESIA_SOLAPADA` | 409 | Solape del rango con otra congelación existente, **o** choque de la extensión con un periodo posterior del mismo cliente (DEC-008; ambos casos, mismo mensaje) |
  | **`CONGELACION_INEXISTENTE`** | **409** | **Ampliación DEC-024 (`HU15-C07`/`HU15-C08`): no hay congelación vigente que operar** — nunca se congeló, ya fue descongelada, o `hoy > congelacionFin`. **409 y no 404**: la vigencia sí existe y superó el ownership; lo que falta es un *estado* del recurso, y la convención de `RESPUESTAS_ERROR` clasifica como 409 los rechazos por estado. Siguió el prefijo `CONGELACION_*` de `CONGELACION_NO_PERMITIDA` |

  > **Cierre de ambigüedades del informe anterior**:
  > - **#9 / #6**: `fechaFin < hoy` **no** es 409: es **400 `VALIDATION_ERROR`** con mensaje
  >   `Fecha fin no puede ser anterior a hoy` (regla post-Zod del contrato INC-02; DEC-022 b
  >   prohíbe congelar solo tiempo ya consumido).
  > - **#10**: el 403 usa **`AUTH_FORBIDDEN`** (código real de `src/plugins/auth.ts:59-62`);
  >   "403 FORBIDDEN" del encargo es el status, no el `code`.
  > - **#12**: el guard de `NUTRICION` **se exige y se prueba en INC-02** (409
  >   `CONGELACION_NO_PERMITIDA`); DEC-023 solo mantiene fuera de alcance la congelación
  >   *exitosa* de nutrición (INC-05). **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**:
  >   DEC-023 queda enmendada (`TIPOS_CONGELABLES` con los 3 tipos) — nutrición **sí es
  >   congelable** y el guard 409 pasa a guarda genérica para tipos fuera del set; el
  >   requisito del INC-02 se cumplió con el alcance vigente en su momento.
  > - **#11**: no existe `CONGELACION_SOLAPADA`; el solape entre congelaciones usa
  >   `MEMBRESIA_SOLAPADA`.

- **Mensajes de negocio exactos (fijados en el contrato INC-02)**:

  | Condición | Status/code | Mensaje `error` |
  |---|---|---|
  | Vigencia `VENCIDA` | 409 `MEMBRESIA_VENCIDA` | `No se puede congelar una membresía vencida` |
  | Tipo fuera de `TIPOS_CONGELABLES` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: pre-DEC-042 era `NUTRICION` por DEC-023; hoy `GYM`, `PERSONALIZADO` y `NUTRICION` → 200) | 409 `CONGELACION_NO_PERMITIDA` | `La congelación no está permitida para este tipo de servicio` (mensaje **sin cambio**; único por `code`, hoy solo alcanzable con un tipo fuera del set) |
  | Rango no contenido en la vigencia | 409 `CONGELACION_NO_PERMITIDA` | `El rango de congelación debe estar dentro de la vigencia` |
  | Solape con otra congelación **o** choque con periodo posterior | 409 `MEMBRESIA_SOLAPADA` | `Las fechas se solapan con un período existente` |
  | `version` desactualizada / carrera perdida | 409 `MEMBRESIA_CONFLICTO` | `Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.` |
  | `fechaFin` de la congelación < hoy (post-Zod) | 400 `VALIDATION_ERROR` | `Fecha fin no puede ser anterior a hoy` |
  | **Sin congelación vigente** (nunca congelada / ya descongelada / `hoy > congelacionFin`) — ampliación DEC-024 | **409 `CONGELACION_INEXISTENTE`** | **`No hay una congelación vigente en esta membresía`** |

  > `MEMBRESIA_VENCIDA`, `CONGELACION_NO_PERMITIDA` y `CONGELACION_INEXISTENTE` reutilizan un
  > **único mensaje por `code`** en `RESPUESTAS_ERROR` también en `descongelar` y `editar` (el
  > mensaje de `MEMBRESIA_VENCIDA` conserva el texto "congelar"; si Producto quiere un texto
  > genérico se cambia el mensaje único y afecta a las tres operaciones).

  (Los mensajes 400 de campos, 401, 403 y 404 están en `HU15-C02`, `HU15-C05` y en la tabla de
  contrato del spec.)

- **Orden de evaluación de errores** (determinista, fijado en el contrato INC-02):
  401/403 (preHandler `authenticateRoles`) → **400** por schema Zod (params y body: formato,
  `fechaFin < fechaInicio`, motivo, `version`) y **después** la regla post-Zod
  `fechaFin ≥ hoy` → 404 (vigencia inexistente o de otro cliente) → **409** en este orden:
  1. `MEMBRESIA_CONFLICTO` (`version` desactualizada; se evalúa junto a la carga, antes que
     las reglas de negocio) →
  2. `CONGELACION_NO_PERMITIDA` (tipo; guarda genérica — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: `NUTRICION` ya no cae aquí, los 3 tipos son congelables) →
  3. `MEMBRESIA_VENCIDA` (estado de la vigencia) →
  4. `CONGELACION_NO_PERMITIDA` (rango no contenido) →
  5. `MEMBRESIA_SOLAPADA` (solape con otra congelación) →
  6. `MEMBRESIA_SOLAPADA` (choque de la extensión con un periodo posterior).

  **Ampliación DEC-024 — órdenes fijados en el spec (secciones "Descongelar" y "Editar
  congelacion")**:

  - **`POST .../descongelar`**: 401/403 (preHandler) → **400** por Zod (`version`; `motivo` si
    viaja; **sin regla post-Zod de fechas**: el body no trae fechas) → 404 → **409** en este
    orden: 1. `MEMBRESIA_CONFLICTO` (version; patrón INC00-MEM-03, junto a la carga) →
    2. `CONGELACION_NO_PERMITIDA` (tipo; guarda genérica — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: `NUTRICION` ya no cae aquí, los 3 tipos son congelables) → 3. `MEMBRESIA_VENCIDA` →
    4. **`CONGELACION_INEXISTENTE`** (no hay pausa vigente). Los tres primeros 409 son los
    **mismos guards de congelar en el mismo orden** (paridad); **`MEMBRESIA_SOLAPADA` no se
    evalúa**.
  - **`PATCH .../congelacion`**: 401/403 → **400** por Zod y **después** la regla post-Zod
    `fechaFin ≥ hoy` → 404 → **409** en este orden: 1. `MEMBRESIA_CONFLICTO` →
    2. `CONGELACION_NO_PERMITIDA` (tipo) → 3. `MEMBRESIA_VENCIDA` →
    4. **`CONGELACION_INEXISTENTE`** (no hay pausa vigente que editar) →
    5. `CONGELACION_NO_PERMITIDA` (rango nuevo **no contenido** en la fila **revertida**) →
    6. `MEMBRESIA_SOLAPADA` (solape con otra pausa) → 7. `MEMBRESIA_SOLAPADA` (choque de la
    nueva `fechaFin` con periodo posterior). **Clave**: primero se revierte `N_anterior` en
    memoria y con la fila revertida se ejecutan las **MISMAS reglas de congelar** sobre el
    rango nuevo; después se aplica `N_nuevo` (fórmula abajo).
- **Reglas de rango (DEC-022, aprobadas)**:
  - el rango `[fechaInicio, fechaFin]` de la congelación debe quedar **contenido** en la
    vigencia (si no → 409 `CONGELACION_NO_PERMITIDA`);
  - **no se congela una vigencia `VENCIDA`** → 409 `MEMBRESIA_VENCIDA` (confirmado por Producto);
  - `fechaFin` de la congelación debe ser **hoy o futura** (en `America/Bogota`) → si no,
    **400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"** (regla post-Zod, fuera
    del schema porque `hoy` es dinámica); el `fechaInicio` **puede ser retroactivo** mientras el
    rango siga abierto (`fechaFin ≥ hoy`);
  - servicio **dentro de alcance** (`GYM`/`PERSONALIZADO`/`NUTRICION` — **Enmendado
    2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 enmendada, `TIPOS_CONGELABLES` con los
    3 tipos) → tipo fuera de `TIPOS_CONGELABLES` → 409 `CONGELACION_NO_PERMITIDA`
    (guarda genérica; pre-DEC-042 aplicaba a `NUTRICION`, guard exigido en INC-02);
  - la extensión suma los días del rango en **días completos inclusivos**, zona
    `America/Bogota` (DEC-005/DEC-006).
- **`version` va en el body** (lock optimista INC00-MEM-03, patrón del `PATCH` existente):
  el cliente envía la `version` que leyó; una ficha obsoleta recibe 409 `MEMBRESIA_CONFLICTO`
  en lugar de congelar sobre datos viejos. El cliente **no envía** la nueva `fechaFin`: la
  calcula el servidor (`HU15-C04`).
- **Descongelar / editar congelación → EN alcance (DEC-024, 2026-10-08)**: sin bullet en
  HU-15 → **0 puntos** (DEC-016: alcance de producto; se especifica, prueba y revisa igual
  que el resto). Contrato fijado en `INC-02/spec.md` (secciones "Descongelar" y "Editar
  congelacion"): criterios **`HU15-C07`** y **`HU15-C08`**, fórmula de días DEC-024 y código
  **409 `CONGELACION_INEXISTENTE`**. **Cierra el abierto #7.**
- **Acceso del cliente durante la congelación → DEC-025 (2026-10-08)**: el cliente
  **conserva el acceso** (autenticarse y usar portal/servicio) mientras la vigencia está
  `CONGELADO`; la congelación **NO bloquea** nada. INC-02 **no implementa ningún bloqueo** por
  congelación (`CONGELADO` no se usa para denegar ingreso ni en el portal; bloqueo por
  vencimiento → HU-16/INC-03, por `INACTIVO` → HU-08/INC-04). Expectativa verificable en
  `HU15-C03` (**0 puntos**, sin bullet). **Cierra el abierto #8.**

## Criterios (detalle)

### `HU15-C01` — Congelar GYM, PERSONALIZADO y NUTRICION (alcance enmendado por DEC-042 sobre DEC-023)

> **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 queda enmendada —
> `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`. El alcance pre-DEC-042 ("GYM y
> PERSONALIZADO → 200; NUTRICION → 409") se conserva como historial en las secciones
> "Alcance enmendado (2026-10-08)" y "Riesgo de alcance del bullet b1"; **ningún elemento
> del criterio se elimina**.

- **Alcance**: la congelación está **permitida** para **membresía `GYM`**, **servicio
  `PERSONALIZADO`** y **servicio `NUTRICION`** (**DEC-042, 2026-10-20**, enmienda de DEC-023:
  `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`). **Ningún tipo del enum se rechaza
  por tipo**; el 409 `CONGELACION_NO_PERMITIDA` por tipo queda como **guarda genérica** para
  valores fuera de `TIPOS_CONGELABLES` (con el enum actual es **inalcanzable vía API**;
  pre-DEC-042 aplicaba a `NUTRICION` y ese guard **se exigió y se probó en INC-02** — spec
  INC-02, "Riesgo de alcance": el límite debe ser una regla, no un hueco — abierta #12
  resuelta con el alcance vigente entonces).
- **Condición pre**: existe una vigencia del cliente solicitado; fixtures fijados en el spec
  INC-02 (sección "Fixtures"): `GYM` → **F1** (alta por API/seed), `PERSONALIZADO` → **F2**
  (fixture **directa en BD**, DEC-012/DEC-013, porque su alta por API llega en INC-05),
  `NUTRICION` → **F3** (fixture directa en BD).
- **Disparo**: `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` sobre una vigencia
  de cada tipo.
- **Resultado observable**:
  - `GYM` → **200**, `estado: "CONGELADO"` y `fechaFin` extendida (fixture F1);
  - `PERSONALIZADO` → **200**, ídem sobre el **mismo endpoint** (fixture F2): el camino es
    reutilizable por tipo de servicio para que INC-05 (HU-13) no reescriba la regla;
  - `NUTRICION` → **200**, `estado: "CONGELADO"` y `fechaFin` extendida (fixture F3) —
    **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: antes el literal decía **409
    `CONGELACION_NO_PERMITIDA`** con mensaje `La congelación no está permitida para este tipo
    de servicio` y la vigencia **no cambiaba**; esa rama 409 se conserva únicamente como
    guarda genérica (ver "Errores esperados") y **no se borra ningún escenario**: los que la
    cubrían quedan enmendados a 200 o reencuadrados sobre un tipo fuera del set.
- **Errores esperados**: mismos códigos que los demás criterios (400/401/403/404/409); ningún
  tipo incluido (`GYM`/`PERSONALIZADO`/`NUTRICION`) puede devolver "tipo no soportado" ni 409
  por tipo; el 409 `CONGELACION_NO_PERMITIDA` por tipo solo queda para un valor **fuera de
  `TIPOS_CONGELABLES`** (guarda genérica, hoy no representable con el enum; mensaje sin
  cambio).
- **Qué NO cubre**: el registro/alta de vigencias de personalizado y nutrición (HU-13/HU-14 →
  INC-05); la UI de esos servicios; la asignación de rutina/plan. ~~la **congelación exitosa
  (200) de `NUTRICION`**, que sigue fuera de alcance hasta que el Producto lo reabra en
  INC-05 (DEC-023)~~ **ya no es hueco: DEC-042 la incluye en alcance (resolución de
  `INC05-PEND-01`; regresión C4 de INC-05, sin puntos nuevos para HU-15)**.
- **Estado**: **alcance enmendado dos veces: DEC-023 (2026-10-08) y DEC-042 (2026-10-20,
  INC-05 C4)**; criterio ABIERTO (RED/GREEN pendientes). El bullet b1 de HU-15 no se elimina:
  se cierra con este alcance enmendado; la enmienda **no altera trazabilidad ni conteo de
  puntos**.

### `HU15-C02` — Requiere fecha de inicio, fecha de fin y motivo (más `version`)

- **Condición pre**: petición con body `{ fechaInicio, fechaFin, motivo, version }`. El bullet
  b2 exige los tres primeros; **`version` la añade el contrato INC-02** (lock optimista
  INC00-MEM-03, mismo patrón que `updateMembresiaSchema` del `PATCH`).
- **Disparo**: envío de la congelación con cada campo ausente o inválido.
- **Resultado observable**: con todos los campos válidos → 200; con cualquiera ausente o
  inválido → **400 `VALIDATION_ERROR`** con mensaje específico en español y **ninguna
  modificación persistida** (la transacción no inicia).
- **Errores esperados**:
  - `fechaInicio` ausente → 400 "Fecha de inicio es requerida".
  - `fechaFin` ausente → 400 "Fecha fin es requerida".
  - `motivo` ausente/vacío/solo espacios → 400 "Motivo es requerido".
  - `motivo` > 500 caracteres → 400 "Motivo no puede exceder 500 caracteres".
  - fecha con formato distinto de `YYYY-MM-DD` o inexistente en calendario
    (`2026-02-30`, `01/02/2026`) → 400 "… debe ser una fecha válida (YYYY-MM-DD)".
  - `fechaFin` anterior a `fechaInicio` → 400 "Fecha fin no puede ser anterior a fecha de inicio".
  - `version` ausente → 400 "Versión es requerida"; no entera → 400 "Versión debe ser un
    entero"; ≤ 0 → 400 "Versión debe ser positiva".
  - **`fechaFin` < hoy** (regla **post-Zod**, `America/Bogota`) → 400 "Fecha fin no puede ser
    anterior a hoy". **Cierra el abierto #6/#9**: DEC-022 b prohíbe congelar solo tiempo ya
    consumido y el contrato INC-02 lo clasifica como `400 VALIDATION_ERROR` (no 409). El
    `fechaInicio` retroactivo sigue permitido mientras `fechaFin ≥ hoy`.
- **Qué NO cubre**: reglas de solape de vigencias (HU-12/DEC-008, ya acreditadas); el cálculo
  de días (C04); la validación de permisos (C05); las **reglas de negocio de DEC-022/DEC-023
  que dependen del recurso** (rango contenido, vigencia `VENCIDA`, tipo fuera de
  `TIPOS_CONGELABLES` — pre-DEC-042: servicio `NUTRICION`, **Enmendado 2026-10-20 por
  DEC-042 (INC-05 C4)** —, y que
  `version` coincida con la actual) — esas responden **409** y viven en `HU15-C01`/`HU15-C04`.
- **Nota**: `fechaFin ≥ hoy` no puede vivir en el schema Zod porque `hoy` es dinámica
  (`getTodayBogota()`); se evalúa en la ruta/servicio justo después del schema, con el mismo
  `code` 400 `VALIDATION_ERROR`.
- **Estado**: abierto.

### `HU15-C03` — Durante la congelación el estado es `CONGELADO`

- **Condición pre**: congelación persistida con rango `[cInicio, cFin]`; estado calculado con
  `hoy` en `America/Bogota` (DEC-005) y extremos inclusivos (DEC-006).
- **Disparo**: lectura del estado en cualquier momento dentro del rango congelado
  (`GET /clientes/:clienteId/membresias-gym`, ficha `GET /clientes/:clienteId`, UI).
- **Resultado observable**:
  - `hoy ∈ [cInicio, cFin]` → `estado: "CONGELADO"` en API y badge "Congelado" en la
    sección de membresías de la ficha (y en HU-12: "activa, vencida o congelada").
  - Precedencia: `CONGELADO` **prevalece** sobre `VENCIDA` y sobre `ACTIVA` cuando el rango
    cubre hoy (fixture **F7** del spec INC-02; con DEC-022 este caso es **inalcanzable vía
    API** y se verifica con **fixture directa en BD** como prueba de `calcularEstado`, no del
    endpoint — ajuste #9).
  - Fuera del rango → vuelve al cálculo normal sobre la `fechaFin` ya extendida
    (`PROGRAMADA` / `ACTIVA` / `VENCIDA`).
  - **Expectativa DEC-025 (0 puntos, sin bullet; cierra el abierto #8)**: durante una
    congelación vigente el **CLIENTE conserva el acceso**: (a) el cliente **se autentica con
    sus credenciales (200 con token)** teniendo una vigencia `CONGELADO`; (b) el
    **portal/servicio no deniega nada por el estado `CONGELADO`** — INC-02 no implementa
    ningún bloqueo por congelación y ninguna ruta/función consulta
    `estado === "CONGELADO"` para denegar ingreso ni acceso (verificable con grep de
    `CONGELADO` + login E2E; el portal completo y el bloqueo por vencimiento son
    HU-16/INC-03, y el bloqueo por `INACTIVO` es HU-08/INC-04). **La congelación NO bloquea.**
- **Errores esperados**: 200 con `estado` incluido en el enum; 404 si la vigencia no existe.
- **Qué NO cubre**: el badge/estado en **portal y recepción** (HU-16, INC-03); el cálculo de
  días (C04). ~~El bloqueo de acceso del cliente durante la congelación~~ **ya no es hueco:
  DEC-025 lo resuelve en sentido contrario (conserva el acceso; ver Resultado observable)**.
- **No duplicado**: cierra también el bullet 2 de HU-12 ("activa, vencida o congelada").
  La evidencia es compartida y sancionada por el spec INC-02 (HU-15 2 pts por sus 4 bullets +
  HU-12 b2 1.5); los bullets son distintos y no se cuentan dos veces en la misma HU.
- **Estado**: abierto.

### `HU15-C04` — Extensión automática de `fechaFin` y reglas de rango (DEC-022)

- **Condición pre**: vigencia con `fechaFin` actual (incluye extensiones previas) de tipo
  `GYM`/`PERSONALIZADO`/`NUTRICION` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**:
  DEC-023 enmendada, los 3 tipos son congelables); rango de congelación válido
  (`cInicio ≤ cFin`).
- **Reglas exigidas, en el orden de evaluación fijado por el contrato INC-02**:
  1. `version` del body = versión actual de la vigencia → si no, 409 `MEMBRESIA_CONFLICTO`
     (lock optimista INC00-MEM-03; se evalúa junto a la carga, antes que las reglas de
     negocio);
  2. servicio **dentro de alcance** (`GYM`/`PERSONALIZADO`/`NUTRICION`; **Enmendado
     2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 enmendada, `TIPOS_CONGELABLES` con los
     3) → tipo fuera de `TIPOS_CONGELABLES` rechazado con 409
     `CONGELACION_NO_PERMITIDA` (guarda genérica; pre-DEC-042 el rechazado era
     `NUTRICION`, guard exigido en INC-02);
  3. vigencia **no `VENCIDA`** → si está vencida, 409 `MEMBRESIA_VENCIDA` (confirmado por
     Producto: no se congela una vigencia ya vencida);
  4. rango **contenido** en la vigencia (`vigencia.fechaInicio ≤ cInicio ≤ cFin ≤
     vigencia.fechaFin`) → si no, 409 `CONGELACION_NO_PERMITIDA` (DEC-022 a);
  5. `fechaFin` de la congelación **≥ hoy** (en `America/Bogota`) → si no, **400
     `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"** (**regla post-Zod, ámbito
     de `HU15-C02`**; abierto #6 cerrado); el `fechaInicio` **puede ser retroactivo** mientras
     el rango siga abierto (`cFin ≥ hoy`);
  6. sin solape con otra congelación de la misma vigencia → 409 `MEMBRESIA_SOLAPADA`, y
     después la extensión no debe chocar con un periodo posterior del mismo cliente → 409
     `MEMBRESIA_SOLAPADA` (DEC-008; en este caso **no se congela ni se extiende nada**,
     atómico).
- **Disparo**: congelación aceptada (200).
- **Resultado observable**: `fechaFinNueva = fechaFinActual + N` días calendario, donde
  **N = (cFin − cInicio) + 1** (días completos inclusivos, DEC-005/DEC-006), en
  `America/Bogota`. Se responde con `fechaFinAnterior`, `fechaFin` nueva y `diasCongelados = N`.
- **Fórmula verificable (ejemplos con fechas ilustrativas; los fixtures reales son dinámicos
  relativos a `getTodayBogota()` — spec INC-02, sección "Fixtures")**:
  - Vigencia `2026-01-01..2026-03-31`, congelación `2026-02-01..2026-02-10` → N = 10 →
    `fechaFin = 2026-04-10`.
  - Congelación de 1 día (`cInicio == cFin`) → N = 1 → extiende 1 día.
  - Rango que cruza mes/año `2026-12-25..2027-01-03` (sobre una vigencia que lo contenga,
    p. ej. hasta `2027-01-31`; regla de contención DEC-022) → N = 10 (no se opera sobre
    strings sin calendario).
  - Inicio retroactivo permitido: vigencia `2026-01-01..2026-03-31`, `hoy = 2026-02-05`,
    congelación `2026-01-15..2026-02-10` → 200, N = 27 → `fechaFin = 2026-04-27`.
  - Dos congelaciones consecutivas disjuntas → extiende N1 + N2 **sin duplicar días** (la
    extensión se aplica una única vez por congelación, dentro de la transacción).
- **Errores esperados**: 400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"
  (`fechaFin < hoy`, regla post-Zod, `HU15-C02`); 409 `CONGELACION_NO_PERMITIDA` (rango no
  contenido en la vigencia — DEC-022 a —, **o tipo fuera de `TIPOS_CONGELABLES`** — guarda
  genérica; **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: el literal pre-DEC-042 decía
  "servicio `NUTRICION` — DEC-022/DEC-023"); 409 `MEMBRESIA_VENCIDA`
  (vigencia `VENCIDA` — DEC-022); 409 `MEMBRESIA_CONFLICTO` (`version` desactualizada o
  carrera perdida, patrón lock optimista INC00-MEM-03); 409 `MEMBRESIA_SOLAPADA` (rangos de
  congelación que se cruzan, o extensión que haría solapar la vigencia con un periodo
  **posterior** del mismo cliente, DEC-008 — en ese caso **no se congela ni se extiende nada**
  (atómico)).
- **Qué NO cubre**: renovación de vigencia (DEC-007 / HU-12, crea periodo nuevo); edición
  manual de `fechaFin` (PATCH existente); notificaciones (HU-32/HU-34); HU-16.
- **Estado**: abierto.

### `HU15-C05` — Permisos: `DUENO` y `RECEPCIONISTA` (DEC-017)

- **Condición pre**: sesión interna; preHandler de la ruta.
- **Disparo**: congelación con distintos actores.
- **Resultado observable**: `DUENO` → 200; `RECEPCIONISTA` → 200; ambos quedan como actor
  en la auditoría (C06).
- **Errores esperados**: rol `CLIENTE` → **403 `AUTH_FORBIDDEN`**; sin token →
  **401 `AUTH_TOKEN_MISSING`**; token inválido/expirado → **401 `AUTH_TOKEN_INVALID` /
  `AUTH_TOKEN_EXPIRED`** (convención de `src/plugins/auth.ts:31-61`).
- **Qué NO cubre**: permisos de otros endpoints de membresía; guard de UI (se cubre en
  frontend/E2E del incremento); reglas por propiedad de recurso más allá de "vigencia
  pertenece al `clienteId` de la ruta" (404 si no coincide).
- **Estado**: abierto (regla decidida en DEC-017).

### `HU15-C06` — Auditoría de la operación

- **Condición pre**: congelación aceptada dentro de transacción (patrón INC00-MEM-04).
- **Disparo**: cualquier congelación exitosa.
- **Resultado observable**: registro de auditoría con **actor**, **acción `CONGELACION`**,
  **rango congelado**, **motivo**, **`fechaFinAnterior` → `fechaFinNueva`** y `version`
  incrementada; visible en el historial de cambios de la vigencia (endpoint de listado).
- **Errores esperados**: si la escritura de auditoría falla, la congelación completa revierte
  (no hay 200 sin auditoría).
- **Qué NO cubre**: HU-32 (historial de negocio visible para el usuario autorizado — la
  auditoría técnica no lo sustituye, `mvp.md:57`); auditoría de ediciones/creaciones
  (ya acreditada en INC00-MEM-04).
- **Modelo de datos (fijado 2026-10-08 en el spec INC-02, sección "Modelo de datos
  propuesto"; cierra el abierto #5)**: se **extiende `MembresiaGymCambio`**
  (`prisma/schema.prisma:78-92`) con `motivo String?`, `congelacionInicio String?` y
  `congelacionFin String?` (solo se llenan en filas `accion: "CONGELACION"`), y se agrega
  `tipoServicio String @default("GYM")` a `MembresiaGym`. **No se crea tabla `Congelacion`.**
  La fila `CONGELACION` queda visible en el `cambios` del DTO de `GET`/`PATCH` y de la
  respuesta 200 de la congelación (ajuste #8).
- **Estado**: abierto.

### `HU15-C07` — Descongelar con la regla de días de DEC-024 (**0 puntos HU-15**)

> **0 puntos HU-15** (sin bullet; alcance **DEC-024**, DEC-016: se especifica, prueba y
> revisa igual que el resto). No toca la trazabilidad de `HU15-C01..C06` (ajuste #8).

- **Condición pre**: existe una congelación **vigente** sobre la vigencia del `clienteId` de
  la ruta: la **última** fila de la secuencia de pausa (orden por `version`, única por
  `@@unique([membresiaId, version])`) es `CONGELACION` o `EDICION_CONGELACION` **y**
  `hoy ≤ congelacionFin` (`America/Bogota`). Fixtures del spec INC-02: **F8** (pausa en
  curso), **F9** (pausa futura), **F10** (ya descongelada → no vigente), **F11** (terminada
  por calendario → no vigente), **F1 sin congelar** (nunca congelada → no vigente). Vigencia
  de tipo `GYM`/`PERSONALIZADO`/`NUTRICION` (**Enmendado 2026-10-20 por DEC-042 (INC-05
  C4)**: DEC-023 enmendada; pre-DEC-042 decía `GYM`/`PERSONALIZADO`), **no `VENCIDA`**, con
  la `version` actual enviada en el body.
- **Disparo**: `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar` (**sin prefijo
  `/api`**; preHandler `["DUENO", "RECEPCIONISTA"]`, DEC-017; ownership → 404 `NOT_FOUND`
  idéntico al de congelar) con body **`{ version }` + `motivo` opcional**.
- **Fórmula obligatoria (DEC-024, copia del spec INC-02)**:

  ```text
  diasDevueltos = max(0, finRango − max(hoy, inicioRango) + 1)
  fechaFin'     = fechaFin − diasDevueltos
  ```

  (ver la sección **"Regla de días de la ampliación (DEC-024) — fórmula verificable"**, con
  los tres estados de la pausa y los casos límite F8..F11).
- **Resultado observable**: **200** con la vigencia del DTO `toDTO` extendido: `fechaFin'`
  (= `fechaFin − diasDevueltos`), `fechaFinAnterior`, **`diasDevueltos`** (= restantes), el
  `estado` **recalculado sin pausa vigente** (deja de aplicar `CONGELADO`; p. ej. `ACTIVA`),
  `version` N → N+1, `cambios` con la fila **`DESCONGELACION`** recién escrita (actor, rango
  de la pausa revertido, `motivo?`, `fechaFinAnterior → fechaFinNueva`) y
  **`congelacion: null`**. Los días **ya consumidos (`N − diasDevueltos`) permanecen
  descontados** en `fechaFin` (DEC-024); `diasDevueltos` se deriva de la fila
  (`fechaFinAnterior − fechaFinNueva`), sin columna nueva.
- **Errores esperados** (orden determinista, ajuste #4): 401/403 → 400 Zod (`version`;
  `motivo` **si viaja**; sin regla post-Zod de fechas) → 404 → 409: **1.**
  `MEMBRESIA_CONFLICTO` → **2.** `CONGELACION_NO_PERMITIDA` (tipo; guarda genérica — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: `NUTRICION` ya no cae aquí, los 3 tipos son congelables) → **3.**
  `MEMBRESIA_VENCIDA` → **4. `CONGELACION_INEXISTENTE`** con mensaje exacto
  `No hay una congelación vigente en esta membresía` (nunca se congeló / ya se descongeló /
  `hoy > congelacionFin`). **`MEMBRESIA_SOLAPADA` no aplica** (decrementar `fechaFin` nunca
  crea un solape, DEC-008).
- **Qué NO cubre**: el cálculo de la extensión al congelar (C04); la edición del rango (C08);
  el estado `CONGELADO` (C03); permisos más allá de C05 (mismo preHandler); el bloqueo de
  acceso del cliente (**DEC-025: conserva el acceso**, expectativa en C03); HU-16 (badge en
  portal/recepción) y renovación (DEC-007 / HU-12). **0 puntos HU-15.**
- **Partición de equivalencia**:

  | Campo / condición | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
  |---|---|---|---|---|
  | Estado de la pausa | Vigente en curso → 200; vigente futura → 200 | F8, F9 | No vigente: nunca congelada / descongelada / terminada → 409 `CONGELACION_INEXISTENTE` | F1, F10, F11 |
  | `hoy` vs rango (fórmula) | `hoy < inicio` → devuelve N completo; `inicio ≤ hoy ≤ fin` → devuelve `fin − hoy + 1` (≥ 1) | `hoy + 5` (F9); `hoy` (F8) | `hoy > fin` → `diasDevueltos = 0` → 409 | `hoy = congelacionFin + 1` (F11) |
  | `version` | Entero positivo **= versión actual** | `2` (F8) | Ausente / no entero / no positivo → 400; ≠ actual → 409 `MEMBRESIA_CONFLICTO` | ausente, `1.5`, `0` (400); `99` (409) |
  | `motivo` (opcional) | Ausente → 200 (`motivo: null` en la fila); 1-500 no vacío → 200 y se persiste | sin campo; `"Retorno anticipado"` | Presente y `""`/solo espacios → 400 "Motivo es requerido"; >500 → 400 "…exceder 500 caracteres" | `""`, `"   "`, 501 caracteres |
  | Rol actor | `DUENO`, `RECEPCIONISTA` | `DUENO` | `CLIENTE` → 403; sin/expirado → 401 | `CLIENTE` |
  | `vigenciaId` | Existe y pertenece al `clienteId` | id válido | Inexistente o de otro cliente → 404 | `uid-xxx` |
  | `tipoServicio` | `GYM`, `PERSONALIZADO`, `NUTRICION` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 enmendada; antes solo `GYM`/`PERSONALIZADO`) | `GYM` | Tipo fuera de `TIPOS_CONGELABLES` → 409 `CONGELACION_NO_PERMITIDA` (guarda genérica; antes: `NUTRICION` → 409) | F3 → 200 (enmendado); tipo extraño al set → 409 |
  | Estado de la vigencia | `ACTIVA`, `PROGRAMADA` | `ACTIVA` | `VENCIDA` → 409 `MEMBRESIA_VENCIDA` | F4 |
- **Valores límite**:

  | Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
  |---|---|---|---|---|---|
  | `diasDevueltos` (resultado 200) | num | **1** (`hoy = congelacionFin`) | **N** completo (pausa futura; 10 en F9) | **0 → 409 `CONGELACION_INEXISTENTE`** (`hoy = congelacionFin + 1`, límite duro) | nunca > N (`restantes ≤ N` por construcción) |
  | `hoy` vs `congelacionFin` | fecha | `hoy < inicioRango` (N completo) | `hoy = congelacionFin` (queda 1 día) | `hoy = congelacionFin − 1` → 2 días | `hoy = congelacionFin + 1` → 0 → 409 (F11) |
  | `version` | int | = versión actual | = versión actual | `0`/negativo/decimal/ausente → 400 | ≠ actual → 409 `MEMBRESIA_CONFLICTO` |
  | `motivo` (si viaja) | string | 1 | 500 | 0 (`""`/`"   "`) → 400 | 501 → 400 |
- **Cobertura de ramas** (ruta `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar`,
  sin prefijo `/api`, ajuste #1):

  | # | Escenario | Input | Resultado Esperado |
  |---|-----------|-------|-------------------|
  | D1 | Happy path: pausa en curso (F8) | vigencia congelada `hoy-2..hoy+7` (N = 10, `fechaFin = hoy+40`, version 2); body `{ version: 2 }`; `hoy` dentro del rango | 200; `diasDevueltos = 8`; `fechaFin = hoy+32`; `fechaFinAnterior = hoy+40`; version → 3; fila `DESCONGELACION` en `cambios`; `congelacion: null`; `estado: "ACTIVA"`; los 2 días consumidos permanecen descontados |
  | D2 | Rol RECEPCIONISTA | idem D1 con rol RECEPCIONISTA | 200 (DEC-017) |
  | D3 | Pausa futura devuelve N completo (F9, caso límite 1) | congelada `hoy+5..hoy+14` (N = 10, `fechaFin = hoy+40`) | 200; `diasDevueltos = 10`; `fechaFin = hoy+30` (extensión completa revertida) |
  | D4 | Pausa terminada por calendario (F11, caso límite 3) | fila `CONGELACION [hoy-20, hoy-10]` (N = 11) creada directa en BD | 409 `CONGELACION_INEXISTENTE`, mensaje `No hay una congelación vigente en esta membresía`; sin cambios |
  | D5 | Doble descongelar con la version correcta (F10, caso límite 4) | tras un 200 previo, nueva petición con la `version` actual | 409 `CONGELACION_INEXISTENTE` |
  | D6 | Doble descongelar sin recargar la version (F10) | tras un 200 previo, body con la `version` anterior | 409 `MEMBRESIA_CONFLICTO` (se evalúa antes) |
  | D7 | Nunca congelada (F1 sin congelar) | vigencia sin ninguna fila de pausa | 409 `CONGELACION_INEXISTENTE` |
  | D8 | `version` ausente / no entera / no positiva | sin campo, `1.5`, `0`, `-1` | 400 `VALIDATION_ERROR` (los 3 mensajes de `version`) |
  | D9 | `motivo` presente inválido | `""`, `"   "`, 501 caracteres | 400 "Motivo es requerido" / "Motivo no puede exceder 500 caracteres" |
  | D10 | `motivo` ausente (opcional) | body `{ version }` | **200**; fila `DESCONGELACION` con `motivo: null` |
  | D11 | `motivo` válido | `"Retorno anticipado"` | 200; motivo persistido en la fila `DESCONGELACION` |
  | D12 | Ownership | `vigenciaId` inexistente o de otro cliente | 404 `NOT_FOUND` |
  | D13 | Autenticación | sin token / inválido / expirado | 401 `AUTH_TOKEN_MISSING` / `INVALID` / `EXPIRED` |
  | D14 | Rol no autorizado | token de `CLIENTE` | 403 `AUTH_FORBIDDEN` |
  | D15 | Servicio fuera de `TIPOS_CONGELABLES` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: antes "Servicio fuera de alcance" = `NUTRICION` → 409) | vigencia con tipo **extraño al set** creada directa en BD (p. ej. `OTRO`) con fila de pausa directa en BD y `version` actual; en regresión, `NUTRICION` (F3) ahora → **200** | 409 `CONGELACION_NO_PERMITIDA` (guarda genérica) |
  | D16 | Vigencia vencida | `hoy > fechaFin` (F4) | 409 `MEMBRESIA_VENCIDA` |
  | D17 | Orden de 409: la `version` gana | `version` desactualizada **y** pausa no vigente | 409 `MEMBRESIA_CONFLICTO` (no `CONGELACION_INEXISTENTE`) |
  | D18 | Concurrencia | dos `descongelar` simultáneos con la misma `version` | exactamente una 200; la otra 409 `MEMBRESIA_CONFLICTO` |
  | D19 | Sin rama de solape | cualquier descongelación válida | **nunca** 409 `MEMBRESIA_SOLAPADA` (la operación solo decrementa `fechaFin`) |
  | D20 | Auditoría | tras D1 | fila `DESCONGELACION` con actor, rango de la pausa, `motivo?`, `fechaFinAnterior → fechaFinNueva` y `version` + 1 visibles en `cambios` |
- **Trazabilidad**: spec `INC-02-congelacion-hu-15/spec.md` → secciones **"Descongelar"**,
  **"Regla de dias de la ampliacion (DEC-024) - formula verificable"**, **"Fixtures"
  (F8..F11)** y **"Ajustes pendientes de criterios (ampliacion DEC-024)" #1-#5, #7, #8**;
  decisión **DEC-024** (0 puntos, DEC-016); cierra el **abierto #7**; ID provisional de spec
  `INC02-CON-07`. Pruebas esperadas (RED/GREEN): unitarias de `diasDevueltos` sobre los
  **tres estados** de la pausa, integración de la ruta (400/401/403/404/409 + orden D17),
  Gherkin de la tabla D. Schemas: `descongelarParamsSchema`, `descongelarSchema`,
  `descongelarResponseSchema` en `HU-15-schemas.ts`.
- **Estado**: **ABIERTO** (RED/GREEN pendientes; **0 puntos HU-15**).

### `HU15-C08` — Editar congelación: revertir `N_anterior` y aplicar `N_nuevo` (**0 puntos HU-15**)

> **0 puntos HU-15** (sin bullet; alcance **DEC-024**, DEC-016). No toca la trazabilidad de
> `HU15-C01..C06` (ajuste #8).

- **Condición pre**: mismo guard de "congelación vigente" que `HU15-C07` (última fila de la
  secuencia de pausa `CONGELACION`/`EDICION_CONGELACION` con `hoy ≤ congelacionFin`; fixtures
  **F8**, **F9**, **F10**, **F11**, **F1 sin congelar**), vigencia
  `GYM`/`PERSONALIZADO`/`NUTRICION` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**:
  DEC-023 enmendada; pre-DEC-042 decía `GYM`/`PERSONALIZADO`) no
  `VENCIDA`, con la `version` actual en el body.
- **Disparo**: `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion` (**sin prefijo
  `/api`**; preHandler `["DUENO", "RECEPCIONISTA"]`, DEC-017; ownership → 404; recurso único
  por vigencia → sin `congelacionId`) con body **`{ fechaInicio, fechaFin, motivo, version }`
  — los 4 requeridos** (reutiliza `createCongelacionSchema`: mismos mensajes + regla post-Zod
  `fechaFin ≥ hoy` → 400 `Fecha fin no puede ser anterior a hoy`).
- **Fórmula obligatoria (DEC-024, copia del spec INC-02)**:

  ```text
  N_anterior = diasInclusivos(pausaInicio, pausaFin)   // (fin − inicio) + 1
  N_nuevo    = diasInclusivos(rangoNuevoInicio, rangoNuevoFin)
  fechaFin'  = fechaFin − N_anterior + N_nuevo
  ```

  Aplicando **las mismas validaciones que congelar** sobre la **fila revertida**
  `fechaFin − N_anterior` (en memoria, antes de validar): rango nuevo **contenido** en
  `[fechaInicio, fechaFin − N_anterior]`, sin solape con **otra** pausa y nueva `fechaFin` sin
  choque con periodo posterior; después se escribe la fila `EDICION_CONGELACION` y se aplica
  `N_nuevo`.
- **Resultado observable**: **200** con `fechaFin'`, `fechaFinAnterior`,
  **`diasCongelados = N_nuevo`**, **`diasCongeladosAnterior = N_anterior`** (para que la UI y
  los criterios verifiquen la diferencia sin reconstruir la fila previa), `estado` calculado
  con el **rango nuevo** (p. ej. `CONGELADO` si `hoy` queda dentro), `congelacion` con el
  rango **editado**, `version` N → N+1 y `cambios` con la fila **`EDICION_CONGELACION`**
  (actor, motivo, rango nuevo, `fechaFinAnterior → fechaFinNueva`). **Rango idéntico
  (`N' = N`) → igualmente 200**: `fechaFin` sin cambio, escribe auditoría y `version` + 1 (no
  existe código de "sin cambios" en `RESPUESTAS_ERROR`).
- **Errores esperados** (orden determinista, ajuste #4): 401/403 → 400 Zod (los 8 de
  congelar) y **después** la regla post-Zod `fechaFin ≥ hoy` → 404 → 409: **1.**
  `MEMBRESIA_CONFLICTO` → **2.** `CONGELACION_NO_PERMITIDA` (tipo) → **3.**
  `MEMBRESIA_VENCIDA` → **4. `CONGELACION_INEXISTENTE`** (mensaje `No hay una congelación
  vigente en esta membresía`) → **5.** `CONGELACION_NO_PERMITIDA` (rango nuevo no contenido
  en la fila **revertida**) → **6.** `MEMBRESIA_SOLAPADA` (solape con otra pausa) → **7.**
  `MEMBRESIA_SOLAPADA` (choque de la nueva `fechaFin` con periodo posterior; atómico, no se
  edita nada).
- **Qué NO cubre**: congelar (C04) y descongelar (C07); la auditoría base (C06; aquí solo se
  agrega la acción nueva); edición manual de la vigencia (PATCH existente, INC00-MEM-03);
  renovación (DEC-007 / HU-12); HU-16; el bloqueo de acceso (**DEC-025 conserva el acceso**).
  **0 puntos HU-15.**
- **Partición de equivalencia**:

  | Campo / condición | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
  |---|---|---|---|---|
  | Pausa vigente | Última fila `CONGELACION`/`EDICION_CONGELACION` y `hoy ≤ congelacionFin` → evaluar | F8, F9 | Nunca congelada / descongelada / terminada → 409 `CONGELACION_INEXISTENTE` | F1, F10, F11 |
  | Rango nuevo vs fila revertida | `[fechaInicio, fechaFin − N_anterior]` lo contiene → evaluar | `hoy-2..hoy+17` sobre `hoy-30..hoy+30` | No contenido → 409 `CONGELACION_NO_PERMITIDA` | `hoy-2..hoy+40` (finRev = `hoy+30`) |
  | `fechaFin` del rango nuevo | ≥ hoy (`America/Bogota`) y ≥ `fechaInicio` | `hoy + 1` | < hoy → 400 post-Zod; < inicio → 400 | `hoy - 2` (400 post-Zod); invertido (400) |
  | `N_nuevo` vs `N_anterior` | `N' > N` (extiende), `N' < N` (retracta), `N' = N` → **200 en los tres** | 20 / 2 / 10 sobre N = 10 | Solape con otra pausa o choque con periodo posterior → 409 `MEMBRESIA_SOLAPADA` | F6, F5 |
  | `motivo` | **Requerido**, 1-500 no vacío | `"Cambio de viaje"` | Ausente/vacío/solo espacios → 400; >500 → 400 | `""`, 501 caracteres |
  | `version` | Entero positivo = versión actual | `2` | Malformada → 400; ≠ actual → 409 `MEMBRESIA_CONFLICTO` | `0` (400); `99` (409) |
  | Rol / ownership / tipo / estado de la vigencia | igual que `HU15-C07` | `DUENO` | 401/403/404; tipo fuera de `TIPOS_CONGELABLES` → 409 (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: pre-DEC-042 era `NUTRICION` → 409); `VENCIDA` → 409 | F3 → 200 (enmendado), F4 |
- **Valores límite**:

  | Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
  |---|---|---|---|---|---|
  | `N_nuevo` (días del rango nuevo) | num | 1 (`inicio == fin`) | duración de la fila revertida | 0 → no existe: `fin < inicio` = 400 | un día más allá de `fechaFin − N_anterior` → 409 `CONGELACION_NO_PERMITIDA` |
  | `fechaFin` del rango nuevo | fecha | **hoy** (post-Zod) | `fechaFin − N_anterior` (fila revertida) | ayer → **400** "Fecha fin no puede ser anterior a hoy" | ya cubierto por "no contenido" → 409 |
  | `fechaInicio` del rango nuevo | fecha | `fechaInicio` de la vigencia | `fechaFin` del rango nuevo | antes del inicio de la vigencia → 409 | cae en `fin < inicio` (400) |
  | `N' − N` (efecto en `fechaFin`) | int | negativo → retracta | — | **`0` → rango idéntico → 200** (caso límite 7) | positivo → extiende; si choca con periodo posterior → 409 `MEMBRESIA_SOLAPADA` |
  | `version` / `motivo` | int / string | igual que congelar | igual que congelar | 400 | 409 (`version` ≠ actual) |
- **Cobertura de ramas** (ruta `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion`,
  sin prefijo `/api`, ajuste #1):

  | # | Escenario | Input | Resultado Esperado |
  |---|-----------|-------|-------------------|
  | E1 | Happy path: editar en curso (F8) | pausa `hoy-2..hoy+7` (N = 10, `fechaFin = hoy+40`, version 2); nuevo rango `hoy-2..hoy+17` (N' = 20), motivo `Cambio de viaje`, version 2 | 200; `fechaFin = hoy+50` (`hoy+40 − 10 + 20`); `diasCongelados = 20`; `diasCongeladosAnterior = 10`; `estado: "CONGELADO"`; version → 3; fila `EDICION_CONGELACION`; `congelacion` con el rango nuevo |
  | E2 | Rol RECEPCIONISTA | idem E1 con rol RECEPCIONISTA | 200 (DEC-017) |
  | E3 | Editar antes de consumir días (F9, caso límite 5) | pausa futura `hoy+5..hoy+14` (N = 10, `fechaFin = hoy+40`); nuevo rango `hoy+5..hoy+24` (N' = 20) | 200; `fechaFin = hoy+50` (se revierten los 10 completos); `diasCongeladosAnterior = 10`; `estado: "ACTIVA"` (rango futuro: `hoy` no está dentro) |
  | E4 | Editar después de consumir días (F8, caso límite 6) | pausa `hoy-2..hoy+7` (N = 10, `fechaFin = hoy+40`), `hoy` dentro del rango; nuevo rango `hoy..hoy+1` (N' = 2) | 200; `fechaFin = hoy+32` (`hoy+40 − 10 + 2`); `diasCongelados = 2`; **no es bug** (los N completos se revierten aunque `hoy` esté en el rango) |
  | E5 | Rango idéntico (caso límite 7) | F8; editar al mismo rango `hoy-2..hoy+7` (N' = N = 10) | **200**; `fechaFin` **sin cambio** (`hoy+40`); `diasCongelados = diasCongeladosAnterior = 10`; version → 3; fila `EDICION_CONGELACION` escrita |
  | E6 | Nunca congelada (F1 sin congelar) | body válido con la `version` actual | 409 `CONGELACION_INEXISTENTE` |
  | E7 | Ya descongelada (F10) | tras un `descongelar` 200 | 409 `CONGELACION_INEXISTENTE` |
  | E8 | Pausa terminada (F11) | fila `[hoy-20, hoy-10]` (N = 11) | 409 `CONGELACION_INEXISTENTE` |
  | E9 | 400 por campo (8 ramas) | `fechaInicio`/`fechaFin` ausentes; `motivo` ausente/`""`/`"   "`/501; formato o calendario inválido; `fin < inicio`; `version` ausente/`1.5`/`0` | 400 `VALIDATION_ERROR` con los **mismos mensajes que congelar** |
  | E10 | 400 post-Zod | nuevo `fechaFin < hoy` (`hoy-5..hoy-2`) | 400 "Fecha fin no puede ser anterior a hoy" |
  | E11 | Ownership | `vigenciaId` inexistente o de otro cliente | 404 `NOT_FOUND` |
  | E12 | Autenticación / rol | sin token / token inválido / `CLIENTE` | 401 `AUTH_TOKEN_*` / 403 `AUTH_FORBIDDEN` |
  | E13 | `version` desactualizada | `version` ≠ actual (tras otra operación) | 409 `MEMBRESIA_CONFLICTO` (primer 409 del orden) |
  | E14 | Servicio fuera de `TIPOS_CONGELABLES` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: antes = `NUTRICION` → 409) | tipo extraño al set (p. ej. `OTRO`) con pausa vigente creada directa en BD; en regresión `NUTRICION` (F3 + fila directa) ahora → **200** | 409 `CONGELACION_NO_PERMITIDA` (guarda genérica) |
  | E15 | Vigencia vencida | `hoy > fechaFin` (F4) | 409 `MEMBRESIA_VENCIDA` |
  | E16 | Rango nuevo no contenido en la fila revertida | `hoy-2..hoy+40` con `fechaFin − N = hoy+30` | 409 `CONGELACION_NO_PERMITIDA` ("El rango de congelación debe estar dentro de la vigencia") |
  | E17 | Solape con otra pausa (F6) | dos pausas disjuntas; editar la vigente a un rango que cruce la otra | 409 `MEMBRESIA_SOLAPADA` ("Las fechas se solapan con un período existente") |
  | E18 | Choque de la nueva `fechaFin` con periodo posterior (F5) | `fechaFin − N_anterior + N_nuevo` alcanza el periodo siguiente del cliente | 409 `MEMBRESIA_SOLAPADA`; **no se edita nada** (atómico) |
  | E19 | Concurrencia | dos ediciones con la misma `version` | exactamente una 200; la otra 409 `MEMBRESIA_CONFLICTO` |
  | E20 | Auditoría | tras E1 | fila `EDICION_CONGELACION` con actor, motivo, rango nuevo, `fechaFinAnterior → fechaFinNueva` y `version` + 1 visibles en `cambios` |
- **Trazabilidad**: spec `INC-02-congelacion-hu-15/spec.md` → secciones **"Editar
  congelacion"**, **"Regla de dias de la ampliacion (DEC-024) - formula verificable"**,
  **"Fixtures" (F8..F11)** y **"Ajustes pendientes de criterios (ampliacion DEC-024)"
  #1-#5, #7, #8**; decisión **DEC-024** (0 puntos, DEC-016); cierra el **abierto #7**; ID
  provisional de spec `INC02-CON-08`. Pruebas esperadas (RED/GREEN): unitarias de
  `fechaFin − N_anterior + N_nuevo` (antes/después de consumir, rango idéntico),
  integración de la ruta (los 8×400, el orden de 409 incluida la fila revertida, E16-E18),
  Gherkin de la tabla E. Schemas: `editarCongelarParamsSchema`, `updateCongelacionSchema`,
  `editarCongelacionResponseSchema` en `HU-15-schemas.ts`.
- **Estado**: **ABIERTO** (RED/GREEN pendientes; **0 puntos HU-15**).

## Regla de días de la ampliación (DEC-024) — fórmula verificable

> **Obligatoria en `HU15-C07` y `HU15-C08`**: copia literal de la sección "Regla de dias de
> la ampliacion (DEC-024) - formula verificable" de `INC-02/spec.md`. Fuentes:
> `hoy = getTodayBogota()` (`America/Bogota`, DEC-005); días completos inclusivos (DEC-006).
> Toda la aritmética es sobre **fechas de calendario**, nunca sobre strings.

```text
diasDevueltos = max(0, finRango − max(hoy, inicioRango) + 1)   // descongelar (restantes)
fechaFin'     = fechaFin − diasDevueltos

N_anterior = diasInclusivos(pausaInicio, pausaFin)             // (fin − inicio) + 1
N_nuevo    = diasInclusivos(rangoNuevoInicio, rangoNuevoFin)
fechaFin'  = fechaFin − N_anterior + N_nuevo                   // editar
             // validando ANTES, sobre la fila revertida fechaFin − N_anterior,
             // las MISMAS reglas que congelar (contención, solapes,
             // y post-Zod fechaFin >= hoy -> 400)
```

**"Congelación vigente"** = la **última** fila de la secuencia de pausa de la vigencia
(orden por `version`, única por `@@unique([membresiaId, version])`) es `CONGELACION` o
`EDICION_CONGELACION` **y** `hoy ≤ congelacionFin`. Si la última fila es `DESCONGELACION`,
o `hoy > congelacionFin`, **no hay congelación vigente** → **409 `CONGELACION_INEXISTENTE`**
(para descongelar y para editar).

| Estado de la pausa | Condición | `diasDevueltos` | Efecto / respuesta |
|---|---|---|---|
| Futura | `hoy < inicioRango` | `finRango − inicioRango + 1 = N` | `200`: devuelve la **extensión completa** (`fechaFin − N`) |
| En curso | `inicioRango ≤ hoy ≤ finRango` | `finRango − hoy + 1` | `200`: fórmula literal DEC-024; los `N − diasDevueltos` consumidos **permanecen descontados** |
| Terminada | `hoy > finRango` | `0` | **`409 CONGELACION_INEXISTENTE`** (un 200 sin cambios confundiría a la UI) |

> Esta generalización (`max(hoy, inicioRango)`) es la única lectura que permite **cancelar una
> pausa futura** sin corromper `fechaFin`: la fórmula literal `fin − hoy + 1` aplicada a una
> pausa futura restaría más de N. No cambia la regla de DEC-024, la vuelve total sobre los
> tres estados. **Ambigüedad de ratificación** (reportada al orquestador, no es un abierto de
> alcance): el spec advierte que conviene confirmar con Producto que la fórmula generalizada
> cubre también la pausa futura; mientras tanto, los casos 1-3 de la tabla de arriba son los
> valores que fija el RED.

### Casos límite (fijos para el RED; fixtures F8..F11, fechas dinámicas relativas a hoy)

| # | Caso | Condición | Efecto en `fechaFin` / días | Respuesta | Fixture |
|---|---|---|---|---|---|
| 1 | Pausa futura (`hoy < inicio`) | todos los días están por transcurrir | `diasDevueltos = N` → `fechaFin − N`; F9: `hoy+40 − 10 = hoy+30` | `200` | F9 |
| 2 | Pausa en curso (`inicio ≤ hoy ≤ fin`) | fórmula literal DEC-024 | F8: `(hoy+7) − hoy + 1 = 8` → `hoy+40 − 8 = hoy+32`; consumidos = 2 permanecen | `200` | F8 |
| 3 | Pausa ya terminada (`hoy > fin`) | `restantes = max(0, …) = 0` | ninguno | **`409 CONGELACION_INEXISTENTE`** | F11 |
| 4 | Doble descongelar | tras la 1ª, la última fila es `DESCONGELACION` | ninguno | `409 MEMBRESIA_CONFLICTO` si no se recarga la `version`; **`409 CONGELACION_INEXISTENTE`** con la `version` correcta | F10 |
| 5 | Editar antes de consumir días (pausa futura) | la extensión se aplicó por adelantado al congelar | `fechaFin − N_anterior + N_nuevo` (revierten los N completos); F9 → `hoy+5..hoy+24`: `hoy+40 − 10 + 20 = hoy+50` | `200` | F9 |
| 6 | Editar después de consumir días (pausa en curso) | se revierten los `N_anterior` **completos** aunque `hoy` esté en el rango | F8 → `hoy..hoy+1` (N' = 2): `hoy+40 − 10 + 2 = hoy+32` | `200` (o `400` si el nuevo `fechaFin < hoy`) | F8 |
| 7 | Editar al mismo rango | `N' = N` | `fechaFin` sin cambio; escribe auditoría y `version` + 1 | **`200`** | F8 |

> Los días consumidos **solo se descuentan en descongelar** (DEC-024); **editar** siempre
> recalcula por **diferencia completa** (DEC-024). `test-engineer` fija estos valores numéricos
> en el RED para que un "arreglo" posterior no altere la fórmula.

## Partición de Equivalencia

| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| fechaInicio | Fecha real `YYYY-MM-DD` dentro de la vigencia; **retroactiva permitida** si `fechaFin ≥ hoy` (DEC-022) | `2026-02-01`, `2026-01-15` (retroactivo) | Formato/calendario → 400; fuera de la vigencia → 409 `CONGELACION_NO_PERMITIDA` | `01/02/2026`, `2026-02-30` (400); `2025-12-31` (409) |
| fechaFin | Fecha real `YYYY-MM-DD` ≥ inicio, **≥ hoy** (`America/Bogota`) y dentro de la vigencia (DEC-022) | `2026-02-10` | Formato/calendario o **anterior a hoy → 400 `VALIDATION_ERROR`**; fuera de la vigencia → 409 `CONGELACION_NO_PERMITIDA` | `2026-01-10` con `hoy = 2026-02-05` (400); `2026-01-31` < inicio (400); `2026-07-01` (409) |
| motivo | Texto 1-500 no vacío tras trim | `Viaje de trabajo` | Vacío, solo espacios, >500 | `""`, `"   "`, 501 caracteres |
| version (lock optimista, INC00-MEM-03) | Entero positivo **igual a la `version` actual de la vigencia** | `1` (fixture F1) | Ausente / no entero / no positivo → 400; entero ≠ versión actual → 409 `MEMBRESIA_CONFLICTO` | ausente, `0`, `-1`, `1.5` (400); `99` (409) |
| vigenciaId | Existe y pertenece al `clienteId` de la ruta | `uid-vig-1` | Inexistente o de otro cliente | `uid-xxx` |
| estado de la vigencia | `ACTIVA`, `PROGRAMADA` | `ACTIVA` | `VENCIDA` → 409 `MEMBRESIA_VENCIDA` (DEC-022) | `VENCIDA` |
| tipoServicio (alcance de congelación) | `GYM`, `PERSONALIZADO`, `NUTRICION` (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 enmendada; antes solo `GYM`/`PERSONALIZADO`) | `NUTRICION` | Tipo fuera de `TIPOS_CONGELABLES` → 409 `CONGELACION_NO_PERMITIDA` (guarda genérica; antes: `NUTRICION` → 409, guard exigido en INC-02) | valor extraño al enum con fixture directa en BD (p. ej. `OTRO`) |
| tipoServicio (respuesta de la vigencia) | `GYM`, `PERSONALIZADO`, `NUTRICION` (enum del modelo, DEC-004) | `GYM` | — | - |
| rol actor | `DUENO`, `RECEPCIONISTA` | `DUENO` | `CLIENTE`, sin/expirado token | `CLIENTE` |
| rango vs otras congelaciones | Disjunto o con gap | `[02-01..02-10]` y `[02-12..02-15]` | Solapado | `[02-01..02-10]` y `[02-09..02-12]` |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| días de rango (inclusivo) | num | 1 (`cInicio == cFin`) | duración de la vigencia | 0 → no existe: `fin < inicio` = 400 | un día más allá de `fechaFin` de la vigencia → 409 `CONGELACION_NO_PERMITIDA` |
| fechaFin de la congelación | fecha | **hoy** (`America/Bogota`, DEC-022) | `fechaFin` de la vigencia | ayer → **400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"** (regla post-Zod; ajuste #7) | ya cubierto por "un día más allá de la vigencia" → 409 `CONGELACION_NO_PERMITIDA` |
| fechaInicio de la congelación | fecha | `fechaInicio` de la vigencia (retroactivo hasta ahí; **< hoy permitido** si `fechaFin ≥ hoy`, DEC-022) | `fechaFin` de la congelación | antes del inicio de la vigencia → 409 `CONGELACION_NO_PERMITIDA` | → cae en `fin < inicio` (400) o rango no contenido (409) |
| version (lock optimista) | int | 1 (positiva; = versión actual de la vigencia) | versión actual de la vigencia | 0 / negativo / decimal / ausente → 400 (`Versión debe ser positiva` / `… un entero` / `… requerida`) | versión distinta de la actual → 409 `MEMBRESIA_CONFLICTO` |
| motivo (longitud) | string | 1 | 500 | 0 (`""` o `"   "`) → 400 | 501 → 400 |
| días congelados N → extensión | num | 1 → `fechaFin + 1` | N = días de la vigencia | - | N que genera solape con periodo posterior → 409 `MEMBRESIA_SOLAPADA` |
| fecha (formato) | string | `0001-01-01` (calendario real) | `9999-12-31` | `""`, `2026-2-1`, `2026-13-01`, `2026-02-30` → 400 | - |
| congelaciones consecutivas | num | 2 disjuntas → N1+N2 | ∞ | 2 solapadas → 409 `MEMBRESIA_SOLAPADA` | - |

## Tabla de Decisiones

### A. Aceptar o rechazar congelación (`POST /clientes/:clienteId/vigencias/:vigenciaId/congelar`)

Orden de evaluación (fijado en el contrato INC-02): 401/403 → 400 (schema Zod y después la
regla post-Zod `fechaFin ≥ hoy`) → 404 → 409: `version` (`MEMBRESIA_CONFLICTO`) → tipo
fuera de `TIPOS_CONGELABLES` (pre-DEC-042: `NUTRICION`; **Enmendado 2026-10-20 por DEC-042
(INC-05 C4)**) → `VENCIDA` → rango no contenido → solape con otra congelación → choque con
periodo posterior. Columnas = requisitos que deben cumplirse, en ese orden; `*` = no aplica.

| Rol autorizado | Body Zod válido (incl. `version`) | `fechaFin ≥ hoy` (post-Zod) | Vigencia existe (y del cliente) | `version` vigente (INC00-MEM-03) | Tipo congelable (DEC-023 enmendada por DEC-042: los 3 tipos) | Vigencia no `VENCIDA` (DEC-022) | Rango ⊆ vigencia (DEC-022) | Sin solape de congelaciones | Extensión sin chocar con periodo posterior | Acción |
|---|---|---|---|---|---|---|---|---|---|---|
| true | true | true | true | true | true | true | true | true | true | **200**: `CONGELADO` + `fechaFin` extendida + `version` N→N+1 + auditoría |
| false (CLIENTE) | * | * | * | * | * | * | * | * | * | 403 `AUTH_FORBIDDEN` |
| sin/expirado token | * | * | * | * | * | * | * | * | * | 401 `AUTH_TOKEN_*` |
| true | false | * | * | * | * | * | * | * | * | 400 `VALIDATION_ERROR` |
| true | true | false (`fechaFin < hoy`) | * | * | * | * | * | * | * | 400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy" (ajuste #7) |
| true | true | true | false | * | * | * | * | * | * | 404 `NOT_FOUND` |
| true | true | true | true | false (desactualizada) | * | * | * | * | * | 409 `MEMBRESIA_CONFLICTO` |
| true | true | true | true | true | false (tipo fuera de `TIPOS_CONGELABLES`; **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: antes `NUTRICION`) | * | * | * | * | 409 `CONGELACION_NO_PERMITIDA` (guarda genérica; guard exigido en INC-02 con el alcance pre-DEC-042) |
| true | true | true | true | true | true | false (`VENCIDA`) | * | * | * | 409 `MEMBRESIA_VENCIDA` (DEC-022) |
| true | true | true | true | true | true | true | false | * | * | 409 `CONGELACION_NO_PERMITIDA` (rango no contenido) |
| true | true | true | true | true | true | true | true | false | * | 409 `MEMBRESIA_SOLAPADA` |
| true | true | true | true | true | true | true | true | true | false | 409 `MEMBRESIA_SOLAPADA` (sin cambios: atómico) |

> El `fechaInicio` retroactivo con `fechaFin ≥ hoy` y rango contenido **sí** es válido → 200
> (fila 1); solo el tiempo ya consumido (`fechaFin < hoy`) cae en la fila 5 (400).

### B. Cálculo del estado de la vigencia (`calcularEstado` extendido)

| Hoy ∈ rango congelado | Hoy < fechaInicio | Hoy > fechaFin (actual) | Estado |
|---|---|---|---|
| true | * | * | **CONGELADO** (prevalece) |
| false | true | * | PROGRAMADA |
| false | false | false | ACTIVA |
| false | false | true | VENCIDA |

> `hoy` se evalúa en `America/Bogota` con extremos inclusivos (DEC-005/DEC-006).

### C. Aceptar o rechazar descongelación (`POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar`) — ampliación DEC-024, **0 puntos**

Orden de evaluación (fijado en el spec INC-02, sección "Descongelar"): 401/403 → 400 Zod
(`version`; `motivo` si viaja; **sin post-Zod de fechas**) → 404 → 409: `MEMBRESIA_CONFLICTO`
→ `CONGELACION_NO_PERMITIDA` (tipo) → `MEMBRESIA_VENCIDA` → **`CONGELACION_INEXISTENTE`**.
**`MEMBRESIA_SOLAPADA` no se evalúa** (decrementar nunca crea solape). `*` = no aplica.

| Rol autorizado | Body Zod válido (`version`; `motivo` opcional si viaja) | Vigencia existe (y del cliente) | `version` vigente | Tipo congelable (DEC-023 enmendada por DEC-042: los 3 tipos) | Vigencia no `VENCIDA` | **Pausa vigente** (última fila de pausa + `hoy ≤ congelacionFin`) | Acción |
|---|---|---|---|---|---|---|---|
| true | true | true | true | true | true | true | **200**: `fechaFin − diasDevueltos` + fila `DESCONGELACION` + `version` N→N+1 + `congelacion: null` |
| false (CLIENTE) | * | * | * | * | * | * | 403 `AUTH_FORBIDDEN` |
| sin/expirado token | * | * | * | * | * | * | 401 `AUTH_TOKEN_*` |
| true | false | * | * | * | * | * | 400 `VALIDATION_ERROR` |
| true | true | false | * | * | * | * | 404 `NOT_FOUND` |
| true | true | true | false (desactualizada) | * | * | * | 409 `MEMBRESIA_CONFLICTO` |
| true | true | true | true | false (tipo fuera de `TIPOS_CONGELABLES`; antes `NUTRICION`, **Enmendado 2026-10-20 por DEC-042**) | * | * | 409 `CONGELACION_NO_PERMITIDA` |
| true | true | true | true | true | false (`VENCIDA`) | * | 409 `MEMBRESIA_VENCIDA` |
| true | true | true | true | true | true | false (nunca congelada / descongelada / `hoy > congelacionFin`) | **409 `CONGELACION_INEXISTENTE`** |

### D. Aceptar o rechazar edición de congelación (`PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion`) — ampliación DEC-024, **0 puntos**

Orden de evaluación (spec INC-02, sección "Editar congelacion"): 401/403 → 400 Zod (los 8
de congelar) y después post-Zod `fechaFin ≥ hoy` → 404 → 409: `MEMBRESIA_CONFLICTO` →
`CONGELACION_NO_PERMITIDA` (tipo) → `MEMBRESIA_VENCIDA` → **`CONGELACION_INEXISTENTE`** →
`CONGELACION_NO_PERMITIDA` (rango ⊆ fila **revertida**) → `MEMBRESIA_SOLAPADA` (×2). La
contención y los solapes se evalúan con la fila revertida `fechaFin − N_anterior`.

| Rol | Body Zod válido (4 campos) | `fechaFin ≥ hoy` (post-Zod) | Vigencia existe | `version` vigente | Tipo congelable (DEC-042) | Vigencia no `VENCIDA` | Pausa vigente | Rango nuevo ⊆ fila revertida | Sin solape con otra pausa | Nueva `fechaFin` sin choque con periodo posterior | Acción |
|---|---|---|---|---|---|---|---|---|---|---|---|
| true | true | true | true | true | true | true | true | true | true | true | **200**: `fechaFin − N_anterior + N_nuevo` + fila `EDICION_CONGELACION` + `version` N→N+1 (`N' = N` → también 200, `fechaFin` sin cambio) |
| false (CLIENTE) | * | * | * | * | * | * | * | * | * | * | 403 `AUTH_FORBIDDEN` |
| sin/expirado token | * | * | * | * | * | * | * | * | * | * | 401 `AUTH_TOKEN_*` |
| true | false | * | * | * | * | * | * | * | * | * | 400 `VALIDATION_ERROR` |
| true | true | false (nuevo `fechaFin < hoy`) | * | * | * | * | * | * | * | * | 400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy" |
| true | true | true | false | * | * | * | * | * | * | * | 404 `NOT_FOUND` |
| true | true | true | true | false | * | * | * | * | * | * | 409 `MEMBRESIA_CONFLICTO` |
| true | true | true | true | true | false (tipo fuera de `TIPOS_CONGELABLES`; antes `NUTRICION`, **Enmendado 2026-10-20 por DEC-042**) | * | * | * | * | * | 409 `CONGELACION_NO_PERMITIDA` |
| true | true | true | true | true | true | false (`VENCIDA`) | * | * | * | * | 409 `MEMBRESIA_VENCIDA` |
| true | true | true | true | true | true | true | false (nunca / descongelada / terminada) | * | * | * | **409 `CONGELACION_INEXISTENTE`** |
| true | true | true | true | true | true | true | true | false | * | * | 409 `CONGELACION_NO_PERMITIDA` (rango no contenido en la fila revertida) |
| true | true | true | true | true | true | true | true | true | false | * | 409 `MEMBRESIA_SOLAPADA` |
| true | true | true | true | true | true | true | true | true | true | false | 409 `MEMBRESIA_SOLAPADA` (sin cambios: atómico) |

## Transiciones de Estado

### Vigencia

| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| ACTIVA | `POST congelar` con rango que cubre hoy | CONGELADO | Sí |
| ACTIVA | `POST congelar` con `fechaFin` de la congelación anterior a hoy | — | **No** → 400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy" (regla post-Zod; DEC-022b: no se congela solo tiempo ya consumido; ajuste #7) |
| PROGRAMADA | `POST congelar` con rango futuro; al llegar `cInicio` | CONGELADO | Sí |
| CONGELADO | `hoy > cFin` (termina el rango) | ACTIVA (con `fechaFin` ya extendida) | Sí |
| CONGELADO | `hoy` supera la `fechaFin` extendida | VENCIDA | Sí (HU-16) |
| VENCIDA | `POST congelar` (cualquier rango) | — | **No** → 409 `MEMBRESIA_VENCIDA` (DEC-022, confirmada por Producto) |
| VENCIDA | Edición/renovación que lleva `fechaFin ≥ hoy` | ACTIVA / nuevo periodo | Sí (HU-12 / DEC-007, fuera de HU-15) |

> **Ampliación DEC-024**: sí existen los eventos `POST descongelar` y `PATCH congelacion`
> (ver la tabla de la pausa abajo); la pausa **también** puede terminar por calendario
> (`hoy > cFin`) sin operación. **DEC-025**: en cualquier estado de pausa el cliente
> **conserva el acceso** (ninguna transición bloquea).
> Nota: la precedencia `CONGELADO > VENCIDA` (tabla B) ya **no es alcanzable vía API** con
> DEC-022 (no se congela una vigencia vencida → 409 `MEMBRESIA_VENCIDA`); se verifica como
> **prueba de `calcularEstado`** con la **fixture F7** (fila `CONGELACION` creada directa en BD,
> DEC-012/DEC-013) para proteger el cálculo del estado ante datos heredados (ajuste #9).

### Pausa (sub-recurso de congelación de la vigencia — ampliación DEC-024, **0 puntos**)

| Estado de la pausa | Evento | Estado siguiente | Válido |
|---|---|---|---|
| Sin pausa | `POST congelar` (200) | Pausa vigente (`CONGELACION`, `fechaFin` extendida N) | Sí (`HU15-C04`) |
| Vigente, futura (`hoy < inicio`) | `POST descongelar` (200) | Sin pausa; `fechaFin − N` (devuelve la extensión completa) | Sí (`HU15-C07`, caso límite 1) |
| Vigente, en curso (`inicio ≤ hoy ≤ fin`) | `POST descongelar` (200) | Sin pausa; `fechaFin − diasDevueltos` (los consumidos permanecen) | Sí (`HU15-C07`, caso límite 2) |
| Vigente (futura o en curso) | `PATCH congelacion` (200) | Sigue vigente con el rango nuevo (`N_anterior` revertido, `N_nuevo` aplicado) | Sí (`HU15-C08`, casos límite 5-7) |
| Terminada (`hoy > congelacionFin`) | `POST descongelar` / `PATCH congelacion` | — | **No** → 409 `CONGELACION_INEXISTENTE` (caso límite 3) |
| Sin pausa (nunca congelada o ya descongelada) | `POST descongelar` / `PATCH congelacion` | — | **No** → 409 `CONGELACION_INEXISTENTE` |
| Cualquiera | `hoy > congelacionFin` sin operación (por calendario) | Terminada (la vigencia vuelve al cálculo normal) | Sí |
| Vigente | cualquier operación de pausa con `version` desactualizada | — | **No** → 409 `MEMBRESIA_CONFLICTO` (se evalúa primero) |

## Cobertura de Ramas

### Rutas de la ampliación DEC-024 (sin prefijo `/api`, ajuste #1)

| Ruta | Tabla de cobertura | Criterio |
|---|---|---|
| `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar` | **D1..D20** (dentro de `HU15-C07`) | `HU15-C07` (0 puntos) |
| `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion` | **E1..E20** (dentro de `HU15-C08`) | `HU15-C08` (0 puntos) |

> Las dos tablas viven dentro de sus criterios para que cada 409/400 sea trazable a su
> condición pre, fórmula y fixture (F8..F11); ningún escenario de ellas está ejecutado todavía
> (RED pendiente). Expectativa **DEC-025** (0 puntos): cobertura de "no bloqueo" en
> `HU15-C03` + escenario `@DEC-025` del borrador Gherkin.

### Ruta: `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` (sin prefijo `/api`, ajuste #1)

| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | fechas, motivo y `version` válidos, rol DUENO (fixture F1) | 200 `CONGELADO`, `fechaFin` extendida N días, `version` N→N+1 |
| 2 | Rol RECEPCIONISTA | idem con rol RECEPCIONISTA | 200 (DEC-017) |
| 3 | `fechaInicio` faltante | body sin `fechaInicio` | 400 "Fecha de inicio es requerida" |
| 4 | `fechaFin` faltante | body sin `fechaFin` | 400 "Fecha fin es requerida" |
| 5 | `motivo` faltante/vacío | `motivo: ""` / `"   "` / ausente | 400 "Motivo es requerido" |
| 6 | `motivo` > 500 | 501 caracteres | 400 "Motivo no puede exceder 500 caracteres" |
| 7 | Fecha mal formada | `"2026-2-1"`, `"01/02/2026"` | 400 "…fecha válida (YYYY-MM-DD)" |
| 8 | Fecha inexistente | `"2026-02-30"` | 400 (validación calendario) |
| 9 | `fechaFin` < `fechaInicio` | inicio `2026-02-10`, fin `2026-02-01` | 400 "Fecha fin no puede ser anterior a fecha de inicio" |
| 9b | `version` ausente / no entera / no positiva | sin campo, `1.5`, `0` | 400 "Versión es requerida" / "Versión debe ser un entero" / "Versión debe ser positiva" (ajuste #2) |
| 10 | Vigencia inexistente | id aleatorio | 404 `NOT_FOUND` |
| 11 | Vigencia de otro cliente | id de otro cliente | 404 `NOT_FOUND` (sin filtrar) |
| 12 | Guarda genérica por tipo (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**; antes "Servicio fuera de alcance" con `NUTRICION` → 409, **guard exigido y probado en INC-02**) | vigencia con tipo **fuera de `TIPOS_CONGELABLES`** creada directa en BD (p. ej. `OTRO`); pre-DEC-042 el input era `NUTRICION` (fixture F3) | 409 `CONGELACION_NO_PERMITIDA` — con DEC-042 F3 ya **no** produce este 409 (`NUTRICION` → 200, ver fila 31) |
| 13 | Vigencia VENCIDA | `hoy > fechaFin` de la vigencia (fixture F4) | 409 `MEMBRESIA_VENCIDA` (DEC-022) |
| 14 | Rango fuera de la vigencia | `2026-07-01..2026-07-05` sobre vigencia a `03-31` | 409 `CONGELACION_NO_PERMITIDA` |
| 15 | `fechaFin` de la congelación anterior a hoy | `hoy = 2026-02-05`, rango `2026-01-05..2026-01-10` sobre vigencia `01-01..03-31` | **400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"** (regla post-Zod, ajuste #7) |
| 16 | Inicio retroactivo con rango abierto | `hoy = 2026-02-05`, rango `2026-01-15..2026-02-10` | 200, N = 27 → `fechaFin = 2026-04-27` (DEC-022b) |
| 17 | Congelación de 1 día | `cInicio == cFin` | 200, N = 1 |
| 18 | Rango cruzando año | vigencia `2026-01-01..2027-01-31`, rango `2026-12-25..2027-01-03` | 200, N = 10 (rango contenido, DEC-022) |
| 19 | Rango solapado con otra congelación | rangos que se cruzan (fixture F6) | 409 `MEMBRESIA_SOLAPADA` |
| 20 | Gap entre congelaciones | rangos separados por 1 día (fixture F6) | 200 (DEC-008: gaps permitidos) |
| 21 | Doble congelación consecutiva | 2 disjuntas | `fechaFin` extendida N1 + N2 (sin duplicar) |
| 22 | Extensión choca con periodo posterior | periodo siguiente que empieza el mismo día de la `fechaFin` extendida (`2026-04-10`), fixture F5 | 409 `MEMBRESIA_SOLAPADA`, sin cambios (atómico) |
| 23 | Concurrencia | dos congelaciones simultáneas con la misma `version` | exactamente una 200; la otra 409 `MEMBRESIA_CONFLICTO` (`updateMany where version = N` gana una sola vez) |
| 24 | Rol CLIENTE | token de cliente | 403 `AUTH_FORBIDDEN` |
| 25 | Sin token | petición anónima | 401 `AUTH_TOKEN_MISSING` |
| 26 | Auditoría | tras #1 | registro actor/acción/rango/motivo/`fechaFinAnterior`→`fechaFinNueva` |
| 27 | Estado durante el rango | `hoy ∈ [cInicio, cFin]` | API y ficha: `CONGELADO` + badge |
| 28 | Precedencia sobre VENCIDA | **prueba unitaria de `calcularEstado`** con fixture F7 (vigencia `VENCIDA` + fila `CONGELACION` creada directa en BD que cubre hoy; **no es un caso de endpoint**) | `CONGELADO` |
| 29 | Después del rango | `hoy > cFin` | `ACTIVA` con `fechaFin` extendida |
| 30 | Tipos congelables | `GYM` (fixture F1), `PERSONALIZADO` (fixture F2, alta directa en BD), `NUTRICION` (fixture F3) — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: los 3 tipos | 200 en cada tipo (DEC-023 **enmendada por DEC-042**) |
| 31 | Nutrición congelable (**Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**; antes "Nutrición rechazada") | `NUTRICION` (fixture F3) | **200** `CONGELADO` con `fechaFin` extendida; el 409 `CONGELACION_NO_PERMITIDA` queda solo en la guarda genérica de la fila 12 (pre-DEC-042: 409, **escenario ejecutable en INC-02**, DEC-023, ajuste #6) |
| 32 | `version` desactualizada | body con `version` ≠ versión actual (tras otra congelación o un `PATCH`) | 409 `MEMBRESIA_CONFLICTO` (primer 409 del orden del contrato) |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Regla | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| clienteId (path) | string | sí | - | 1-36 | id existente |
| vigenciaId (path) | string | sí | - | 1-36 | id existente y del cliente |
| fechaInicio | string | sí | `/^\d{4}-\d{2}-\d{2}$/` + calendario real | 10 | rango dentro de la vigencia; inicio retroactivo permitido si `fechaFin ≥ hoy` (DEC-022) |
| fechaFin | string | sí | `/^\d{4}-\d{2}-\d{2}$/` + calendario real; `≥ fechaInicio` (400, schema); **`≥ hoy` (400, regla post-Zod en `America/Bogota`, DEC-022 — fuera del schema porque `hoy` es dinámica)** | 10 | rango dentro de la vigencia (si no → 409 `CONGELACION_NO_PERMITIDA`) |
| motivo | string | sí | no vacío tras `.trim()` | 1-500 | texto libre |
| version | number | sí | entero (`.int()`) positivo (`.positive()`) | - | = `version` actual de la vigencia (lock optimista INC00-MEM-03); si difiere → 409 `MEMBRESIA_CONFLICTO` |
| estado (respuesta) | enum | - | - | - | `PROGRAMADA`, `ACTIVA`, `VENCIDA`, `CONGELADO` |
| tipoServicio (respuesta) | enum | - | - | - | `GYM`, `PERSONALIZADO`, `NUTRICION` (congelación permitida para los **3 tipos** — **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: antes "solo para `GYM`/`PERSONALIZADO`, DEC-023"; `TIPOS_CONGELABLES` = los 3) |
| diasCongelados (respuesta) | int | - | - | ≥ 1 | `(cFin − cInicio) + 1` |
| cambios (respuesta) | array | sí | fila `CREACION`/`EDICION`/`CONGELACION` del historial | ≥ 1 | la fila `CONGELACION` recién escrita incluye `motivo`, `congelacionInicio`, `congelacionFin` (ajuste #8) |
| **motivo (body de `descongelar`)** | string | **no** (opcional) | si **viaja**: no vacío tras `.trim()` (misma rama Zod que congelar) | ausente → OK; si viaja, 1-500 | `""`/solo espacios → 400 "Motivo es requerido"; >500 → 400; **ausente → 200** con `motivo: null` en la fila (DEC-024) |
| **fechaInicio/fechaFin/motivo/version (body de `editar`)** | idénticos a congelar | **los 4 requeridos** | mismas reglas que la fila `fechaInicio`/`fechaFin`/`motivo`/`version` de arriba (reutiliza `createCongelacionSchema`) | 10 / 1-500 / - | mismo que congelar + **post-Zod `fechaFin ≥ hoy`**; el nuevo `fechaFin` de la vigencia lo calcula el servidor (`fechaFin − N_anterior + N_nuevo`) |
| **diasDevueltos (respuesta de `descongelar`)** | int | - | - | **≥ 1 en un 200** (0 → 409 `CONGELACION_INEXISTENTE`) | `max(0, finRango − max(hoy, inicioRango) + 1)` (DEC-024) |
| **diasCongeladosAnterior (respuesta de `editar`)** | int | - | - | ≥ 1 | `N_anterior` = días inclusivos del rango de la pausa previa |
| **congelacion (respuesta)** | objeto \| null | - | - | - | bloque de la pausa vigente; **`null` tras `descongelar`**; rango editado tras `editar` |
| cambios (respuesta de `descongelar`/`editar`) | array | sí | acciones nuevas `DESCONGELACION` / `EDICION_CONGELACION` (modelo fijado en INC-02) | ≥ 1 | `DESCONGELACION` lleva el rango revertido y `motivo?`; `EDICION_CONGELACION` lleva el rango nuevo y `motivo` |

## Escenarios Gherkin (borrador semántico para `test-engineer`)

> **Borrador semántico (ajuste #10)**: `test-engineer` los traslada a `features/*.feature` +
> `features/steps/*` en el RED. Este agente no crea ni modifica `.feature` (rompería el runner
> actual de 63/63).
>
> **Fecheo**: las fechas escritas (`2026-01-01`, `2026-02-05`, …) son **ilustrativas**; con
> fecha de ejecución real caerían en `VENCIDA` y romperían los escenarios. En el RED se
> **traducen a fechas dinámicas relativas a `getTodayBogota()`** (`America/Bogota`, DEC-013),
> igual que los fixtures F1..F7 de la sección "Fixtures" del spec INC-02.

```gherkin
Feature: Congelacion de vigencias (HU-15)
  Como dueno o recepcionista
  Quiero congelar una vigencia con fecha inicial y final
  Para pausar temporalmente el servicio del cliente

  # Fechas ilustrativas: traducir a dinamicas relativas a hoy (America/Bogota) en el RED.
  Background:
    Given soy un usuario autenticado como "DUENO"
    And hoy es "2026-02-05"
    And existe un cliente "CLIENTE-1" con vigencia "GYM" del "2026-01-01" al "2026-03-31" en estado "ACTIVA"
    And envio la version actual de la vigencia en el body de congelacion

  # HU15-C01 / C02 / C04 — happy path (fixture F1)
  Scenario: Congelar una vigencia con fechas, motivo y version validos
    When congelo la vigencia del cliente "CLIENTE-1" desde "2026-02-01" hasta "2026-02-10" con motivo "Viaje de trabajo"
    Then la respuesta tiene estado 200
    And la vigencia tiene estado "CONGELADO"
    And la fecha fin es "2026-04-10" con 10 dias congelados
    And la version se incrementa en 1

  # HU15-C05 — permisos (DEC-017)
  Scenario: El recepcionista tambien puede congelar
    Given soy un usuario autenticado como "RECEPCIONISTA"
    When congelo la vigencia del cliente "CLIENTE-1" desde "2026-02-01" hasta "2026-02-10" con motivo "Lesion"
    Then la respuesta tiene estado 200

  Scenario: Un cliente no puede congelar
    Given soy un usuario autenticado como "CLIENTE"
    When congelo la vigencia del cliente "CLIENTE-1" desde "2026-02-01" hasta "2026-02-10" con motivo "Pausa"
    Then la respuesta tiene estado 403 con codigo "AUTH_FORBIDDEN"

  Scenario: Sin token no se puede congelar
    Given no estoy autenticado
    When congelo la vigencia del cliente "CLIENTE-1" desde "2026-02-01" hasta "2026-02-10" con motivo "Pausa"
    Then la respuesta tiene estado 401 con codigo "AUTH_TOKEN_MISSING"

  # HU15-C02 — validacion por campo (400; las reglas de rango de DEC-022 que dependen del
  # recurso son 409 y van aparte)
  Scenario Outline: Rechazar congelacion con datos invalidos
    When congelo la vigencia con fecha inicio "<fechaInicio>", fecha fin "<fechaFin>" y motivo "<motivo>"
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "<mensaje>"
    And la vigencia conserva su fecha fin original

    Examples:
      | fechaInicio | fechaFin | motivo | mensaje |
      | "" | 2026-02-10 | Viaje | Fecha de inicio es requerida |
      | 2026-02-01 | "" | Viaje | Fecha fin es requerida |
      | 2026-02-01 | 2026-02-10 | "" | Motivo es requerido |
      | 2026-02-01 | 2026-02-10 | "   " | Motivo es requerido |
      | 01/02/2026 | 2026-02-10 | Viaje | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | 2026-02-30 | 2026-02-10 | Viaje | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | 2026-02-10 | 2026-02-01 | Viaje | Fecha fin no puede ser anterior a fecha de inicio |
      | 2026-01-05 | 2026-01-10 | Viaje | Fecha fin no puede ser anterior a hoy |
      | 2026-02-01 | 2026-02-10 | aaaa…(501) | Motivo no puede exceder 500 caracteres |

  # HU15-C02 — version requerida (lock optimista, ajuste #2)
  # "ausente" significa que el campo no viaja en el body.
  Scenario Outline: Rechazar version invalida en el body
    When congelo la vigencia con fecha inicio "2026-02-01", fecha fin "2026-02-10", motivo "Viaje" y version "<version>"
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "<mensaje>"

    Examples:
      | version | mensaje |
      | ausente | Versión es requerida |
      | 1.5 | Versión debe ser un entero |
      | 0 | Versión debe ser positiva |
      | -1 | Versión debe ser positiva |

  # HU15-C04 — 409 primero del orden del contrato
  Scenario: Una version desactualizada responde MEMBRESIA_CONFLICTO
    Given que la vigencia ya fue modificada por otra operacion y su version es "2"
    When congelo la vigencia desde "2026-02-01" hasta "2026-02-10" con motivo "Viaje" con version "1"
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_CONFLICTO"
    And la primera vigencia conserva su fecha fin original

  # HU15-C04 — valores limite
  Scenario: Congelacion minima de un dia
    When congelo la vigencia desde "2026-02-05" hasta "2026-02-05" con motivo "Cita medica"
    Then la respuesta tiene estado 200
    And la fecha fin es "2026-04-01" con 1 dia congelado

  Scenario: Rango que cruza fin de ano
    Given existe una vigencia "GYM" del "2026-01-01" al "2027-01-31"
    When congelo la vigencia desde "2026-12-25" hasta "2027-01-03" con motivo "Fiestas"
    Then la respuesta tiene estado 200
    And la fecha fin es "2027-02-10" con 10 dias congelados

  Scenario: Dos congelaciones consecutivas suman sus dias sin duplicar
    When congelo la vigencia desde "2026-02-01" hasta "2026-02-10" con motivo "Viaje"
    And congelo la vigencia desde "2026-03-01" hasta "2026-03-05" con motivo "Vacaciones"
    Then la respuesta tiene estado 200
    And la fecha fin es "2026-04-15" con 5 dias congelados en la segunda operacion

  # HU15-C04 — reglas de rango (DEC-022: contenido, no VENCIDA, fin >= hoy, inicio retroactivo)
  Scenario: El rango de congelacion debe quedar contenido en la vigencia
    When congelo la vigencia desde "2026-07-01" hasta "2026-07-05" con motivo "Fueras de rango"
    Then la respuesta tiene estado 409 con codigo "CONGELACION_NO_PERMITIDA"
    And el mensaje es "El rango de congelación debe estar dentro de la vigencia"

  Scenario: No se puede congelar una vigencia vencida
    Given existe una vigencia "GYM" del "2025-01-01" al "2025-03-31" en estado "VENCIDA" con fixture "F4"
    When congelo la vigencia desde "2025-03-01" hasta "2025-03-10" con motivo "Pausa"
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_VENCIDA"
    And el mensaje es "No se puede congelar una membresía vencida"

  Scenario: La fecha fin de la congelacion no puede ser anterior a hoy
    When congelo la vigencia desde "2026-01-05" hasta "2026-01-10" con motivo "Pausa ya vivida"
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "Fecha fin no puede ser anterior a hoy"

  Scenario: El inicio puede ser retroactivo si el rango sigue abierto
    When congelo la vigencia desde "2026-01-15" hasta "2026-02-10" con motivo "Lesion"
    Then la respuesta tiene estado 200
    And la fecha fin es "2026-04-27" con 27 dias congelados

  # HU15-C01/C03 — tipos de servicio (alcance enmendado DEC-023 y luego DEC-042; guard de
  # tipo exigido y probado en INC-02 — ajuste #6. Enmendado 2026-10-20 por DEC-042
  # (INC-05 C4): los 3 tipos congelan; la guarda 409 por tipo queda genérica).
  # "ninguno" en codigoError = respuesta 200 sin cuerpo de error.
  Scenario Outline: Congelar segun el tipo de servicio con fixture "<fixture>"
    Given existe una vigencia "<tipo>" del cliente "CLIENTE-1" en estado "ACTIVA" con fixture "<fixture>"
    When congelo la vigencia "<tipo>" desde "2026-02-01" hasta "2026-02-10" con motivo "Pausa"
    Then la respuesta tiene estado <status>
    And el codigo de error es "<codigoError>"
    And la vigencia "<tipo>" tiene estado "<estadoResultante>"

    Examples:
      | tipo | fixture | status | codigoError | estadoResultante |
      | GYM | F1 | 200 | ninguno | CONGELADO |
      | PERSONALIZADO | F2 | 200 | ninguno | CONGELADO |
      | NUTRICION | F3 | 200 | ninguno | CONGELADO |

  @DEC-023 @DEC-042
  Scenario: Nutricion se congela con exito (Enmendado 2026-10-20 por DEC-042 (INC-05 C4); antes: se rechazaba con CONGELACION_NO_PERMITIDA)
    # Guard exigido en INC-02 (spec INC-02, "Riesgo de alcance": el limite debe ser una
    # regla, no un hueco). Enmendado 2026-10-20 por DEC-042 (INC-05 C4): DEC-023 queda
    # enmendada -> TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}. La congelacion
    # exitosa de nutricion, antes "fuera de alcance hasta INC-05 (HU-14) si el Producto
    # reabre DEC-023", ya esta en alcance (INC05-NUT-03). El escenario NO se borra: se
    # enmienda a 200. La guarda 409 por tipo se conserva para tipos fuera del set (ver
    # fila 12 / D15) y su mensaje no cambia.
    Given existe una vigencia "NUTRICION" del cliente "CLIENTE-1" en estado "ACTIVA" con fixture "F3"
    When congelo la vigencia "NUTRICION" desde "2026-02-01" hasta "2026-02-10" con motivo "Pausa"
    Then la respuesta tiene estado 200
    And la vigencia "NUTRICION" tiene estado "CONGELADO"
    And la respuesta incluye el historial "cambios" con una accion "CONGELACION"

  # HU15-C03 — estado durante el rango
  Scenario: El estado es CONGELADO durante el rango congelado
    Given hoy es "2026-02-05" y la vigencia esta congelada del "2026-02-01" al "2026-02-10"
    When consulto las membresias del cliente "CLIENTE-1"
    Then la membresia tiene estado "CONGELADO"
    And la ficha del cliente muestra el badge "Congelado"

  Scenario: CONGELADO prevalece sobre VENCIDA cuando el rango cubre hoy
    # Prueba de calcularEstado con la fixture F7 del spec INC-02, NO del endpoint: la API no
    # permite congelar una vigencia VENCIDA (409 MEMBRESIA_VENCIDA, DEC-022), por lo que la
    # fila CONGELACION se crea directa en BD (DEC-012/DEC-013). Protege el calculo del estado
    # ante datos heredados (ajuste #9).
    Given una vigencia fixture en estado "VENCIDA" con una congelacion que cubre hoy creada directa en BD
    When calculo el estado de la vigencia con "calcularEstado"
    Then el estado calculado es "CONGELADO"

  Scenario: Al salir del rango la vigencia vuelve a ACTIVA con la fecha fin extendida
    Given hoy es "2026-02-11" y la vigencia esta congelada del "2026-02-01" al "2026-02-10"
    When consulto las membresias del cliente "CLIENTE-1"
    Then la membresia tiene estado "ACTIVA"
    And la fecha fin es "2026-04-10"

  # HU15-C04 — errores de negocio (409)
  Scenario: Congelaciones solapadas se rechazan
    Given la vigencia esta congelada del "2026-02-01" al "2026-02-10" con fixture "F6"
    When congelo la vigencia desde "2026-02-09" hasta "2026-02-12" con motivo "Otra pausa"
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_SOLAPADA"
    And el mensaje es "Las fechas se solapan con un período existente"

  Scenario: Congelaciones separadas por un dia se aceptan (DEC-008)
    Given la vigencia esta congelada del "2026-02-01" al "2026-02-10" con fixture "F6"
    When congelo la vigencia desde "2026-02-12" hasta "2026-02-15" con motivo "Pausa 2"
    Then la respuesta tiene estado 200

  Scenario: La extension no puede chocar con un periodo posterior (DEC-008)
    Given el cliente tiene otra vigencia "GYM" del "2026-04-10" al "2026-07-10" con fixture "F5"
    When congelo la primera vigencia desde "2026-02-01" hasta "2026-02-10" con motivo "Viaje"
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_SOLAPADA"
    And la primera vigencia conserva su fecha fin original

  Scenario: Vigencia inexistente responde 404
    When congelo la vigencia "uid-inexistente" desde "2026-02-01" hasta "2026-02-10" con motivo "Pausa"
    Then la respuesta tiene estado 404 con codigo "NOT_FOUND"

  # HU15-C06 — auditoria
  Scenario: La congelacion queda auditada
    When congelo la vigencia desde "2026-02-01" hasta "2026-02-10" con motivo "Viaje de trabajo"
    Then la respuesta tiene estado 200
    And la respuesta incluye el historial "cambios" con una accion "CONGELACION"
    And el cambio registra el actor, el motivo, el rango "2026-02-01" a "2026-02-10"
    And el cambio registra fecha fin anterior "2026-03-31" y fecha fin nueva "2026-04-10"
```

## Escenarios Gherkin — ampliación DEC-024 / DEC-025 (borrador con fechas DINÁMICAS)

> **Borrador semántico dentro del markdown (NO es `.feature` todavía)**: `test-engineer` los
> traslada a `features/*.feature` + `features/steps/*` en el RED; este agente no crea ni
> modifica `.feature` ni `steps/`.
>
> **Fecheo dinámico (distinto del bloque anterior)**: todos los escenarios de esta sección
> usan **fechas relativas a `hoy`** (`getTodayBogota()`, `America/Bogota`, DEC-013): la
> notación `"hoy - 2"`, `"hoy + 7"`, … significa *hoy menos/plus N días calendario* y el step
> definition las calcula al ejecutar (DEC-013). Ningún valor de calendario fijo. **Ningún
> escenario está ejecutado todavía** (RED pendiente). Cúbrense las tablas **D1..D20**
> (`HU15-C07`), **E1..E20** (`HU15-C08`) y la expectativa **DEC-025** de `HU15-C03`.

```gherkin
Feature: Descongelar y editar la congelacion de una vigencia (HU-15, ampliacion DEC-024)
  Como dueno o recepcionista
  Quiero descongelar una vigencia o editar el rango de su pausa
  Para terminar o ajustar la pausa descontando o reescribiendo solo los dias de la pausa

  # Fechas DINAMICAS: "hoy - 2" = getTodayBogota() - 2 dias calendario (America/Bogota).
  # "version actual" = version de la vigencia tras la ultima operacion (lock INC00-MEM-03).
  Background:
    Given soy un usuario autenticado como "DUENO"
    And hoy es la fecha de "getTodayBogota()" en "America/Bogota"
    And existe un cliente "CLIENTE-1" con vigencia "GYM" de "hoy - 30" a "hoy + 30" en estado "ACTIVA"

  # ------------------------- HU15-C07: descongelar -------------------------

  # D1 / D20 — happy path pausa en curso (fixture F8): N = 10, diasDevueltos = 8
  Scenario: Descongelar una pausa en curso devuelve solo los dias restantes
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con motivo "Viaje" con fixture "F8"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 200
    And "diasDevueltos" es 8
    And la fecha fin es "hoy + 32" con fecha fin anterior "hoy + 40"
    And la version se incrementa en 1
    And el estado de la vigencia es "ACTIVA"
    And "congelacion" es null
    And la respuesta incluye el historial "cambios" con una accion "DESCONGELACION"
    And el cambio registra el rango "hoy - 2" a "hoy + 7" y fecha fin anterior "hoy + 40" y fecha fin nueva "hoy + 32"

  Scenario: El recepcionista tambien puede descongelar
    Given soy un usuario autenticado como "RECEPCIONISTA"
    And la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 200

  # D3 / caso limite 1 — pausa futura devuelve N completo (fixture F9)
  Scenario: Descongelar una pausa futura devuelve todos los dias
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy + 5" a "hoy + 14" con motivo "Viaje" con fixture "F9"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 200
    And "diasDevueltos" es 10
    And la fecha fin es "hoy + 30"
    And la version se incrementa en 1

  # D4 / caso limite 3 — pausa terminada por calendario (fixture F11)
  Scenario: Descongelar una pausa ya terminada responde CONGELACION_INEXISTENTE
    Given existe una vigencia del cliente "CLIENTE-1" con una congelacion de "hoy - 20" a "hoy - 10" ya aplicada creada directa en BD con fixture "F11"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 409 con codigo "CONGELACION_INEXISTENTE"
    And el mensaje es "No hay una congelación vigente en esta membresía"
    And la vigencia conserva su fecha fin

  # D5 / caso limite 4 — doble descongelar (fixture F10)
  Scenario: Descongelar dos veces responde CONGELACION_INEXISTENTE
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    And descongele la vigencia una primera vez con exito
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 409 con codigo "CONGELACION_INEXISTENTE"
    And el mensaje es "No hay una congelación vigente en esta membresía"

  # D6 — doble descongelar sin recargar la version
  Scenario: Descongelar dos veces sin recargar la version responde MEMBRESIA_CONFLICTO
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    And descongele la vigencia una primera vez con exito
    When descongelo la vigencia con la version anterior a la descongelacion
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_CONFLICTO"

  # D7 — nunca congelada (fixture F1 sin congelar)
  Scenario: Descongelar una vigencia nunca congelada responde CONGELACION_INEXISTENTE
    Given la vigencia del cliente "CLIENTE-1" no tiene congelaciones con fixture "F1"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 409 con codigo "CONGELACION_INEXISTENTE"

  # D8 — version invalida (lock optimista, ajuste #2)
  Scenario Outline: Rechazar version invalida al descongelar
    When descongelo la vigencia con motivo "Retorno anticipado" y version "<version>"
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "<mensaje>"

    Examples:
      | version | mensaje |
      | ausente | Versión es requerida |
      | 1.5 | Versión debe ser un entero |
      | 0 | Versión debe ser positiva |
      | -1 | Versión debe ser positiva |

  # D9 — motivo invalido SOLO cuando viaja (opcional)
  Scenario Outline: Rechazar motivo invalido cuando viaja en descongelar
    When descongelo la vigencia con motivo "<motivo>" y version la actual
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "<mensaje>"

    Examples:
      | motivo | mensaje |
      | "" | Motivo es requerido |
      | "   " | Motivo es requerido |
      | aaaa…(501) | Motivo no puede exceder 500 caracteres |

  # D10 — motivo opcional ausente -> 200 (DEC-024 no lo exige)
  Scenario: Descongelar sin motivo es valido
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When descongelo la vigencia sin enviar motivo con la version actual
    Then la respuesta tiene estado 200
    And el cambio "DESCONGELACION" tiene motivo null

  # D11 — motivo presente se persiste
  Scenario: Descongelar con motivo lo persiste en la auditoria
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When descongelo la vigencia con motivo "Retorno anticipado" y version la actual
    Then la respuesta tiene estado 200
    And la respuesta incluye el historial "cambios" con una accion "DESCONGELACION"
    And el cambio registra el motivo "Retorno anticipado"

  # D12..D14 — ownership y permisos (mismo preHandler que congelar)
  Scenario: Vigencia de otro cliente responde 404 al descongelar
    When descongelo la vigencia "uid-otro-cliente" con la version actual
    Then la respuesta tiene estado 404 con codigo "NOT_FOUND"

  Scenario: Un cliente no puede descongelar
    Given soy un usuario autenticado como "CLIENTE"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 403 con codigo "AUTH_FORBIDDEN"

  Scenario: Sin token no se puede descongelar
    Given no estoy autenticado
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 401 con codigo "AUTH_TOKEN_MISSING"

  # D15..D17 — guards compartidos, en el orden fijado por el contrato
  Scenario Outline: Descongelar con los guards de congelar en el orden fijado
    Given <precondicion>
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado <status> con codigo "<codigoError>"

    Examples:
      | precondicion | status | codigoError |
      | la version del body esta desactualizada y la pausa no esta vigente | 409 | MEMBRESIA_CONFLICTO |
      | existe una vigencia con tipo fuera de "TIPOS_CONGELABLES" creada directa en BD (antes: "NUTRICION" con fixture "F3"; Enmendado 2026-10-20 por DEC-042 (INC-05 C4)) | 409 | CONGELACION_NO_PERMITIDA |
      | existe una vigencia "VENCIDA" con fixture "F4" | 409 | MEMBRESIA_VENCIDA |

  # D18 — concurrencia: exactamente una gana
  Scenario: Dos descongelaciones simultaneas con la misma version
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When envio dos descongelaciones en paralelo con la misma version
    Then exactamente una respuesta tiene estado 200
    And la otra respuesta tiene estado 409 con codigo "MEMBRESIA_CONFLICTO"

  # D19 — nunca responde MEMBRESIA_SOLAPADA (la operacion solo decrementa fecha fin)
  Scenario: Descongelar nunca responde MEMBRESIA_SOLAPADA
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    And el cliente tiene otra vigencia "GYM" que empieza en "hoy + 41" con fixture "F5"
    When descongelo la vigencia con la version actual
    Then la respuesta tiene estado 200

  # ------------------------- HU15-C08: editar congelacion -------------------------

  # E1 — happy path (fixture F8): fechaFin = (hoy+40) - 10 + 20
  Scenario: Editar la congelacion recalcula la fecha fin por diferencia
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con motivo "Viaje" con fixture "F8"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    When edito la congelacion desde "hoy - 2" hasta "hoy + 17" con motivo "Cambio de viaje" y la version actual
    Then la respuesta tiene estado 200
    And la fecha fin es "hoy + 50" con fecha fin anterior "hoy + 40"
    And "diasCongelados" es 20
    And "diasCongeladosAnterior" es 10
    And la version se incrementa en 1
    And el estado de la vigencia es "CONGELADO"
    And la respuesta incluye el historial "cambios" con una accion "EDICION_CONGELACION"
    And la congelacion refleja el rango "hoy - 2" a "hoy + 17" con motivo "Cambio de viaje"

  Scenario: El recepcionista tambien puede editar la congelacion
    Given soy un usuario autenticado como "RECEPCIONISTA"
    And la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When edito la congelacion desde "hoy - 2" hasta "hoy + 17" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado 200

  # E3 / caso limite 5 — editar antes de consumir dias (pausa futura, fixture F9)
  Scenario: Editar una pausa futura revierte el N anterior completo
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy + 5" a "hoy + 14" con motivo "Viaje" con fixture "F9"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    When edito la congelacion desde "hoy + 5" hasta "hoy + 24" con motivo "Viaje mas largo" y la version actual
    Then la respuesta tiene estado 200
    And la fecha fin es "hoy + 50"
    And "diasCongelados" es 20
    And "diasCongeladosAnterior" es 10
    And el estado de la vigencia es "ACTIVA"

  # E4 / caso limite 6 — editar despues de consumir dias: N completo se revierte
  Scenario: Editar despues de consumir dias revierte el N completo y aplica el N nuevo
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con motivo "Viaje" con fixture "F8"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    And hoy esta dentro del rango de la pausa
    When edito la congelacion desde "hoy" hasta "hoy + 1" con motivo "Recorte" y la version actual
    Then la respuesta tiene estado 200
    And la fecha fin es "hoy + 32"
    And "diasCongelados" es 2
    And "diasCongeladosAnterior" es 10

  # E5 / caso limite 7 — rango identico -> 200 con version incrementada
  Scenario: Editar al mismo rango responde 200 y escribe auditoria
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con motivo "Viaje" con fixture "F8"
    And la extension aplicada es de 10 dias: la fecha fin es "hoy + 40" y la version es "2"
    When edito la congelacion desde "hoy - 2" hasta "hoy + 7" con motivo "Sin cambios" y la version actual
    Then la respuesta tiene estado 200
    And la fecha fin sigue siendo "hoy + 40"
    And "diasCongelados" es 10
    And "diasCongeladosAnterior" es 10
    And la version se incrementa en 1
    And la respuesta incluye el historial "cambios" con una accion "EDICION_CONGELACION"

  # E6..E8 — sin congelacion vigente -> 409 CONGELACION_INEXISTENTE
  Scenario Outline: Editar sin congelacion vigente responde CONGELACION_INEXISTENTE
    Given <precondicion>
    When edito la congelacion desde "hoy - 1" hasta "hoy + 3" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado 409 con codigo "CONGELACION_INEXISTENTE"
    And el mensaje es "No hay una congelación vigente en esta membresía"

    Examples:
      | precondicion |
      | la vigencia del cliente "CLIENTE-1" no tiene congelaciones con fixture "F1" |
      | la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8" y luego descongele |
      | existe una vigencia del cliente "CLIENTE-1" con una congelacion de "hoy - 20" a "hoy - 10" creada directa en BD con fixture "F11" |

  # E9 — validacion por campo: mismos mensajes que congelar (reutiliza createCongelacionSchema)
  Scenario Outline: Rechazar edicion de congelacion con datos invalidos
    When edito la congelacion con fecha inicio "<fechaInicio>", fecha fin "<fechaFin>", motivo "<motivo>" y version "<version>"
    Then la respuesta tiene estado 400 con codigo "VALIDATION_ERROR"
    And el mensaje es "<mensaje>"
    And la vigencia conserva su fecha fin

    Examples:
      | fechaInicio | fechaFin | motivo | version | mensaje |
      | "" | hoy + 7 | Ajuste | 2 | Fecha de inicio es requerida |
      | hoy - 2 | "" | Ajuste | 2 | Fecha fin es requerida |
      | hoy - 2 | hoy + 7 | "" | 2 | Motivo es requerido |
      | hoy - 2 | hoy + 7 | "   " | 2 | Motivo es requerido |
      | hoy - 2 | hoy + 7 | aaaa…(501) | 2 | Motivo no puede exceder 500 caracteres |
      | 01/02/2026 | hoy + 7 | Ajuste | 2 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | hoy - 2 | hoy + 1 | Ajuste | ausente | Versión es requerida |
      | hoy + 7 | hoy - 2 | Ajuste | 2 | Fecha fin no puede ser anterior a fecha de inicio |
      | hoy - 5 | hoy - 2 | Ajuste | 2 | Fecha fin no puede ser anterior a hoy |

  # E11..E13 — ownership, permisos y version
  Scenario: Vigencia de otro cliente responde 404 al editar
    When edito la congelacion de la vigencia "uid-otro-cliente" desde "hoy - 1" hasta "hoy + 3" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado 404 con codigo "NOT_FOUND"

  Scenario: Un cliente no puede editar la congelacion
    Given soy un usuario autenticado como "CLIENTE"
    When edito la congelacion desde "hoy - 1" hasta "hoy + 3" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado 403 con codigo "AUTH_FORBIDDEN"

  Scenario: Sin token no se puede editar la congelacion
    Given no estoy autenticado
    When edito la congelacion desde "hoy - 1" hasta "hoy + 3" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado 401 con codigo "AUTH_TOKEN_MISSING"

  Scenario: Una version desactualizada responde MEMBRESIA_CONFLICTO al editar
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    And su version cambio a "3" por otra operacion
    When edito la congelacion desde "hoy - 2" hasta "hoy + 17" con motivo "Ajuste" y version "2"
    Then la respuesta tiene estado 409 con codigo "MEMBRESIA_CONFLICTO"

  # E14..E18 — reglas de negocio sobre la fila revertida, en el orden fijado
  Scenario Outline: Rechazar edicion con los guards del contrato en el orden fijado
    Given <precondicion>
    When edito la congelacion desde "<inicio>" hasta "<fin>" con motivo "Ajuste" y la version actual
    Then la respuesta tiene estado <status> con codigo "<codigoError>"
    And el mensaje es "<mensaje>"

    Examples:
      | precondicion | inicio | fin | status | codigoError | mensaje |
      | existe una vigencia con tipo fuera de "TIPOS_CONGELABLES" creada directa en BD (antes: "NUTRICION" con fixture "F3"; Enmendado 2026-10-20 por DEC-042 (INC-05 C4)) | hoy - 1 | hoy + 3 | 409 | CONGELACION_NO_PERMITIDA | La congelación no está permitida para este tipo de servicio |
      | existe una vigencia "VENCIDA" con fixture "F4" | hoy - 1 | hoy + 3 | 409 | MEMBRESIA_VENCIDA | No se puede congelar una membresía vencida |
      | la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8" | hoy - 2 | hoy + 40 | 409 | CONGELACION_NO_PERMITIDA | El rango de congelación debe estar dentro de la vigencia |
      | la vigencia del cliente "CLIENTE-1" tiene dos congelaciones disjuntas con fixture "F6" y edito la ultima a un rango que cruza la primera | hoy - 11 | hoy - 4 | 409 | MEMBRESIA_SOLAPADA | Las fechas se solapan con un período existente |
      | la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" y el cliente tiene un periodo posterior con fixture "F5" | hoy - 2 | hoy + 70 | 409 | MEMBRESIA_SOLAPADA | Las fechas se solapan con un período existente |

  # E19 — concurrencia
  Scenario: Dos ediciones simultaneas con la misma version
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con fixture "F8"
    When envio dos ediciones en paralelo con la misma version
    Then exactamente una respuesta tiene estado 200
    And la otra respuesta tiene estado 409 con codigo "MEMBRESIA_CONFLICTO"

  # E20 — auditoria
  Scenario: La edicion de la congelacion queda auditada
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" con motivo "Viaje" con fixture "F8"
    When edito la congelacion desde "hoy - 2" hasta "hoy + 17" con motivo "Cambio de viaje" y la version actual
    Then la respuesta tiene estado 200
    And la respuesta incluye el historial "cambios" con una accion "EDICION_CONGELACION"
    And el cambio registra el actor, el motivo "Cambio de viaje", el rango "hoy - 2" a "hoy + 17"
    And el cambio registra fecha fin anterior "hoy + 40" y fecha fin nueva "hoy + 50"

  # ------------------------- HU15-C03 / DEC-025: acceso conservado -------------------------

  @DEC-025
  Scenario: Durante la congelacion el cliente conserva el acceso
    # 0 puntos (DEC-025, sin bullet): la congelacion NO bloquea. Bloqueo por vencimiento ->
    # HU-16/INC-03; por INACTIVO -> HU-08/INC-04. Verificable en INC-02: login del cliente
    # + ausencia de cualquier denegacion por estado "CONGELADO".
    Given la vigencia del cliente "CLIENTE-1" esta congelada de "hoy - 2" a "hoy + 7" y cubre hoy con estado "CONGELADO"
    When el cliente "CLIENTE-1" se autentica en el portal con sus credenciales
    Then la respuesta tiene estado 200 con token
    And el acceso al portal y al gimnasio no esta denegado por el estado "CONGELADO"
```

## Reglas de negocio aplicadas (trazabilidad)

| Regla | Dónde aplica en estos criterios |
|---|---|
| DEC-004 (servicios separados: gym, personalizado, nutrición) | `HU15-C01` (modelo por tipo de servicio) |
| DEC-005 (días completos, `America/Bogota`) | `HU15-C03`, `HU15-C04` |
| DEC-006 (inicio y fin inclusivos) | `HU15-C03` (`hoy ∈ [cInicio, cFin]`), `HU15-C04` (N = fin − inicio + 1) |
| DEC-007 (renovar crea periodo nuevo, no sobrescribe) | `HU15-C04` NO cubre renovación; la congelación modifica solo `fechaFin` del periodo vigente |
| DEC-008 (solapes se rechazan; gaps permitidos) | `HU15-C04` (solape de congelaciones y choque con periodo posterior) |
| DEC-016 (fraccionable con spec+impl+prueba+evidencia+revisión) | Tabla de trazabilidad: cada bullet = un criterio cerrable |
| DEC-017 (`DUENO`/`RECEPCIONISTA` gestionan vigencias) | `HU15-C05` |
| DEC-022 (reglas de rango: contenido, no VENCIDA, `fechaFin ≥ hoy`, inicio retroactivo, extensión inclusiva `America/Bogota`) | `HU15-C04` (reglas 3-5), `HU15-C02` (`fechaFin ≥ hoy` → 400), Tabla A, Transiciones, Cobertura #13-#18, escenarios "reglas de rango" |
| DEC-023 (alcance de congelación: GYM + PERSONALIZADO; nutrición rechazada) — **enmendada por DEC-042** | `HU15-C01`, Outline de tipos (fixtures F1/F2/F3), Tabla A, Cobertura #12/#30/#31 (literales actualizados por la enmienda de abajo) |
| **DEC-042** (2026-10-20: congelación también en `NUTRICION`; DEC-023 enmendada, `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`) | **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)** → **`HU15-C01`** (alcance y resultado de F3 → 200), `HU15-C04`/`HU15-C07`/`HU15-C08` (condición pre por tipo), Outline de tipos (fila `NUTRICION` → 200), Tablas A/C/D (columna "Tipo congelable"), Cobertura #12/#30/#31, D15/E14, partición de equivalencia y Gherkin (escenario `@DEC-042`); la guarda `CONGELACION_NO_PERMITIDA` por tipo queda **genérica** y **sin cambio** el 409 por rango no contenido (DEC-022 a) |
| **DEC-024** (descongelar y editar congelación dentro de INC-02, **0 puntos**; días restantes en descongelar, diferencia completa en editar) | **`HU15-C07`, `HU15-C08`**, sección "Regla de días de la ampliación", Tablas C/D, Transiciones (pausa), Cobertura D/E, Gherkin de la ampliación, fixtures F8..F11, código `CONGELACION_INEXISTENTE`; cierra **abierto #7** |
| **DEC-025** (durante la congelación el cliente **conserva el acceso**; sin bloqueo) | **`HU15-C03`** (expectativa verificable, **0 puntos**), nota DEC-025 del contrato y de Transiciones, escenario `@DEC-025`; cierra **abierto #8** |
| INC00-MEM-04 (auditoría en la misma transacción) | `HU15-C06` |
| INC00-MEM-05 (estado con `America/Bogota` e inclusivos) | Base de `HU15-C03` (se extiende con `CONGELADO`) |

## Gaps vs código actual (líneas exactas)

- Grep `CONGELAD` en `club-beasts-api/src/` y `club-beasts-web/src/` = **0 ocurrencias**
  (auditoría 2026-10-06): no existe el estado en ninguna parte.
- `src/services/membresia.service.ts:18-26` — `calcularEstado` solo devuelve
  `PROGRAMADA | ACTIVA | VENCIDA`; no conoce rangos de congelación.
- `src/services/membresia.service.ts:8-16` — `getTodayBogota()` es la fuente de `hoy`
  (reutilizar, no duplicar zona horaria; base de la regla `fechaFin ≥ hoy` de DEC-022).
- `src/routes/membresia.ts:19-43` — `RESPUESTAS_ERROR` tiene `MEMBRESIA_SOLAPADA` y
  `MEMBRESIA_CONFLICTO` pero **no** `MEMBRESIA_VENCIDA` ni `CONGELACION_NO_PERMITIDA`
  (agregarlos con esta nomenclatura); `:80-185` solo expone GET/POST/PATCH.
- **Ampliación DEC-024 (auditoría 2026-10-08)**: `src/routes/membresia.ts` **no registra**
  `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar` ni `PATCH
  /clientes/:clienteId/vigencias/:vigenciaId/congelacion` (ambos **sin prefijo `/api`**,
  preHandler `["DUENO","RECEPCIONISTA"]`); el mapa `RESPUESTAS_ERROR` carece del código nuevo
  **`CONGELACION_INEXISTENTE`** (agregar con el mensaje único `No hay una congelación vigente
  en esta membresía`); `src/schemas/membresia.schema.ts` carece de `descongelarSchema`
  (`{ version, motivo? }`) y de `updateCongelacionSchema` (alias de `createCongelacionSchema`).
- **Ampliación DEC-024 (servicio)**: no existen la determinación de "congelación vigente"
  (última fila de la secuencia de pausa por `version`), la fórmula `diasDevueltos = max(0,
  finRango − max(hoy, inicioRango) + 1)`, el revert `fechaFin − N_anterior` ni las acciones
  `DESCONGELACION`/`EDICION_CONGELACION` en el servicio de membresías (ver gaps de
  `calcularEstado` arriba: tampoco conoce `CONGELADO`).
- `prisma/schema.prisma:60-76` — `MembresiaGym` sin `tipoServicio` ni estado de congelación;
  `:78-92` `MembresiaGymCambio` sin `motivo` ni rango congelado (**extensión fijada en el spec
  INC-02**: agregar `motivo`, `congelacionInicio`, `congelacionFin`; no se crea tabla nueva).
- `src/services/cliente.service.ts:144-149` — la ficha calcula estado con `calcularEstado`
  (no emitirá `CONGELADO` hasta extenderlo).
- `club-beasts-web/src/components/MembershipSection.tsx:46-51` — `estadoConfig` sin entrada
  `CONGELADO` (badge); `:361` condiciona acciones a `estado !== "VENCIDA"`.

## Alcance enmendado (2026-10-08 — DEC-023 + DEC-022)

> **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: esta sección es **historial** del alcance
> pre-DEC-042 (GYM + PERSONALIZADO; nutrición fuera de alcance). DEC-042 enmendó DEC-023 →
> `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`; el estado vigente del alcance está
> en la cabecera de este documento y en `HU15-C01`. **No se borró ningún literal de esta
> sección** (procedencia histórica del alcance original).

- **Fecha**: 2026-10-08. **Decisiones aplicadas**: **DEC-023** (alcance de la congelación) y
  **DEC-022** (reglas de rango), ambas aprobadas y registradas en
  `docs/producto/decisiones.md`. **DEC-017** (permisos) ya estaba aplicado: `HU15-C05` no cambia.
- **`HU15-C01` redefinido**: la congelación aplica a **membresía GYM y servicio PERSONALIZADO**;
  el **servicio de NUTRICION queda fuera de alcance de congelación exitosa**. El bullet b1 de
  HU-15 **no se elimina ni se reescribe**: se cierra con este alcance enmendado. El **guard de
  rechazo 409 `CONGELACION_NO_PERMITIDA` sí se exige y se prueba en INC-02** (ajuste #6 /
  abierta #12 resuelta): el escenario NUTRICION se marca `@DEC-023` y **se ejecuta** (antes
  estaba marcado `@fuera-de-alcance` y no se ejecutaba). Si el Producto reabre la decisión de
  congelar nutrición, eso se resuelve en **INC-05** (HU-14, riesgo heredado registrado en
  DEC-023 y en el spec INC-02, sección "Riesgo de alcance").
- **`HU15-C02..C06` conservan su esencia**; los cambios aplicados sobre ellos son de contrato,
  no de alcance: nomenclatura transversal de códigos (`CONGELACION_SOLAPADA` →
  `MEMBRESIA_SOLAPADA`, rama `VENCIDA` → `MEMBRESIA_VENCIDA`), inclusión de las reglas
  DEC-022 en el ámbito de `HU15-C04`, **`version` en el body de `HU15-C02`** (lock optimista,
  ajuste #2), **`fechaFin < hoy` reasignado de 409 a 400 `VALIDATION_ERROR` en `HU15-C02`**
  (ajuste #7), orden de evaluación fijado (ajuste #5) y `cambios`/`tipoServicio` en la
  respuesta (ajuste #8).
- Correcciones derivadas de la coherencia con DEC-005/DEC-006/DEC-022 (no cambian alcance):
  escenario "Rango que cruza fin de ano" (la vigencia ahora debe contener el rango) y escenario
  "La extension no puede chocar con un periodo posterior" (el periodo posterior empieza
  `2026-04-10`, el día exacto de la `fechaFin` extendida, para que exista solape real).
- `HU-15-schemas.ts`: se alinea con el contrato final de INC-02 — enum de errores sin
  `CONGELACION_SOLAPADA` y con `MEMBRESIA_VENCIDA`, **`version` agregada al body**
  (`createCongelacionSchema`), y respuesta con `cambios`, `tipoServicio`, `creadoPor`,
  `createdAt` y `updatedAt`. El **body** sigue sin validar reglas dinámicas: `fechaFin ≥ hoy`
  (400 post-Zod), contención del rango, vigencia `VENCIDA`, tipo de servicio y coincidencia de
  `version` (409) son reglas de la ruta/servicio porque dependen de `hoy` en `America/Bogota`
  y del estado del recurso.

## Riesgo de alcance del bullet b1 (RESUELTO — DEC-023, 2026-10-08)

> **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: el riesgo heredado a INC-05 indicado
> abajo ("HU-14 b2 pide estado 'congelado' de nutrición") **queda cerrado**: DEC-042 extiende
> la congelación a `NUTRICION` (recomendación (a) de `INC05-PEND-01`) y DEC-023 queda
> enmendada. Los literales de esta sección se conservan como historial pre-DEC-042; la
> congelación *exitosa* de nutrición **ya no está fuera de alcance**.

Resuelto por decisión del Producto (**DEC-023**): la congelación aplica a **GYM y
PERSONALIZADO**; **nutrición queda fuera de alcance**. Consecuencias operativas para INC-02:

- `HU15-C01` cierra b1 con alcance enmendado: el `Scenario Outline` cubre las 3 filas
  `GYM` → 200 (fixture F1), `PERSONALIZADO` → 200 (fixture F2, alta directa en BD) y
  `NUTRICION` → 409 `CONGELACION_NO_PERMITIDA` (fixture F3); el camino PERSONALIZADO se
  verifica con **fixture de BD determinista** (DEC-012/DEC-013), aunque el alta de vigencias de
  personalizado llegue por API en INC-05.
- La implementación debe ser **reutilizable por tipo de servicio** para que INC-05 (HU-13) no
  reescriba la regla.
- `NUTRICION`: escenario con tag `@DEC-023`, **ejecutado en INC-02** (guard exigido): rechazo
  `409 CONGELACION_NO_PERMITIDA` con mensaje `La congelación no está permitida para este tipo
  de servicio`, sin modificar la vigencia (spec INC-02, "Riesgo de alcance"; ajuste #6). Lo que
  sigue fuera de alcance es la congelación *exitosa* de nutrición.
- Riesgo heredado a INC-05: HU-14 b2 pide estado "congelado" de nutrición (DEC-023).
- **Estado**: decisión cerrada; ninguna opción de las dos que planteaba este documento sigue
  pendiente. DEC-023 no altera la esencia de `HU15-C02..C06` (sus únicos cambios vienen del
  contrato final de INC-02: `version`, orden de evaluación, 400 post-Zod y `cambios`).

## Abiertos / decisiones pendientes

Resueltos en la refactorización de alcance (2026-10-08):

| # | Abierto (antes) | Resolución |
|---|---|---|
| 1 | Riesgo de alcance de b1 (3 tipos vs cierre parcial GYM) | **RESUELTO — DEC-023**: GYM + PERSONALIZADO → 200; NUTRICION → 409 guard ejecutado en INC-02; congelación exitosa de nutrición → INC-05. **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: los 3 tipos → 200 y la congelación exitosa de nutrición queda **incluida en INC-05** (`INC05-NUT-03`) |
| 2 | ¿Rango contenido en la vigencia? | **RESUELTO — DEC-022a**: sí; si no → 409 `CONGELACION_NO_PERMITIDA` |
| 3 | ¿No congelar vigencia `VENCIDA`? | **RESUELTO — DEC-022 (confirmada por Producto)**: no → 409 `MEMBRESIA_VENCIDA` |

Resueltos con el contrato final de INC-02 (2026-10-08, ajustes #1..#10 del spec):

| # | Abierto (antes) | Resolución |
|---|---|---|
| 4 | Contrato: path genérico vs subrecurso `membresias-gym`; ¿se envía `version` en el body? | **RESUELTO — contrato fijado en `INC-02/spec.md`**: path `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` **sin prefijo `/api`** (ajuste #1) y **`version` requerida en el body** con mensajes `Versión es requerida` / `… un entero` / `… positiva` (ajuste #2). Cobertura #23/#32 |
| 5 | Modelo de auditoría: tabla nueva `Congelacion` vs extender `MembresiaGymCambio` | **RESUELTO — modelo fijado en el spec**: extender `MembresiaGymCambio` (`motivo`, `congelacionInicio`, `congelacionFin`) + `tipoServicio` en `MembresiaGym`; sin tabla nueva (ver `HU15-C06`) |
| 6 | ¿Rango retroactivo (`cFin < hoy`)? | **RESUELTO — DEC-022b + contrato**: `fechaFin ≥ hoy` obligatorio y se rechaza como **400 `VALIDATION_ERROR` "Fecha fin no puede ser anterior a hoy"** (ajuste #7); `fechaInicio` retroactivo permitido si el rango sigue abierto |
| 9 | Código de error para "`fechaFin` de la congelación anterior a hoy": ¿409 `CONGELACION_NO_PERMITIDA` o 400 `VALIDATION_ERROR`? | **RESUELTO — contrato INC-02**: **400 `VALIDATION_ERROR`** (regla post-Zod, orden de evaluación paso 2). Aplicado en `HU15-C02`, Tabla A, Transiciones, Cobertura #15 y Gherkin |
| 10 | Nomenclatura 403: `FORBIDDEN` (brief) vs `AUTH_FORBIDDEN` (código) | **RESUELTO — contrato INC-02**: **`AUTH_FORBIDDEN`** (`src/plugins/auth.ts:59-62`), "403 FORBIDDEN" es solo el status |
| 11 | Un solo código de solape: ¿`CONGELACION_SOLAPADA` para solape entre congelaciones? | **RESUELTO — contrato INC-02**: **`MEMBRESIA_SOLAPADA`** para ambos casos, con el mensaje único `Las fechas se solapan con un período existente`; no existe `CONGELACION_SOLAPADA` (ajuste #3) |
| 12 | ¿Se exige el guard 409 de `NUTRICION` en INC-02 o solo `@fuera-de-alcance`? | **RESUELTO — spec INC-02 + ajuste #6**: **guard 409 exigido y probado en INC-02** (cobertura #12/#31, outline de tipos con fixture F3, tag `@DEC-023` sin `@fuera-de-alcance`). **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: el guard se cumplió en INC-02 con el alcance de entonces; con DEC-042 la guarda 409 por tipo queda **genérica** (inalcanzable con el enum actual) y la cobertura #12/#31 se reencuadra **sin borrar filas** |

Resueltos con la ampliación **DEC-024 + DEC-025** (2026-10-08; ajustes #6, #7 y #8 de "Ajustes
pendientes de criterios (ampliacion DEC-024)"):

| # | Abierto (antes) | Resolución |
|---|---|---|
| **7** | ¿Descongelar/editar congelación? "Sin bullet en HU-15 → fuera de alcance salvo cambio explícito; no existe `POST .../descongelar` en INC-02" | **RESUELTO — DEC-024 + contrato de `INC-02/spec.md`**: **en alcance de INC-02, 0 puntos** (DEC-016: alcance de producto; se especifica, prueba y revisa igual). Criterios **`HU15-C07`**/**`HU15-C08`** creados; endpoints `POST .../descongelar` y `PATCH .../congelacion` (sin `/api`), bodies `{ version, motivo? }` y `{ fechaInicio, fechaFin, motivo, version }`, fórmula de días, casos límite F8..F11 y código **409 `CONGELACION_INEXISTENTE`** fijados. La frase "fuera de alcance / no existe `POST .../descongelar`" fue **eliminada** de este documento |
| **8** | ¿Bloquear el acceso del cliente **durante** la congelación? "Sin bullet en HU-15 (el bloqueo por vencimiento es HU-16)" | **RESUELTO — DEC-025**: **no hay bloqueo**; el cliente **conserva el acceso** (autenticarse y usar portal/servicio) durante `CONGELADO`; INC-02 **no implementa ningún bloqueo** por congelación (`CONGELADO` no deniega ingreso ni portal). Expectativa verificable en `HU15-C03` (login del cliente + ausencia de denegación por `CONGELADO`) y escenario `@DEC-025`. Bloqueo por vencimiento → HU-16/INC-03; por `INACTIVO` → HU-08/INC-04 |

**Pendientes: ninguno.** Tras DEC-023/DEC-022/DEC-024/DEC-025 no queda ningún abierto de
alcance, reglas, modelo, paths, códigos ni mensajes. **Enmendado 2026-10-20 por DEC-042
(INC-05 C4)**: la enmienda de DEC-023 tampoco abre pendientes en HU-15 — es **regresión sin
puntos nuevos** (`HU15-C01..C08` conservan trazabilidad, fichas de criterio y conteo).

**BLOQUEADO?** No. DEC-023/DEC-022/DEC-024/DEC-025 y el contrato final de INC-02 (incluida la
ampliación con `HU15-C07`/`HU15-C08`) cierran alcance, reglas, modelo, paths, códigos y
mensajes; los abiertos **#7 y #8 están cerrados** (#7 por DEC-024, #8 por DEC-025). Los
criterios `HU15-C01..C08` quedan en estado ABIERTO a la espera del RED/GREEN de
`test-engineer` y `backend-developer`; `HU15-C07`/`HU15-C08` siguen siendo **0 puntos
HU-15**.
