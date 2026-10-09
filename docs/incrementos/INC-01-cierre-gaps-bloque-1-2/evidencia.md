# INC-01 - Evidencia

Este archivo se actualiza al ejecutar verificaciones. No registrar resultados no ejecutados.

Estado del incremento: **ACEPTADO** (2026-10-07). Bateria completa ejecutada sin
regresion y revision de `code-reviewer` sin hallazgos bloqueantes: **5/5 criterios
ACEPTA**. Puntos certificados por el orquestador en `docs/producto/avance.md` y
`docs/producto/mvp.md` (23.5 -> 26.5).

## Comandos de verificacion

| Area | Comando | Fecha | Estado | Resultado |
|---|---|---|---|---|
| web E2E | `npx playwright test` (suite completa) | 2026-10-07 | VERIFICADO (corrida 3) | **25 passed / 0 failed, EXIT=0** (22 base + 3 de `acceso-roles.spec.ts`; specs: `acceso-roles`, `auth`, `clientes`, `membresia`, `portal`, `sesion-vencida`). Corridas 1 y 2: **24 passed / 1 failed** por un fallo flaky preexistente en `clientes.spec.ts:147` (detalle abajo) |
| web unit | `npx vitest run` | 2026-10-07 | VERIFICADO | **118 passed / 0 failed (118), EXIT=0** (base 118; 14 archivos) |
| web build | `npm run build` | 2026-10-07 | VERIFICADO | **PASS, EXIT=0** (Next.js 15.5.25; compila, lint+types OK, 10/10 paginas generadas, middleware incluido) |
| api unit/int | `npx vitest run` | 2026-10-07 | VERIFICADO | **252 passed / 0 failed (252), EXIT=0** (base 252; 17 archivos; `clientes-trazabilidad.test.ts` 7/7) |
| api types | `npx tsc --noEmit` | 2026-10-07 | VERIFICADO | **0 errores, EXIT=0** |
| api gherkin | `npm run test:gherkin` | 2026-10-07 | VERIFICADO | **63 passed / 0 failed (63), EXIT=0** (auth 28 + clientes 35; guard anti-skip sin alertas, no hubo skips) |

### Detalle E2E: multiples corridas y fallo observado (no ocultado)

| Corrida | Comando | Resultado |
|---|---|---|
| 1 | `npx playwright test` | 24 passed / **1 failed**: `clientes.spec.ts:147` "pagina la lista cuando los resultados no caben en una pagina" (`las páginas deben mostrar clientes distintos, se repitieron: 8901305019 ... 9986879442`, 20 repetidas) |
| 2 | `npx playwright test` | 24 passed / **1 failed**: mismo test, mismo sintoma (`se repitieron: 8088727019 ... 9987066756`) |
| diag. A | `npx playwright test tests/e2e/clientes.spec.ts` | 7 passed / **1 failed**: mismo test, otro sintoma: `expect(cedulasPagina2.length).toBeGreaterThan(0)` recibe **0** (tabla vacia en estado `Cargando clientes...`) |
| diag. B | `npx playwright test tests/e2e/clientes.spec.ts:147 --repeat-each=3` | **2 passed / 1 failed** (flaky, no determinista) |
| 3 | `npx playwright test` | **25 passed / 0 failed, EXIT=0** |

Diagnostico (basado en el `error-context.md` de Playwright):

- Fallo **preexistente y flaky**, no causado por INC-01: es `clientes.spec.ts:147`
  (criterio INC00-CLI-05, fuera de los archivos permitidos de este incremento).
- Causa: carrera en el propio test. Tras `click()` en "Siguiente", las aserciones
  web-first sobre la etiqueta `Página 2 de N` y el boton "Anterior" se resuelven con
  el **estado** de React, mientras que `page.locator("tbody td:first-child").allTextContents()`
  **no espera** a que termine el refetch: puede leer las filas viejas de la pagina 1
  (corridas 1-2, "20 repetidas") o la tabla vacia del estado de carga (diag. A).
  El snapshot del fallo muestra `Cargando clientes...` y **sin** banner de error
  => la llamada `GET /clientes?page=2` no falla.
- El lado API esta cubierto y verde: `tests/integration/clientes.test.ts:757`
  "paginacion funciona correctamente" dentro de `npx vitest run` 252/252.
- Los 3 tests de `acceso-roles.spec.ts` pasaron en **las 3 corridas completas**
  (3/3), y el test flaky fallo tambien cuando `acceso-roles.spec.ts` no se ejecuto
  (diag. A y B): la nueva spec no interviene.
- Correccion sugerida al dueno de `clientes.spec.ts` (no aplicable aqui por alcance):
  esperar a que el refetch termine antes de leer la tabla, p. ej.
  `await expect(page.getByText("Cargando clientes...")).toHaveCount(0);`
  antes de `allTextContents()`.
- Riesgo residual: una corrida posterior al 25/25 puede volver a fallar por ese
  test flaky hasta que se corrija. No bloquea los criterios de INC-01.

## Estado de criterios

Todos los criterios quedaron **ACEPTADOS** tras la revision de `code-reviewer`
(2026-10-07): `Bloquea aceptacion: no`, 0 hallazgos bloqueantes, NB-01..NB-05.

| Criterio | Estado | Base |
|---|---|---|
| INC01-ROL-01 | **ACEPTADO** | `club-beasts-web/tests/e2e/acceso-roles.spec.ts` (3 tests: CLIENTE `/clientes` -> `/portal`; CLIENTE `/dashboard` -> `/portal`; RECEPCIONISTA en `/clientes` con modulos "Clientes" y "Dashboard"). Verde en las 3 corridas de `npx playwright test`; corrida final 25/25 EXIT=0. Sin `isVisible()` condicional, sin `waitForTimeout`, sin `skip`/`only`, sin aserciones vacias |
| INC01-TRZ-01 | **ACEPTADO** | `tests/integration/clientes-trazabilidad.test.ts`: POST expone `creadoPorId`/`actualizadoPorId` = id del DUENO en la respuesta y en BD (leido con Prisma); alta via servicio sin actor queda con `creadoPorId = null` (sin id inventado). Verde en `npx vitest run` 252/252 |
| INC01-TRZ-02 | **ACEPTADO** | Mismo archivo: PATCH con token RECEPCIONISTA expone `actualizadoPorId` = id del RECEPCIONISTA, `creadoPorId` = DUENO sin cambios y `updatedAt` > previo, tanto en la respuesta como en BD (2 aserciones por separado: respuesta y persistencia). Verde en `npx vitest run` 252/252 |
| INC01-FIC-01 | **ACEPTADO** | Step C18 renombrado a `Then la ficha muestra datos personales, sede y estado` en `features/clientes.feature:152` y `features/steps/clientes.steps.ts:397` (un unico escenario usa ese step; los otros 3 escenarios de ficha usan steps distintos ya definidos). `npm run test:gherkin` 63/63 EXIT=0 con guard anti-skip en verde |
| INC01-FIC-02 | **ACEPTADO** | Mismo archivo: `GET /clientes/:id` devuelve `membresias` con 3 periodos creados via API (`PROGRAMADA` futura, `ACTIVA` hoy==inicio==fin probando extremos inclusivos America/Bogota, `VENCIDA` pasada), orden `fechaInicio` desc e `id` por elemento; `GET /clientes` (listado) **no** incluye `membresias`. Verde en `npx vitest run` 252/252 |

Nota de alcance (DEC-016): INC01-FIC-02 es base del bullet 4 de HU-07; no cierra
dicho bullet (exige las 3 vigencias).

## Evidencia RED registrada

RED de `club-beasts-api/tests/integration/clientes-trazabilidad.test.ts`
(ejecutado antes del GREEN de `backend-developer`):

| Fecha | Criterio | Comando | Resultado | Archivos |
|---|---|---|---|---|
| 2026-10-07 | INC01-TRZ-01 | `npx vitest run tests/integration/clientes-trazabilidad.test.ts` | **3 failed / 4 passed (7)**; en suite completa `npx vitest run`: 3 failed / 249 passed (252) | `tests/integration/clientes-trazabilidad.test.ts` |
| 2026-10-07 | INC01-TRZ-01 (RED 1/3) | idem | `INC01-TRZ-01 la respuesta de POST /clientes expone creadoPorId y actualizadoPorId del actor autenticado` -> `expected undefined to be 'cmuy90cz...'` (linea 171: `expect(body.creadoPorId).toBe(duenoId)`) | idem |
| 2026-10-07 | INC01-TRZ-02 (RED 2/3) | idem | `INC01-TRZ-02 la respuesta de PATCH /clientes/:id expone actualizadoPorId, creadoPorId sin cambios y updatedAt mayor` -> `expected undefined to be 'cmuy90czg...'` (linea 232: `expect(body.actualizadoPorId).toBe(recepId)`) | idem |
| 2026-10-07 | INC01-FIC-02 (RED 3/3) | idem | `INC01-FIC-02 GET /clientes/:id incluye membresias con periodo y estado calculado, ordenadas por fechaInicio desc` -> `la ficha debe exponer la coleccion membresias (INC01-FIC-02): Target cannot be null or undefined.` (linea 317: `expect(body.membresias).toHaveLength(3)`) | idem |

Notas de la fase RED:

- Solo fallaban las aserciones de **respuesta** (los campos no se exponian aun) y
  las de **`membresias` en la ficha** (la relacion no existia). Las 4 aserciones de
  **persistencia en BD** pasaban desde el inicio: `creadoPorId`/`actualizadoPorId`
  se escribian correctamente (`cliente.service.ts:93`); el gap era de exposicion.
- El primer anteproyecto de RED tuvo 6 fallos por fixtures invalidos
  (`Apellidos solo pueden contener letras y espacios`: "INC-01" no cumple la regex
  de nombres). Se corrigio el **dato de prueba** (apellidos "Prueba"/"Editado"),
  no el producto; la RED final es la de 3 tests.
- **INC01-ROL-01 nace verde** (no RED): es gap de cobertura, no de codigo. El guard
  de rol ya estaba implementado en `club-beasts-web/src/middleware.ts:41-47` y solo
  faltaba la prueba E2E; el spec nuevo la aporta y pasa a la primera.
- GREEN registrado por `backend-developer` el 2026-10-07 (`src/services/cliente.service.ts`);
  verificacion posterior de esta bateria: api 252/252 (los 3 tests en verde).

## Revisiones

| Fecha | Criterios | Revisor | Resultado | Hallazgos |
|---|---|---|---|---|
| 2026-10-07 | INC01-ROL-01, INC01-TRZ-01, INC01-TRZ-02, INC01-FIC-01, INC01-FIC-02 | code-reviewer | **Bloquea aceptacion: no. 5/5 ACEPTA** | **0 bloqueantes**, 5 no bloqueantes: NB-01 (falta caso HTTP anti mass-assignment de `creadoPorId`/`actualizadoPorId`; hoy seguro por Zod-strip), NB-02 (CLIENTE en su propia ficha ve ids de staff: contrato aceptado del spec, sin nombre/email/hash), NB-03 (PATCH paga el join de `membresias` solo para chequeo de existencia), NB-04 (`any` heredados de INC-00), NB-05 (flake preexistente `clientes.spec.ts:147`: **no bloqueante**, riesgo residual con responsable = dueno de `clientes.spec.ts` / backlog INC-00). Reprodujo: api `tsc` 0 + `vitest` **252/252** + Gherkin **63/63** exit 0; web `tsc` 0 + `vitest` **118/118**. E2E validado por lectura del `report.json` (corrida final 25/25, 0 flaky, 0 skipped) por restriccion de ejecucion (revision anterior colgada 4h con servers en 3000/3001). Archivos tocados: ninguno |
